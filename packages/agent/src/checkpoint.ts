import type { SessionCheckpoint } from '@opencode/shared';

type BuildSessionCheckpointInput = {
  approvalId?: string;
  callId?: string;
  kind: SessionCheckpoint['kind'];
  note?: string;
  previousResponseId?: string;
  taskId?: string;
  toolCallId?: string;
  updatedAt?: string;
};

export function buildSessionCheckpoint(
  input: BuildSessionCheckpointInput
): SessionCheckpoint {
  const checkpoint: SessionCheckpoint = {
    approvalId: input.approvalId,
    kind: input.kind,
    note: input.note,
    taskId: input.taskId,
    toolCallId: input.toolCallId,
    updatedAt: input.updatedAt ?? new Date().toISOString()
  };

  if (input.callId || input.previousResponseId) {
    checkpoint.provider = {
      openai: {
        callId: input.callId,
        previousResponseId: input.previousResponseId
      }
    };
  }

  return checkpoint;
}

export function getCheckpointCallId(checkpoint?: SessionCheckpoint | null) {
  return checkpoint?.provider?.openai?.callId;
}

export function getCheckpointPreviousResponseId(
  checkpoint?: SessionCheckpoint | null
) {
  return checkpoint?.provider?.openai?.previousResponseId;
}

export function parseSessionCheckpoint(raw: null | string | undefined) {
  if (!raw) {
    return undefined;
  }

  try {
    return (JSON.parse(raw) as SessionCheckpoint | null) ?? undefined;
  } catch {
    return undefined;
  }
}
