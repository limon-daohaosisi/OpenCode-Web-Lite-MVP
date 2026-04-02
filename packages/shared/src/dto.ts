import type { SessionStatus } from './contracts.js';

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
  createdAt: string;
  id: string;
  lastOpenedAt: string;
  name: string;
  rootPath: string;
  updatedAt: string;
};

export type SessionCheckpoint = {
  approvalId?: string;
  kind:
    | 'session_created'
    | 'planning'
    | 'waiting_plan_confirmation'
    | 'executing_task'
    | 'waiting_approval'
    | 'failed'
    | 'completed';
  note?: string;
  planId?: string;
  taskId?: string;
  updatedAt: string;
};

export type SessionDto = {
  archivedAt?: string;
  createdAt: string;
  currentPlanId?: string;
  currentTaskId?: string;
  goalText: string;
  id: string;
  lastErrorText?: string;
  lastCheckpointJson?: string;
  status: SessionStatus;
  title: string;
  updatedAt: string;
  workspaceId: string;
};

export type ResumeSessionDto = {
  canResume: boolean;
  checkpoint?: string;
  session?: SessionDto;
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
