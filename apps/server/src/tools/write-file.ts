import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createUnifiedDiff } from './diff.js';
import { resolveWorkspacePath } from './guards.js';

type WriteFileInput = {
  content: string;
  path: string;
};

export async function buildWriteFileApproval(
  input: WriteFileInput,
  workspaceRoot: string
) {
  const absolutePath = resolveWorkspacePath(workspaceRoot, input.path);
  const previousContent = await readFile(absolutePath, 'utf8').catch(() => '');

  return {
    diff: createUnifiedDiff(previousContent, input.content),
    path: input.path,
    summary: 'Replace file content after diff approval.'
  };
}

export async function executeWriteFile(
  input: WriteFileInput,
  workspaceRoot: string
) {
  const absolutePath = resolveWorkspacePath(workspaceRoot, input.path);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, input.content, 'utf8');

  return {
    bytesWritten: Buffer.byteLength(input.content, 'utf8'),
    path: input.path
  };
}
