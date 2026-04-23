import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { dbTestContext, resetTestDatabase } from './db-test-context.js';
import { Lifecycle } from '../agent/lifecycle.js';
import type { RunLoopInput } from '../agent/run-loop.js';

const {
  buildSessionCheckpoint,
  environment,
  messageService,
  sessionEventService,
  sessionService,
  workspaceService
} = dbTestContext;

async function createApprovalFixture(input: {
  checkpointCallId: string;
  decision: 'approved' | 'rejected';
  previousResponseId: string;
  sessionId: string;
  toolName: 'run_command' | 'write_file';
  toolInput: Record<string, unknown>;
}) {
  const { approvalRepository } =
    await import('../repositories/approval-repository.js');
  const { toolCallRepository } =
    await import('../repositories/tool-call-repository.js');
  const now = '2026-04-23T00:00:00.000Z';

  sessionService.updateSessionRuntimeState({
    lastCheckpoint: buildSessionCheckpoint({
      approvalId: 'approval-test',
      callId: input.checkpointCallId,
      kind: 'waiting_approval',
      previousResponseId: input.previousResponseId,
      toolCallId: 'tool-call-test',
      updatedAt: now
    }),
    sessionId: input.sessionId,
    status: 'executing'
  });

  const toolCall = toolCallRepository.create({
    createdAt: now,
    id: 'tool-call-test',
    input: input.toolInput,
    messageId: null,
    requiresApproval: true,
    sessionId: input.sessionId,
    status: input.decision,
    taskId: null,
    toolName: input.toolName,
    updatedAt: now
  });
  const approval = approvalRepository.create({
    createdAt: now,
    decisionReasonText: null,
    decidedAt: input.decision === 'approved' ? now : now,
    decidedBy: null,
    decisionScope: 'once',
    id: 'approval-test',
    kind: input.toolName,
    payload: {},
    sessionId: input.sessionId,
    status: input.decision,
    suggestedRuleJson: null,
    taskId: null,
    toolCallId: toolCall.id
  });

  return { approval, toolCall };
}

function createSession() {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });

  return sessionService.createSession({
    goalText: 'Exercise lifecycle behavior',
    workspaceId: workspace.id
  });
}

beforeEach(() => {
  resetTestDatabase();
});

afterEach(() => {
  resetTestDatabase();
});

test('Lifecycle maps loop failures to session.failed state', async () => {
  const session = createSession();
  const lifecycle = new Lifecycle({
    async run() {
      throw new Error('loop exploded');
    }
  } as never);

  const result = await lifecycle.startPromptRun({
    input: 'Start the run',
    sessionId: session.id
  });

  assert.deepEqual(result, { reason: 'failed' });
  assert.equal(sessionService.getSession(session.id)?.status, 'failed');
  assert.equal(
    sessionService.getSession(session.id)?.lastErrorText,
    'loop exploded'
  );
  assert.deepEqual(
    sessionEventService
      .listAfterSequence(session.id, 0)
      .map((envelope) => envelope.event.type),
    ['session.failed', 'session.updated']
  );
});

test('Lifecycle continues the model when an approved tool fails during approval resume', async () => {
  const session = createSession();
  const { approval, toolCall } = await createApprovalFixture({
    checkpointCallId: 'call-approved',
    decision: 'approved',
    previousResponseId: 'resp-prev',
    sessionId: session.id,
    toolInput: { command: 'false' },
    toolName: 'run_command'
  });
  let runInput: unknown;

  const lifecycle = new Lifecycle(
    {
      async run(input: RunLoopInput) {
        runInput = input;
        return {
          kind: 'completed',
          previousResponseId: 'resp-next'
        };
      }
    } as never,
    {
      async executeApprovedTool() {
        throw new Error('tool exploded');
      }
    }
  );

  const result = await lifecycle.resumeApprovalRun({
    approval,
    decision: 'approved',
    toolCall
  });

  assert.deepEqual(result, { reason: 'completed' });
  const loopInput = runInput as {
    input: Array<{ output: string }>;
    previousResponseId: string;
  };

  assert.ok(loopInput.input[0]);
  assert.deepEqual(JSON.parse(loopInput.input[0].output), {
    error: 'tool exploded',
    ok: false
  });
  assert.equal(loopInput.previousResponseId, 'resp-prev');
  assert.equal(sessionService.getSession(session.id)?.status, 'executing');
  assert.equal(
    sessionEventService
      .listAfterSequence(session.id, 0)
      .some((envelope) => envelope.event.type === 'session.failed'),
    false
  );

  const messages = messageService.listMessages(session.id);

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, 'tool');
  assert.deepEqual(messages[0]?.content, [
    {
      content: {
        error: 'tool exploded',
        ok: false
      },
      toolName: 'run_command',
      type: 'tool_result'
    }
  ]);
  assert.deepEqual(
    sessionEventService
      .listAfterSequence(session.id, 0)
      .map((envelope) => envelope.event.type),
    ['tool.running', 'message.created', 'tool.failed']
  );
});

test('Lifecycle builds a synthetic tool result when approval is rejected', async () => {
  const session = createSession();
  const { approval, toolCall } = await createApprovalFixture({
    checkpointCallId: 'call-rejected',
    decision: 'rejected',
    previousResponseId: 'resp-prev',
    sessionId: session.id,
    toolInput: {
      content: 'export const ok = false;\n',
      path: 'src/index.ts'
    },
    toolName: 'write_file'
  });
  let runInput: unknown;

  const lifecycle = new Lifecycle({
    async run(input: RunLoopInput) {
      runInput = input;
      return {
        kind: 'completed',
        previousResponseId: 'resp-next'
      };
    }
  } as never);

  const result = await lifecycle.resumeApprovalRun({
    approval,
    decision: 'rejected',
    toolCall
  });

  assert.deepEqual(result, { reason: 'completed' });
  const loopInput = runInput as { input: Array<{ output: string }> };

  assert.ok(loopInput.input[0]);
  assert.deepEqual(JSON.parse(loopInput.input[0].output), {
    error: 'Approval rejected by user',
    ok: false,
    rejected: true
  });
  assert.deepEqual(
    sessionEventService
      .listAfterSequence(session.id, 0)
      .map((envelope) => envelope.event.type),
    ['message.created', 'tool.failed']
  );
});
