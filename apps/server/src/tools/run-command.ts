import { spawn } from 'node:child_process';
import { assertSafeCommand } from './guards.js';

type RunCommandInput = {
  command: string;
  timeoutMs?: number;
};

export async function runCommandTool(
  input: RunCommandInput,
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
      resolve({ exitCode, stderr, stdout });
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}
