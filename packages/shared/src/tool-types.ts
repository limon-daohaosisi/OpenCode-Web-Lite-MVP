export type ToolName = 'read_file' | 'write_file' | 'run_command';

export type ToolDefinition = {
  name: ToolName;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ReadFileInput = {
  path: string;
};

export type WriteFileInput = {
  content: string;
  path: string;
};

export type RunCommandInput = {
  command: string;
};

export type ToolInputMap = {
  read_file: ReadFileInput;
  run_command: RunCommandInput;
  write_file: WriteFileInput;
};
