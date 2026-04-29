import type {
  SessionCheckpoint,
  SessionEvent,
  SessionEventEnvelope
} from '@opencode/shared';
import { sessionStreamHub } from '../../lib/session-stream-hub.js';
import { parseJsonValue } from '../../lib/json.js';
import { sessionEventRepository } from '../../repositories/session-event-repository.js';

function deriveCreatedAt(event: SessionEvent) {
  switch (event.type) {
    case 'message.created':
      return event.message.createdAt;
    case 'approval.created':
      return event.approval.createdAt;
    case 'tool.completed':
    case 'tool.pending':
      return event.toolCall.updatedAt;
    case 'session.updated':
      return event.updatedAt ?? event.timestamp ?? new Date().toISOString();
    case 'session.resumable': {
      const checkpoint = event.checkpoint;

      if (typeof checkpoint === 'string') {
        return (
          parseJsonValue<SessionCheckpoint | null>(checkpoint, null)
            ?.updatedAt ?? new Date().toISOString()
        );
      }

      if (
        checkpoint &&
        typeof checkpoint === 'object' &&
        'updatedAt' in checkpoint &&
        typeof checkpoint.updatedAt === 'string'
      ) {
        return checkpoint.updatedAt;
      }

      return new Date().toISOString();
    }
    default:
      return new Date().toISOString();
  }
}

function deriveMetadata(event: SessionEvent) {
  switch (event.type) {
    case 'message.created':
      return {
        entityId: event.message.id,
        entityType: 'message',
        headline: `${event.message.role} message created`
      };
    case 'tool.pending':
      return {
        detailText: event.toolCall.toolName,
        entityId: event.toolCall.id,
        entityType: 'tool_call',
        headline: 'Tool pending approval'
      };
    case 'approval.created':
      return {
        entityId: event.approval.id,
        entityType: 'approval',
        headline: 'Approval created'
      };
    case 'approval.resolved':
      return {
        detailText: event.decision,
        entityId: event.approvalId,
        entityType: 'approval',
        headline: 'Approval resolved'
      };
    case 'tool.running':
      return {
        entityId: event.toolCallId,
        entityType: 'tool_call',
        headline: 'Tool running'
      };
    case 'tool.completed':
      return {
        entityId: event.toolCall.id,
        entityType: 'tool_call',
        headline: 'Tool completed'
      };
    case 'tool.failed':
      return {
        detailText: event.error,
        entityId: event.toolCallId,
        entityType: 'tool_call',
        headline: 'Tool failed',
        level: 'error' as const
      };
    case 'session.failed':
      return {
        detailText: event.error,
        entityId: event.sessionId,
        entityType: 'session',
        headline: 'Session failed',
        level: 'error' as const
      };
    case 'session.resumable':
      return {
        entityId: event.sessionId,
        entityType: 'session',
        headline: 'Session checkpoint updated'
      };
    case 'session.updated':
      return {
        entityId: event.sessionId,
        entityType: 'session',
        headline: 'Session updated'
      };
    default:
      return {
        entityId: event.sessionId,
        entityType: 'session'
      };
  }
}

export const sessionEventService = {
  append(event: SessionEvent): SessionEventEnvelope {
    const envelope = sessionEventRepository.append({
      createdAt: deriveCreatedAt(event),
      event,
      ...deriveMetadata(event),
      sessionId: event.sessionId
    });

    sessionStreamHub.publish(envelope);
    return envelope;
  },

  listAfterSequence(sessionId: string, afterSequenceNo: number) {
    return sessionEventRepository.listAfterSequence(sessionId, afterSequenceNo);
  }
};
