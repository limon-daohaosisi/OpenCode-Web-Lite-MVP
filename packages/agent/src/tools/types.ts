export type ToolName = 'read_file' | 'write_file' | 'run_command';

export type ToolDefinition = {
  description: string;
  inputSchema: Record<string, unknown>;
  name: ToolName;
};
