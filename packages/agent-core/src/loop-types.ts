import type { MessageDto, ToolCallDto } from '@opencode/shared';

export type LoopState = {
  currentMessage?: MessageDto;
  pendingToolCall?: ToolCallDto;
  sessionId: string;
};
