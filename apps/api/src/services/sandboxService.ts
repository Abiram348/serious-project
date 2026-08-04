/**
 * Sandbox Service - E2B integration for cloud code execution
 *
 * This service manages E2B sandboxes for project execution.
 * Each project gets its own sandbox that persists across agent runs.
 */

import { Sandbox } from '@e2b/code-interpreter';

export interface SandboxInfo {
  sandboxId: string;
  projectId: string;
  createdAt: Date;
  lastUsedAt: Date;
  status: 'running' | 'hibernated' | 'stopped';
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface SandboxService {
  createSandbox(projectId: string): Promise<SandboxInfo>;
  getSandbox(projectId: string): Promise<Sandbox | null>;
  deleteSandbox(projectId: string): Promise<void>;
  executeCommand(sandbox: Sandbox, command: string): Promise<ExecutionResult>;
  writeFile(sandbox: Sandbox, path: string, content: string): Promise<void>;
  readFile(sandbox: Sandbox, path: string): Promise<string>;
  listFiles(sandbox: Sandbox, path: string): Promise<string[]>;
}

// In-memory sandbox registry (use Redis in production)
const sandboxRegistry = new Map<string, SandboxInfo>();
const sandboxInstances = new Map<string, Sandbox>();

export const sandboxService = {
  async createSandbox(projectId: string): Promise<SandboxInfo> {
    // Create new E2B sandbox
    const sandbox = await Sandbox.create();

    const info: SandboxInfo = {
      sandboxId: sandbox.sandboxId,
      projectId,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      status: 'running',
    };

    sandboxRegistry.set(projectId, info);
    sandboxInstances.set(projectId, sandbox);

    console.log(`Created sandbox ${sandbox.sandboxId} for project ${projectId}`);

    return info;
  },

  async getSandbox(projectId: string): Promise<Sandbox | null> {
    const sandbox = sandboxInstances.get(projectId);

    if (sandbox) {
      // Update last used time
      const info = sandboxRegistry.get(projectId);
      if (info) {
        info.lastUsedAt = new Date();
        sandboxRegistry.set(projectId, info);
      }
      return sandbox;
    }

    return null;
  },

  async getOrCreateSandbox(projectId: string): Promise<Sandbox> {
    const existing = await this.getSandbox(projectId);
    if (existing) {
      try {
        // Verify the cached sandbox is still alive (E2B sandboxes hibernate after inactivity).
        await existing.commands.run('echo ok');
        return existing;
      } catch (error) {
        console.warn(`Sandbox for project ${projectId} is stale, recreating...`, error);
        sandboxInstances.delete(projectId);
        sandboxRegistry.delete(projectId);
      }
    }
    await this.createSandbox(projectId);
    const sandbox = sandboxInstances.get(projectId);
    if (!sandbox) {
      throw new Error('Failed to create sandbox');
    }
    return sandbox;
  },

  async deleteSandbox(projectId: string): Promise<void> {
    const sandbox = sandboxInstances.get(projectId);

    if (sandbox) {
      try {
        await sandbox.kill();
      } catch (error) {
        console.error(`Error closing sandbox ${projectId}:`, error);
      }

      sandboxInstances.delete(projectId);
      sandboxRegistry.delete(projectId);

      console.log(`Deleted sandbox for project ${projectId}`);
    }
  },

  async executeCommand(sandbox: Sandbox, command: string, projectId?: string): Promise<ExecutionResult> {
    try {
      const result = await sandbox.commands.run(command);
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode || 0,
      };
    } catch (error: any) {
      const message = error?.message || String(error);
      // E2B sandboxes may hibernate between calls. If we know the project id,
      // recreate the sandbox and retry the command once.
      if (projectId && (message.includes('not running') || message.includes('hibernated') || message.includes('Sandbox'))) {
        console.warn(`Command failed in stale sandbox for ${projectId}, recreating and retrying...`);
        sandboxInstances.delete(projectId);
        sandboxRegistry.delete(projectId);
        const fresh = await this.getOrCreateSandbox(projectId);
        const result = await fresh.commands.run(command);
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode || 0,
        };
      }
      throw error;
    }
  },

  async writeFile(sandbox: Sandbox, path: string, content: string): Promise<void> {
    await sandbox.files.write(path, content);
  },

  async readFile(sandbox: Sandbox, path: string): Promise<string> {
    return await sandbox.files.read(path);
  },

  async listFiles(sandbox: Sandbox, path: string): Promise<string[]> {
    const result = await sandbox.commands.run(`ls -la ${path}`);
    return result.stdout.split('\n').filter((line: string) => line.trim());
  },
};

export default sandboxService;
