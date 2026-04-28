import { Lifecycle, ToolExecutor } from '@opencode/agent';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { dbTestContext, resetTestDatabase } from './db-test-context.js';
import { approvalRepository } from '../repositories/approval-repository.js';
import { toolCallRepository } from '../repositories/tool-call-repository.js';
import { buildLifecycleDeps } from '../wiring/agent.js';

const {
  buildSessionCheckpoint,
  environment,
  messageService,
  partService,
  sessionEventService,
  sessionService,
  workspaceService
} = dbTestContext;

function createSession() {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });

  return sessionService.createSession({
    goalText: 'Exercise lifecycle behavior',
    workspaceId: workspace.id
  });
}

function createApprovalFixture(input: {
  decision?: 'approved' | 'rejected';
  sessionId: string;
  toolName: 'run_command' | 'write_file';
  toolInput: Record<string, unknown>;
}) {
  const now = '2026-04-27T00:00:00.000Z';
  const assistant = messageService.createMessage({
    content: [],
    role: 'assistant',
    sessionId: input.sessionId,
    status: 'completed'
  });
  const part = partService.appendPart({
    messageId: assistant.id,
    modelToolCallId: 'model-call-test',
    order: 0,
    sessionId: input.sessionId,
    state: {
      input: input.toolInput,
      status: 'pending'
    },
    toolCallId: 'tool-call-test',
    toolName: input.toolName,
    type: 'tool'
  });
  const toolCall = toolCallRepository.create({
    createdAt: now,
    id: 'tool-call-test',
    input: input.toolInput,
    messageId: assistant.id,
    messagePartId: part.id,
    modelToolCallId: 'model-call-test',
    requiresApproval: true,
    sessionId: input.sessionId,
    status: 'pending_approval',
    taskId: null,
    toolName: input.toolName,
    updatedAt: now
  });
  const approval = approvalRepository.create({
    createdAt: now,
    decisionReasonText: null,
    decidedAt: null,
    decidedBy: null,
    decisionScope: 'once',
    id: 'approval-test',
    kind: input.toolName,
    payload: {},
    sessionId: input.sessionId,
    status: input.decision ?? 'pending',
    suggestedRuleJson: null,
    taskId: null,
    toolCallId: toolCall.id
  });

  sessionService.updateSessionRuntimeState({
    lastCheckpoint: buildSessionCheckpoint({
      approvalId: approval.id,
      kind: 'waiting_approval',
      messageId: assistant.id,
      modelToolCallId: 'model-call-test',
      partId: part.id,
      toolCallId: toolCall.id,
      updatedAt: now
    }),
    sessionId: input.sessionId,
    status: 'waiting_approval'
  });

  return { approval, part, toolCall };
}

beforeEach(() => {
  resetTestDatabase();
});

afterEach(() => {
  resetTestDatabase();
});

test('Lifecycle maps loop failures to session.failed state', async () => {
  const session = createSession();
  const lifecycle = new Lifecycle(
    {
      async run() {
        throw new Error('loop exploded');
      }
    },
    buildLifecycleDeps()
  );

  const result = await lifecycle.startPromptRun({
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

test('Lifecycle resolves rejected approval into ToolPart error and resumes loop', async () => {
  const session = createSession();
  const { approval, toolCall, part } = createApprovalFixture({
    sessionId: session.id,
    toolInput: {
      content: 'export const ok = false;\n',
      path: 'src/index.ts'
    },
    toolName: 'write_file'
  });
  let runCalled = false;
  const lifecycle = new Lifecycle(
    {
      async run() {
        runCalled = true;
        return { finishReason: 'stop', kind: 'completed' };
      }
    },
    buildLifecycleDeps()
  );

  const result = await lifecycle.resumeApprovalRun({
    approval,
    decision: 'rejected',
    toolCall
  });

  assert.deepEqual(result, { reason: 'completed' });
  assert.equal(runCalled, true);

  const updatedPart = partService.getPart(part.id);

  assert.equal(updatedPart?.type, 'tool');
  assert.equal(
    updatedPart?.type === 'tool' ? updatedPart.state.status : undefined,
    'error'
  );
  assert.equal(
    updatedPart?.type === 'tool' && updatedPart.state.status === 'error'
      ? updatedPart.state.reason
      : undefined,
    'execution_denied'
  );
});

test('Lifecycle continues when approved tool execution writes an error result', async () => {
  const session = createSession();
  const { approval, part, toolCall } = createApprovalFixture({
    sessionId: session.id,
    toolInput: { command: 'definitely-missing-command-for-test' },
    toolName: 'run_command'
  });
  let runCalled = false;
  const failingToolExecutor = new ToolExecutor({
    appendSessionEvent: (event) => sessionEventService.append(event),
    getMessagePart: (partId) => partService.getPart(partId),
    updateToolPartWithToolCall: (input) =>
      partService.updateToolPartWithToolCall(input)
  });
  const lifecycle = new Lifecycle(
    {
      async run() {
        runCalled = true;
        return { finishReason: 'stop', kind: 'completed' };
      }
    },
    buildLifecycleDeps({ toolExecutor: failingToolExecutor })
  );

  const result = await lifecycle.resumeApprovalRun({
    approval,
    decision: 'approved',
    toolCall
  });

  assert.deepEqual(result, { reason: 'completed' });
  assert.equal(runCalled, true);

  const updatedPart = partService.getPart(part.id);

  assert.equal(
    updatedPart?.type === 'tool' ? updatedPart.state.status : undefined,
    'error'
  );
  assert.equal(
    updatedPart?.type === 'tool' && updatedPart.state.status === 'error'
      ? updatedPart.state.reason
      : undefined,
    'tool_error'
  );
});
