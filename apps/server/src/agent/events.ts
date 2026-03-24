import type { ApprovalDto, ToolCallDto } from '@opencode/shared';
import type { SessionEvent } from '@opencode/shared';

export function createPendingToolEvent(
  sessionId: string,
  toolCall: ToolCallDto,
  approval: ApprovalDto
): SessionEvent {
  return {
    approval,
    sessionId,
    toolCall,
    type: 'tool.pending'
  };
}
