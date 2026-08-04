import { Sandbox } from 'e2b';
import db from '../prisma/client';

const PREVIEW_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const E2B_API_KEY = process.env.E2B_API_KEY;

const PREVIEW_PORT = 3457;

const FALLBACK_PACKAGE_JSON = {
  name: 'swarmdev-preview',
  version: '1.0.0',
  private: true,
  scripts: {
    dev: `next dev -p ${PREVIEW_PORT}`,
    build: 'next build',
    start: `next start -p ${PREVIEW_PORT}`,
  },
  dependencies: {
    next: '^14.0.0',
    react: '^18.0.0',
    'react-dom': '^18.0.0',
    '@radix-ui/react-slot': '^1.0.0',
    'class-variance-authority': '^0.7.0',
    clsx: '^2.1.0',
    'lucide-react': '^0.300.0',
    'tailwind-merge': '^2.0.0',
    zustand: '^4.0.0',
    'next-themes': '^0.2.1',
    'framer-motion': '^11.0.0',
    recharts: '^2.10.0',
    'date-fns': '^3.0.0',
    sonner: '^1.4.0',
    geist: '^1.2.0',
  },
  devDependencies: {
    '@types/node': '^20.0.0',
    '@types/react': '^18.0.0',
    '@types/react-dom': '^18.0.0',
    autoprefixer: '^10.0.0',
    postcss: '^8.0.0',
    tailwindcss: '^3.0.0',
    'tailwindcss-animate': '^1.0.0',
    typescript: '^5.0.0',
  },
};

export interface PreviewStatus {
  status: 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR';
  previewUrl: string | null;
  sandboxId: string | null;
  message?: string;
}

