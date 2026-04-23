import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { dbTestContext, resetTestDatabase } from './db-test-context.js';

const {
  buildSessionCheckpoint,
  environment,
  messageService,
  sessionService,
  workspaceService
} = dbTestContext;

beforeEach(() => {
  resetTestDatabase();
});

test('messageService persists and updates messages while sessionService stores runtime state', () => {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });
  const session = sessionService.createSession({
    goalText: 'Exercise message + session services',
    workspaceId: workspace.id
  });
  const message = messageService.createMessage({
    content: [{ text: 'Initial content', type: 'text' }],
    role: 'user',
    sessionId: session.id
  });
  const checkpoint = buildSessionCheckpoint({
    kind: 'waiting_approval',
    previousResponseId: 'resp-123',
    toolCallId: 'tool-123',
    updatedAt: '2026-04-21T11:00:00.000Z'
  });

  assert.equal(message.content[0]?.type, 'text');
  assert.equal(message.content[0]?.text, 'Initial content');
  assert.deepEqual(
    messageService.listMessages(session.id).map((item) => item.id),
    [message.id]
  );

  const updatedMessage = messageService.updateMessageContent(message.id, [
    {
      text: 'Updated content',
      type: 'text'
    }
  ]);

  assert.equal(updatedMessage?.content[0]?.type, 'text');
  assert.equal(updatedMessage?.content[0]?.text, 'Updated content');

  const updatedSession = sessionService.updateSessionRuntimeState({
    lastCheckpoint: checkpoint,
    lastErrorText: 'Waiting for user approval',
    sessionId: session.id,
    status: 'waiting_approval'
  });

  assert.equal(updatedSession?.status, 'waiting_approval');
  assert.equal(updatedSession?.lastErrorText, 'Waiting for user approval');
  assert.equal(updatedSession?.lastCheckpointJson, JSON.stringify(checkpoint));

  const resumePayload = sessionService.resumeSession(session.id);

  assert.equal(resumePayload.canResume, true);
  assert.equal(resumePayload.checkpoint, JSON.stringify(checkpoint));
});

test('messageService rejects writes for missing sessions', () => {
  assert.throws(
    () =>
      messageService.createMessage({
        content: [{ text: 'Should fail', type: 'text' }],
        role: 'assistant',
        sessionId: 'missing-session'
      }),
    /Session not found: missing-session/
  );
});
