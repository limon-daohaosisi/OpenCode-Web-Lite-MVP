import type { ApprovalDto, MessageDto, ToolCallDto } from './dto.js';

export type SessionEvent =
  | { type: 'message.created'; sessionId: string; message: MessageDto }
  | {
      type: 'message.delta';
      sessionId: string;
      messageId: string;
      delta: string;
    }
  | { type: 'message.completed'; sessionId: string; messageId: string }
  | {
      type: 'tool.pending';
      sessionId: string;
      toolCall: ToolCallDto;
      approval: ApprovalDto;
    }
  | { type: 'approval.created'; sessionId: string; approval: ApprovalDto }
  | {
      type: 'approval.resolved';
      sessionId: string;
      approvalId: string;
      decision: 'approved' | 'rejected';
    }
  | { type: 'tool.running'; sessionId: string; toolCallId: string }
  | { type: 'tool.completed'; sessionId: string; toolCall: ToolCallDto }
  | {
      type: 'tool.failed';
      sessionId: string;
      toolCallId: string;
      error: string;
    }
  | { type: 'session.failed'; sessionId: string; error: string }
  | { type: 'session.resumable'; sessionId: string; checkpoint: unknown }
  | {
      type: 'session.updated';
      sessionId: string;
      updatedAt?: string;
      timestamp?: string;
    };
