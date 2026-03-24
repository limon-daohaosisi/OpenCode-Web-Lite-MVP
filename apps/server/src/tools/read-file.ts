import { readFile } from 'node:fs/promises';
import { resolveWorkspacePath } from './guards.js';

type ReadFileInput = {
  path: string;
};

export async function readFileTool(
  input: ReadFileInput,
  workspaceRoot: string
) {
  const absolutePath = resolveWorkspacePath(workspaceRoot, input.path);
  const content = await readFile(absolutePath, 'utf8');

  return {
    content,
    path: input.path
  };
}
