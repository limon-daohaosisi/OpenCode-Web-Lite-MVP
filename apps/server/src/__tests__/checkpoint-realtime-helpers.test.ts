import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildSessionCheckpoint,
  getCheckpointCallId,
  getCheckpointPreviousResponseId,
  parseSessionCheckpoint
} from '../agent/checkpoint.js';
import { parseLastEventId, writeEnvelope } from '../internal/realtime/sse.js';

test('checkpoint helpers preserve OpenAI continuation metadata', () => {
  const checkpoint = buildSessionCheckpoint({
    approvalId: 'approval-1',
    callId: 'call-1',
    kind: 'waiting_approval',
    note: 'Waiting for approval',
    previousResponseId: 'resp-1',
    taskId: 'task-1',
    toolCallId: 'tool-1',
    updatedAt: '2026-04-21T10:00:00.000Z'
  });

  assert.deepEqual(checkpoint, {
    approvalId: 'approval-1',
    kind: 'waiting_approval',
    note: 'Waiting for approval',
    provider: {
      openai: {
        callId: 'call-1',
        previousResponseId: 'resp-1'
      }
    },
    taskId: 'task-1',
    toolCallId: 'tool-1',
    updatedAt: '2026-04-21T10:00:00.000Z'
  });
  assert.equal(getCheckpointCallId(checkpoint), 'call-1');
  assert.equal(getCheckpointPreviousResponseId(checkpoint), 'resp-1');
});

test('checkpoint parser tolerates invalid JSON and missing provider fields', () => {
  const minimalCheckpoint = buildSessionCheckpoint({
    kind: 'executing_task',
    updatedAt: '2026-04-21T10:05:00.000Z'
  });

  assert.equal(getCheckpointCallId(minimalCheckpoint), undefined);
  assert.equal(getCheckpointPreviousResponseId(minimalCheckpoint), undefined);
  assert.deepEqual(parseSessionCheckpoint(JSON.stringify(minimalCheckpoint)), {
    kind: 'executing_task',
    updatedAt: '2026-04-21T10:05:00.000Z'
  });
  assert.equal(parseSessionCheckpoint('{invalid-json'), undefined);
  assert.equal(parseSessionCheckpoint(undefined), undefined);
});

test('SSE helpers normalize ids and event payloads', async () => {
  const writes: Array<{ data: string; event?: string; id?: string }> = [];
  const envelope = {
    createdAt: '2026-04-21T10:10:00.000Z',
    event: {
      sessionId: 'session-1',
      type: 'session.updated' as const,
      updatedAt: '2026-04-21T10:10:00.000Z'
    },
    sequenceNo: 7
  };

  await writeEnvelope(
    {
      async writeSSE(input) {
        writes.push(input);
      }
    },
    envelope
  );

  assert.deepEqual(writes, [
    {
      data: JSON.stringify(envelope),
      event: 'session.updated',
      id: '7'
    }
  ]);
  assert.equal(parseLastEventId('12'), 12);
  assert.equal(parseLastEventId('0'), 0);
  assert.equal(parseLastEventId('-5'), 0);
  assert.equal(parseLastEventId('abc'), 0);
  assert.equal(parseLastEventId(undefined), 0);
});
