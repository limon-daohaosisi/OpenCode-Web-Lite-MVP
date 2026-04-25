import type { ToolDefinition } from '@opencode/shared';

export {
  type ReadFileToolInput,
  readFileInputSchema,
  readFileTool,
  readFileToolDefinition
} from './read-file.js';
export {
  type RunCommandToolInput,
  runCommandInputSchema,
  runCommandTool,
  runCommandToolDefinition
} from './run-command.js';
export {
  buildWriteFileApproval,
  executeWriteFile,
  type WriteFileToolInput,
  writeFileInputSchema,
  writeFileToolDefinition
} from './write-file.js';
export { resolveWorkspacePath, assertSafeCommand } from './guards.js';
export { createUnifiedDiff } from './diff.js';
import { readFileToolDefinition } from './read-file.js';
import { runCommandToolDefinition } from './run-command.js';
import { writeFileToolDefinition } from './write-file.js';

export const toolRegistry: ToolDefinition[] = [
  readFileToolDefinition,
  writeFileToolDefinition,
  runCommandToolDefinition
];
