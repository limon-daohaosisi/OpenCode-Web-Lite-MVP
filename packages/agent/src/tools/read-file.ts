import { readFile } from 'node:fs/promises';
import type { ReadFileInput, ToolDefinition } from '@opencode/shared';
import { z } from 'zod';
import { resolveWorkspacePath } from './guards.js';

export const readFileInputSchema = z
  .object({
    path: z.string().trim().min(1)
  })
  .strict();

export const readFileToolDefinition: ToolDefinition = {
  description: 'Read a UTF-8 text file inside the current workspace.',
  inputSchema: {
    additionalProperties: false,
    properties: {
      path: {
        description: 'Relative path from the workspace root.',
        type: 'string'
      }
    },
    required: ['path'],
    type: 'object'
  },
  name: 'read_file'
};

export type ReadFileToolInput = ReadFileInput;

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
