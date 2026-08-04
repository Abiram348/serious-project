import db from '../prisma/client';
import { sandboxService } from './sandboxService';

const WORKDIR = '/home/user/project';

async function syncProjectFilesToSandbox(projectId: string): Promise<void> {
  const files = await db.projectFile.findMany({ where: { projectId } });
  const sandbox = await sandboxService.getOrCreateSandbox(projectId);
  await sandboxService.executeCommand(sandbox, `mkdir -p ${WORKDIR}`, projectId);
  for (const file of files) {
    const fullPath = `${WORKDIR}/${file.path.replace(/^\//, '')}`;
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    if (dir.length > WORKDIR.length) {
      await sandboxService.executeCommand(sandbox, `mkdir -p ${dir}`, projectId);
    }
    await sandboxService.writeFile(sandbox, fullPath, file.content ?? '');
  }
}

function parseGitStatus(stdout: string): { branch: string; clean: boolean; files: string[] } {
  const branchMatch = stdout.match(/On branch (\S+)/);
  const branch = branchMatch?.[1] ?? 'main';
  const clean = stdout.includes('nothing to commit') || stdout.includes('working tree clean');
  const files: string[] = [];
  const unstaged = stdout.split('\n').filter((l) => l.startsWith(' M ') || l.startsWith('?? '));
  for (const line of unstaged) {
    files.push(line.trim());
  }
  return { branch, clean, files };
}

export const gitService = {
  async init(projectId: string): Promise<{ initialized: boolean; message: string }> {
    await syncProjectFilesToSandbox(projectId);
    const sandbox = await sandboxService.getOrCreateSandbox(projectId);
    const result = await sandboxService.executeCommand(
      sandbox,
      `cd ${WORKDIR} && git init -b main && git config user.email "swarmdev@local" && git config user.name "SwarmDev"`,
      projectId
    );
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'git init failed');
    }
    return { initialized: true, message: 'Git repository initialized in sandbox' };
  },

  async status(projectId: string): Promise<{
    branch: string;
    clean: boolean;
    ahead: number;
    behind: number;
    files: string[];
  }> {
    await syncProjectFilesToSandbox(projectId);
    const sandbox = await sandboxService.getOrCreateSandbox(projectId);
    const initCheck = await sandboxService.executeCommand(
      sandbox,
      `test -d ${WORKDIR}/.git && echo yes || echo no`,
      projectId
    );
    if (initCheck.stdout.trim() !== 'yes') {
      return { branch: 'main', clean: true, ahead: 0, behind: 0, files: [] };
    }
    const result = await sandboxService.executeCommand(
      sandbox,
      `cd ${WORKDIR} && git status`,
      projectId
    );
    const parsed = parseGitStatus(result.stdout);
    return { ...parsed, ahead: 0, behind: 0 };
  },

  async commit(
    projectId: string,
    message: string,
    filePaths?: string[]
  ): Promise<{ sha: string; message: string }> {
    await syncProjectFilesToSandbox(projectId);
    const sandbox = await sandboxService.getOrCreateSandbox(projectId);
    const addTarget =
      filePaths && filePaths.length > 0
        ? filePaths.map((p) => p.replace(/^\//, '')).join(' ')
        : '.';
    const addResult = await sandboxService.executeCommand(
      sandbox,
      `cd ${WORKDIR} && git add ${addTarget}`,
      projectId
    );
    if (addResult.exitCode !== 0) {
      throw new Error(addResult.stderr || 'git add failed');
    }
    const commitResult = await sandboxService.executeCommand(
      sandbox,
      `cd ${WORKDIR} && git commit -m ${JSON.stringify(message)}`,
      projectId
    );
    if (commitResult.exitCode !== 0) {
      throw new Error(commitResult.stderr || 'git commit failed');
    }
    const shaResult = await sandboxService.executeCommand(
      sandbox,
      `cd ${WORKDIR} && git rev-parse --short HEAD`,
      projectId
    );
    const sha = shaResult.stdout.trim() || 'unknown';
    return { sha, message: `Committed: ${message}` };
  },

  async push(
    projectId: string,
    githubRepo: string,
    githubToken?: string
  ): Promise<{ pushed: boolean; repo: string }> {
    if (!githubToken) {
      throw new Error('GitHub token is required to push');
    }
    const sandbox = await sandboxService.getOrCreateSandbox(projectId);
    const remoteUrl = `https://${githubToken}@github.com/${githubRepo.replace(/^https?:\/\/github.com\//, '')}.git`;
    const result = await sandboxService.executeCommand(
      sandbox,
      `cd ${WORKDIR} && git remote remove origin 2>/dev/null; git remote add origin ${JSON.stringify(remoteUrl)} && git push -u origin main`,
      projectId
    );
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || result.stdout || 'git push failed');
    }
    return { pushed: true, repo: githubRepo };
  },
};