export const previewService = {
  async getStatus(projectId: string, userId: string): Promise<PreviewStatus> {
    const project = await db.project.findFirst({
      where: { id: projectId, userId },
      select: { previewStatus: true, previewUrl: true, sandboxId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // If marked RUNNING, verify sandbox is actually alive AND port is accessible
    if (project.previewStatus === 'RUNNING' && project.sandboxId) {
      try {
        const sandbox = await Sandbox.connect(project.sandboxId, { apiKey: E2B_API_KEY });
        const isRunning = await sandbox.isRunning();
        if (!isRunning) {
          await db.project.update({
            where: { id: projectId },
            data: { previewStatus: 'STOPPED', previewUrl: null, sandboxId: null },
          });
          return { status: 'STOPPED', previewUrl: null, sandboxId: null, message: 'Sandbox timed out' };
        }
        // Also verify the dev server port is actually listening
        try {
          const host = await sandbox.getHost(PREVIEW_PORT);
          if (!host) throw new Error('Port not exposed');
        } catch {
          // Port not accessible — dev server likely crashed
          await db.project.update({
            where: { id: projectId },
            data: { previewStatus: 'STOPPED', previewUrl: null, sandboxId: null },
          });
          return { status: 'STOPPED', previewUrl: null, sandboxId: null, message: 'Dev server stopped. Restart preview.' };
        }
      } catch {
        await db.project.update({
          where: { id: projectId },
          data: { previewStatus: 'STOPPED', previewUrl: null, sandboxId: null },
        });
        return { status: 'STOPPED', previewUrl: null, sandboxId: null, message: 'Sandbox connection lost' };
      }
    }

    return {
      status: (project.previewStatus as PreviewStatus['status']) || 'STOPPED',
      previewUrl: project.previewUrl,
      sandboxId: project.sandboxId,
    };
  },

  async startPreview(projectId: string, userId: string): Promise<PreviewStatus> {
    if (!E2B_API_KEY) {
      throw new Error('E2B_API_KEY not configured');
    }

    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      throw new Error('Project not found');
    }

    // If already running, return existing
    if (project.previewStatus === 'RUNNING' && project.sandboxId) {
      return {
        status: 'RUNNING',
        previewUrl: project.previewUrl,
        sandboxId: project.sandboxId,
      };
    }

    // Mark as STARTING
    await db.project.update({
      where: { id: projectId },
      data: { previewStatus: 'STARTING', previewUrl: null, sandboxId: null },
    });

    try {
      // Fetch project files
      const files = await db.projectFile.findMany({
        where: { projectId },
      });

      // Create sandbox
      const sandbox = await Sandbox.create({
        apiKey: E2B_API_KEY,
        timeoutMs: PREVIEW_TIMEOUT_MS,
      });

      const sandboxId = sandbox.sandboxId;
      const projectPath = '/home/user/project';

      // Write all project files (strip markdown fences from AI output)
      for (const file of files) {
        const filePath = `${projectPath}/${file.path}`;
        const content = stripMarkdownFences(file.content || '');
        await sandbox.files.write(filePath, content);
      }

      // Ensure package.json exists and has Next.js dependencies for preview
      const existingPkg = files.find((f) => f.path === 'package.json');
      if (!existingPkg) {
        await sandbox.files.write(
          `${projectPath}/package.json`,
          JSON.stringify(FALLBACK_PACKAGE_JSON, null, 2)
        );
      } else {
        try {
          const parsed = JSON.parse(existingPkg.content || '{}');
          const hasNext = parsed.dependencies?.next;
          if (!hasNext) {
            // Agent generated a backend-only package.json (e.g. Prisma DB schema).
            // Write a proper Next.js package.json for the preview so npm install
            // brings in the frontend dependencies the generated pages need.
            await sandbox.files.write(
              `${projectPath}/package.json`,
              JSON.stringify(FALLBACK_PACKAGE_JSON, null, 2)
            );
          }
        } catch {
          // Invalid JSON — write fallback
          await sandbox.files.write(
            `${projectPath}/package.json`,
            JSON.stringify(FALLBACK_PACKAGE_JSON, null, 2)
          );
        }
      }

      // Write next.config.js for standalone mode (better for previews)
      await sandbox.files.write(
        `${projectPath}/next.config.js`,
        `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}
module.exports = nextConfig\n`
      );

      // Write postcss.config.mjs for TailwindCSS support
      const hasPostcssConfig = files.some((f) => f.path === 'postcss.config.mjs' || f.path === 'postcss.config.js');
      if (!hasPostcssConfig) {
        await sandbox.files.write(
          `${projectPath}/postcss.config.mjs`,
          `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
`
        );
      }

      // Write tailwind.config.ts if missing so Tailwind content paths resolve
      const hasTailwindConfig = files.some((f) =>
        f.path === 'tailwind.config.ts' || f.path === 'tailwind.config.js'
      );
      if (!hasTailwindConfig) {
        await sandbox.files.write(
          `${projectPath}/tailwind.config.ts`,
          `import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
`
        );
      }

      // Write tsconfig.json with path aliases so @/ imports resolve
      const hasTsConfig = files.some((f) => f.path === 'tsconfig.json');
      if (!hasTsConfig) {
        await sandbox.files.write(
          `${projectPath}/tsconfig.json`,
          JSON.stringify({
            compilerOptions: {
              lib: ['dom', 'dom.iterable', 'esnext'],
              allowJs: true,
              skipLibCheck: true,
              strict: true,
              noEmit: true,
              esModuleInterop: true,
              module: 'esnext',
              moduleResolution: 'bundler',
              resolveJsonModule: true,
              isolatedModules: true,
              jsx: 'preserve',
              incremental: true,
              plugins: [{ name: 'next' }],
              paths: {
                '@/*': ['./src/*']
              }
            },
            include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
            exclude: ['node_modules']
          }, null, 2)
        );
      }

      // Install dependencies
      const installResult = await sandbox.commands.run(
        `cd ${projectPath} && npm install`,
        { timeoutMs: 300_000 } // 5 minutes
      );
      if (installResult.exitCode !== 0) {
        throw new Error(`npm install failed: ${installResult.stderr}`);
      }

      // Start dev server in background
      await sandbox.commands.run(
        `cd ${projectPath} && npx next dev -p ${PREVIEW_PORT} -H 0.0.0.0 > /tmp/next-dev.log 2>&1`,
        { background: true }
      );

      // Give the dev server a moment to initialize
      await sleep(5000);

      // Wait for preview port to be available
      let host: string | null = null;
      for (let i = 0; i < 60; i++) {
        try {
          host = await sandbox.getHost(PREVIEW_PORT);
          if (host) break;
        } catch {
          // port not ready yet
        }
        await sleep(1000);
      }

      // If still no host, check the logs for errors
      if (!host) {
        let logOutput = 'No logs available';
        try {
          const logs = await sandbox.commands.run(
            `cat /tmp/next-dev.log 2>/dev/null || echo "No logs yet"`,
            { timeoutMs: 5_000 }
          );
          logOutput = logs.stdout;
        } catch { /* ignore log read errors */ }
        throw new Error(`Dev server did not start. Logs: ${logOutput}`);
      }

      const previewUrl = `https://${host}`;

      // Save to DB
      await db.project.update({
        where: { id: projectId },
        data: { previewStatus: 'RUNNING', previewUrl, sandboxId },
      });

      return {
        status: 'RUNNING',
        previewUrl,
        sandboxId,
      };
    } catch (error: any) {
      await db.project.update({
        where: { id: projectId },
        data: { previewStatus: 'ERROR', previewUrl: null, sandboxId: null },
      });
      throw new Error(`Preview start failed: ${error.message}`);
    }
  },

  async stopPreview(projectId: string, userId: string): Promise<PreviewStatus> {
    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      throw new Error('Project not found');
    }

    if (project.sandboxId && E2B_API_KEY) {
      try {
        const sandbox = await Sandbox.connect(project.sandboxId, { apiKey: E2B_API_KEY });
        await sandbox.kill();
      } catch {
        // Sandbox may already be dead
      }
    }

    await db.project.update({
      where: { id: projectId },
      data: { previewStatus: 'STOPPED', previewUrl: null, sandboxId: null },
    });

    return { status: 'STOPPED', previewUrl: null, sandboxId: null };
  },
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip markdown code fences from AI-generated files */
function stripMarkdownFences(content: string): string {
  return content
    .replace(/^\s*```[a-zA-Z0-9]*\n?/im, '')
    .replace(/\n?```\s*$/im, '');
}
