import type { SessionEventEnvelope } from '@opencode/shared';

type SseWriter = {
  writeSSE: (input: {
    data: string;
    event?: string;
    id?: string;
  }) => Promise<void>;
};

export function parseLastEventId(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function serializeEvent(envelope: SessionEventEnvelope) {
  return JSON.stringify(envelope);
}

export function toSseData(envelope: SessionEventEnvelope) {
  return serializeEvent(envelope);
}

export function toSseEventName(envelope: SessionEventEnvelope) {
  return envelope.event.type;
}

export async function writeEnvelope(
  streamWriter: SseWriter,
  envelope: SessionEventEnvelope
) {
  await streamWriter.writeSSE({
    data: toSseData(envelope),
    event: toSseEventName(envelope),
    id: String(envelope.sequenceNo)
  });
}
