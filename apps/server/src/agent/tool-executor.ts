import type { RunCommandInput, ToolInputMap, ToolName } from '@opencode/shared';
import { z } from 'zod';
import { readFileTool } from '../tools/read-file.js';
import { runCommandTool } from '../tools/run-command.js';
import {
  buildWriteFileApproval,
  executeWriteFile
} from '../tools/write-file.js';

const readFileInputSchema = z
  .object({
    path: z.string().trim().min(1)
  })
  .strict();

const writeFileInputSchema = z
  .object({
    content: z.string(),
    path: z.string().trim().min(1)
  })
  .strict();

const runCommandInputSchema = z
  .object({
    command: z.string().trim().min(1),
    timeoutMs: z.number().int().positive().optional()
  })
  .strict();

type ApprovalResult = {
  kind: 'approval';
  payload: Record<string, unknown>;
};

type AutoExecutionResult = {
  kind: 'auto';
  output: Record<string, unknown>;
};

type ParsedToolInput =
  | { input: ToolInputMap['read_file']; toolName: 'read_file' }
  | { input: ToolInputMap['write_file']; toolName: 'write_file' }
  | {
      input: RunCommandInput & { timeoutMs?: number };
      toolName: 'run_command';
    };

export type ToolPreparationResult = ApprovalResult | AutoExecutionResult;

function parseToolInput(
  toolName: ToolName,
  input: Record<string, unknown>
): ParsedToolInput {
  switch (toolName) {
    case 'read_file':
      return {
        input: readFileInputSchema.parse(input),
        toolName
      };
    case 'write_file':
      return {
        input: writeFileInputSchema.parse(input),
        toolName
      };
    case 'run_command':
      return {
        input: runCommandInputSchema.parse(input),
        toolName
      };
  }
}

export function toolRequiresApproval(toolName: ToolName) {
  return toolName === 'write_file' || toolName === 'run_command';
}

export async function prepareToolExecution(
  toolName: ToolName,
  rawInput: Record<string, unknown>,
  workspaceRoot: string
): Promise<ToolPreparationResult> {
  const parsed = parseToolInput(toolName, rawInput);

  switch (parsed.toolName) {
    case 'read_file':
      return {
        kind: 'auto',
        output: await readFileTool(parsed.input, workspaceRoot)
      };
    case 'write_file':
      return {
        kind: 'approval',
        payload: await buildWriteFileApproval(parsed.input, workspaceRoot)
      };
    case 'run_command':
      return {
        kind: 'approval',
        payload: {
          command: parsed.input.command,
          summary: 'Run non-interactive shell command after approval.',
          timeoutMs: parsed.input.timeoutMs
        }
      };
  }
}

export async function executeApprovedTool(
  toolName: Extract<ToolName, 'run_command' | 'write_file'>,
  rawInput: Record<string, unknown>,
  workspaceRoot: string
) {
  const parsed = parseToolInput(toolName, rawInput);

  switch (parsed.toolName) {
    case 'write_file':
      return executeWriteFile(parsed.input, workspaceRoot);
    case 'run_command':
      return runCommandTool(parsed.input, workspaceRoot);
  }

  throw new Error(`Unsupported approval tool: ${toolName}`);
}
