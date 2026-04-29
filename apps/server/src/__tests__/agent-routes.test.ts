import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { sessionInteractionService } from '../services/agent/interaction-service.js';
import { dbTestContext, resetTestDatabase } from './db-test-context.js';
import { parseJson } from './server-test-helpers.js';

const {
  app,
  buildSessionCheckpoint,
  environment,
  ServiceError,
  sessionEventService,
  sessionService,
  workspaceService
} = dbTestContext;

beforeEach(() => {
  resetTestDatabase();
});

afterEach(() => {
  mock.restoreAll();
  resetTestDatabase();
});

test('POST /api/sessions/:sessionId/messages delegates to SessionInteractionService and returns 202', async () => {
  const prompt = mock.method(
    sessionInteractionService,
    'prompt',
    async (input: { content: string; sessionId: string }) => {
      assert.deepEqual(input, {
        content: 'Explain the current server structure',
        sessionId: 'session-123'
      });

      return {
        accepted: true,
        message: {
          content: [
            { text: 'Explain the current server structure', type: 'text' }
          ],
          createdAt: '2026-04-21T13:00:00.000Z',
          id: 'message-123',
          kind: 'message',
          role: 'user',
          sessionId: 'session-123'
        }
      };
    }
  );

  const response = await app.request('/api/sessions/session-123/messages', {
    body: JSON.stringify({ content: 'Explain the current server structure' }),
    headers: {
      'content-type': 'application/json'
    },
    method: 'POST'
  });

  assert.equal(response.status, 202);
  assert.equal(prompt.mock.calls.length, 1);

  const payload = await parseJson<{
    accepted: boolean;
    message: { id: string; sessionId: string };
  }>(response);

  assert.equal(payload.data?.accepted, true);
  assert.equal(payload.data?.message.id, 'message-123');
  assert.equal(payload.data?.message.sessionId, 'session-123');
});

test('agent routes map ServiceError instances to HTTP errors', async () => {
  mock.method(sessionInteractionService, 'prompt', async () => {
    throw new ServiceError('Session already has an active run.', 409);
  });
  mock.method(sessionInteractionService, 'resolveApproval', async () => {
    throw new ServiceError('Approval not found: missing-approval', 404);
  });

  const submitResponse = await app.request(
    '/api/sessions/session-123/messages',
    {
      body: JSON.stringify({ content: 'Trigger a conflict' }),
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST'
    }
  );
  const approvalResponse = await app.request(
    '/api/approvals/missing-approval/approve',
    {
      method: 'POST'
    }
  );

  assert.equal(submitResponse.status, 409);
  assert.equal(
    (await parseJson(submitResponse)).error,
    'Session already has an active run.'
  );
  assert.equal(approvalResponse.status, 404);
  assert.equal(
    (await parseJson(approvalResponse)).error,
    'Approval not found: missing-approval'
  );
});

test('approval routes delegate approve and reject decisions to SessionInteractionService', async () => {
  const decisions: Array<{ approvalId: string; decision: string }> = [];

  mock.method(
    sessionInteractionService,
    'resolveApproval',
    async (input: {
      approvalId: string;
      decision: 'approved' | 'rejected';
    }) => {
      decisions.push(input);

      return {
        approval: {
          createdAt: '2026-04-21T13:05:00.000Z',
          id: input.approvalId,
          kind: 'run_command',
          payload: {},
          sessionId: 'session-approval',
          status: input.decision,
          toolCallId: 'tool-approval'
        },
        toolCall: {
          createdAt: '2026-04-21T13:05:00.000Z',
          id: 'tool-approval',
          input: {},
          sessionId: 'session-approval',
          status: input.decision === 'approved' ? 'approved' : 'rejected',
          toolName: 'run_command',
          updatedAt: '2026-04-21T13:05:30.000Z'
        }
      };
    }
  );

  const approveResponse = await app.request(
    '/api/approvals/approval-1/approve',
    {
      method: 'POST'
    }
  );
  const rejectResponse = await app.request('/api/approvals/approval-1/reject', {
    method: 'POST'
  });

  assert.equal(approveResponse.status, 200);
  assert.equal(rejectResponse.status, 200);
  assert.deepEqual(decisions, [
    { approvalId: 'approval-1', decision: 'approved' },
    { approvalId: 'approval-1', decision: 'rejected' }
  ]);
});

test('GET /api/sessions/:sessionId/stream replays events after Last-Event-ID', async () => {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });
  const session = sessionService.createSession({
    goalText: 'Replay events after the last seen sequence number',
    workspaceId: workspace.id
  });

  sessionEventService.append({
    sessionId: session.id,
    type: 'session.updated',
    updatedAt: '2026-04-21T13:10:00.000Z'
  });

  const replayedEnvelope = sessionEventService.append({
    checkpoint: buildSessionCheckpoint({
      kind: 'waiting_approval',
      updatedAt: '2026-04-21T13:10:30.000Z'
    }),
    sessionId: session.id,
    type: 'session.resumable'
  });

  const abortController = new AbortController();
  const response = await app.request(`/api/sessions/${session.id}/stream`, {
    headers: {
      'Last-Event-ID': '1'
    },
    signal: abortController.signal
  });

  assert.equal(response.status, 200);
  assert.ok(response.body);

  const reader = response.body.getReader();
  const { done, value } = await reader.read();

  assert.equal(done, false);

  const chunk = new TextDecoder().decode(value);
  const dataLine = chunk.split('\n').find((line) => line.startsWith('data: '));

  assert.ok(dataLine);

  const replayedPayload = JSON.parse(dataLine.slice(6)) as {
    createdAt: string;
    event: { type: string };
    sequenceNo: number;
  };

  assert.equal(replayedPayload.sequenceNo, replayedEnvelope.sequenceNo);
  assert.equal(replayedPayload.event.type, 'session.resumable');
  assert.equal(replayedPayload.createdAt, replayedEnvelope.createdAt);

  abortController.abort();

  try {
    await reader.cancel();
  } catch {
    // The stream can already be closed by the abort signal.
  }
});
