export type SessionStatus =
  | 'active'
  | 'waiting_approval'
  | 'failed'
  | 'completed'
  | 'archived';
export type ToolCallStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'running'
  | 'completed'
  | 'failed';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type MessagePart =
  | { text: string; type: 'text' }
  | { content: unknown; toolName: string; type: 'tool_result' };

export type WorkspaceDto = {
  id: string;
  lastOpenedAt: string;
  name: string;
  rootPath: string;
  updatedAt: string;
};

export type SessionDto = {
  createdAt: string;
  id: string;
  lastErrorText?: string;
  status: SessionStatus;
  title: string;
  updatedAt: string;
  workspaceId: string;
};

export type MessageDto = {
  content: MessagePart[];
  createdAt: string;
  id: string;
  kind: 'message';
  role: 'system' | 'user' | 'assistant' | 'tool';
  sessionId: string;
};

export type ToolCallDto = {
  createdAt: string;
  errorText?: string;
  id: string;
  input: Record<string, unknown>;
  messageId: string;
  result?: Record<string, unknown>;
  sessionId: string;
  status: ToolCallStatus;
  toolName: string;
  updatedAt: string;
};

export type ApprovalDto = {
  createdAt: string;
  decidedAt?: string;
  id: string;
  kind: 'write_file' | 'run_command';
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  toolCallId: string;
};
