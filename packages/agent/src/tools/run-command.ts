import { spawn } from 'node:child_process';
import { z } from 'zod';
import { assertSafeCommand } from './guards.js';
import type { ToolDefinition } from './types.js';

export type RunCommandToolInput = {
  command: string;
  timeoutMs: number | null;
};

export const runCommandInputSchema = z
  .object({
    command: z.string().trim().min(1),
    timeoutMs: z.number().int().positive().nullable()
  })
  .strict();

export const runCommandToolDefinition: ToolDefinition = {
  description:
    'Run a non-interactive shell command in the workspace. Requires user approval.',
  inputSchema: {
    additionalProperties: false,
    properties: {
      command: {
        description: 'A single shell command executed in the workspace root.',
        type: 'string'
      },
      timeoutMs: {
        description:
          'Timeout in milliseconds before the command is terminated. Use null for the default timeout.',
        type: ['integer', 'null']
      }
    },
    required: ['command', 'timeoutMs'],
    type: 'object'
  },
  name: 'run_command'
};

export async function runCommandTool(
  input: RunCommandToolInput,
  workspaceRoot: string
) {
  assertSafeCommand(input.command);

  const timeoutMs = input.timeoutMs ?? 15_000;

  return new Promise<{
    exitCode: number | null;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
    const child = spawn(input.command, {
      cwd: workspaceRoot,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('exit', (exitCode) => {
      clearTimeout(timer);
      if (exitCode && exitCode !== 0) {
        reject(new Error(`Command exited with code ${exitCode}: ${stderr}`));
        return;
      }

      resolve({ exitCode, stderr, stdout });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
