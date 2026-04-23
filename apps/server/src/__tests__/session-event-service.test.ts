import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { sessionStreamHub } from '../internal/realtime/session-stream-hub.js';
import { dbTestContext, resetTestDatabase } from './db-test-context.js';

const {
  buildSessionCheckpoint,
  environment,
  sessionEventService,
  sessionService,
  workspaceService
} = dbTestContext;

beforeEach(() => {
  resetTestDatabase();
});

test('sessionEventService persists ordered envelopes and publishes them to subscribers', () => {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });
  const session = sessionService.createSession({
    goalText: 'Exercise session event service',
    workspaceId: workspace.id
  });
  const subscription = sessionStreamHub.subscribe(session.id);
  const firstEnvelope = sessionEventService.append({
    sessionId: session.id,
    type: 'session.updated',
    updatedAt: '2026-04-21T12:00:00.000Z'
  });
  const secondEnvelope = sessionEventService.append({
    error: 'Tool failed',
    sessionId: session.id,
    toolCallId: 'tool-2',
    type: 'tool.failed'
  });

  assert.equal(firstEnvelope.sequenceNo, 1);
  assert.equal(secondEnvelope.sequenceNo, 2);
  assert.deepEqual(subscription.drain(), [firstEnvelope, secondEnvelope]);
  assert.deepEqual(sessionEventService.listAfterSequence(session.id, 1), [
    secondEnvelope
  ]);

  subscription.unsubscribe();
});

test('sessionEventService uses checkpoint.updatedAt for resumable events', () => {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });
  const session = sessionService.createSession({
    goalText: 'Resume from checkpoint timestamp',
    workspaceId: workspace.id
  });
  const checkpoint = buildSessionCheckpoint({
    approvalId: 'approval-2',
    kind: 'waiting_approval',
    updatedAt: '2026-04-21T12:05:00.000Z'
  });
  const envelope = sessionEventService.append({
    checkpoint,
    sessionId: session.id,
    type: 'session.resumable'
  });

  assert.equal(envelope.createdAt, '2026-04-21T12:05:00.000Z');
  assert.equal(envelope.event.type, 'session.resumable');
});
