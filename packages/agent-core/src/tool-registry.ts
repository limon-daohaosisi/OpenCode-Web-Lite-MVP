import type { ToolDefinition } from '@opencode/shared';

export const toolRegistry: ToolDefinition[] = [
  {
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
  },
  {
    description:
      'Replace a UTF-8 text file inside the current workspace. Requires user approval.',
    inputSchema: {
      additionalProperties: false,
      properties: {
        content: {
          description: 'Full next content of the file.',
          type: 'string'
        },
        path: {
          description: 'Relative path from the workspace root.',
          type: 'string'
        }
      },
      required: ['path', 'content'],
      type: 'object'
    },
    name: 'write_file'
  },
  {
    description:
      'Run a non-interactive shell command in the workspace. Requires user approval.',
    inputSchema: {
      additionalProperties: false,
      properties: {
        command: {
          description: 'A single shell command executed in the workspace root.',
          type: 'string'
        }
      },
      required: ['command'],
      type: 'object'
    },
    name: 'run_command'
  }
];
