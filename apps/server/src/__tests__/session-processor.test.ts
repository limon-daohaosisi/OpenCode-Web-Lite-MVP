import {
  SessionProcessor,
  type ModelResponseStream,
  type StreamModelResponse
} from '@opencode/agent';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { dbTestContext, resetTestDatabase } from './db-test-context.js';
import { buildSessionProcessorDeps } from '../wiring/agent.js';

const {
  environment,
  messageService,
  sessionEventService,
  sessionService,
  workspaceService
} = dbTestContext;

function createFakeStream(input: {
  events: Array<{ delta: string; type: 'response.output_text.delta' }>;
  finalResponse: {
    id: string;
    output: Array<Record<string, unknown>>;
  };
}) {
  return {
    async finalResponse() {
      return input.finalResponse;
    },
    async *[Symbol.asyncIterator]() {
      for (const event of input.events) {
        yield event;
      }
    }
  };
}

function createSession() {
  const workspace = workspaceService.createWorkspace({
    rootPath: environment.workspaceRoot
  });

  return sessionService.createSession({
    goalText: 'Exercise session processor behavior',
    workspaceId: workspace.id
  });
}

beforeEach(() => {
  resetTestDatabase();
});

afterEach(() => {
  resetTestDatabase();
});

test('SessionProcessor persists streamed assistant text and completes the turn', async () => {
  const session = createSession();

  const processor = new SessionProcessor(
    buildSessionProcessorDeps({
      streamModelResponse: (() =>
        createFakeStream({
          events: [
            { delta: 'Hello', type: 'response.output_text.delta' },
            { delta: ' world', type: 'response.output_text.delta' }
          ],
          finalResponse: {
            id: 'resp-text',
            output: []
          }
        }) as unknown as ModelResponseStream) as StreamModelResponse
    })
  );
  const result = await processor.processTurn({
    input: 'Say hello',
    previousResponseId: null,
    sessionId: session.id,
    workspaceRoot: environment.workspaceRoot
  });

  assert.deepEqual(result, {
    kind: 'completed',
    previousResponseId: 'resp-text'
  });

  const messages = messageService.listMessages(session.id);

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, 'assistant');
  assert.deepEqual(messages[0]?.content, [
    { text: 'Hello world', type: 'text' }
  ]);

  const events = sessionEventService.listAfterSequence(session.id, 0);

  assert.deepEqual(
    events.map((envelope) => envelope.event.type),
    [
      'message.created',
      'message.delta',
      'message.delta',
      'message.completed',
      'session.updated'
    ]
  );
  assert.equal(sessionService.getSession(session.id)?.status, 'executing');
});

test('SessionProcessor auto-executes read_file tools and returns function_call_output input', async () => {
  const session = createSession();

  const processor = new SessionProcessor(
    buildSessionProcessorDeps({
      streamModelResponse: (() =>
        createFakeStream({
          events: [],
          finalResponse: {
            id: 'resp-tool',
            output: [
              {
                arguments: JSON.stringify({ path: 'src/index.ts' }),
                call_id: 'call-read-file',
                name: 'read_file',
                type: 'function_call'
              }
            ]
          }
        }) as unknown as ModelResponseStream) as StreamModelResponse
    })
  );
  const result = await processor.processTurn({
    input: 'Read the index file',
    previousResponseId: null,
    sessionId: session.id,
    workspaceRoot: environment.workspaceRoot
  });

  assert.equal(result.kind, 'continue_with_tool_results');
  assert.equal(result.previousResponseId, 'resp-tool');
  assert.equal(result.nextInput.length, 1);
  assert.deepEqual(
    JSON.parse((result.nextInput[0] as { output: string }).output),
    {
      content: 'export const ok = true;\n',
      path: 'src/index.ts'
    }
  );

  const messages = messageService.listMessages(session.id);

  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, 'tool');
  assert.deepEqual(messages[0]?.content, [
    {
      content: {
        content: 'export const ok = true;\n',
        path: 'src/index.ts'
      },
      toolName: 'read_file',
      type: 'tool_result'
    }
  ]);

  assert.deepEqual(
    sessionEventService
      .listAfterSequence(session.id, 0)
      .map((envelope) => envelope.event.type),
    ['tool.running', 'message.created', 'tool.completed']
  );
});

test('SessionProcessor pauses for approval-required tools and persists a resumable checkpoint', async () => {
  const session = createSession();

  const processor = new SessionProcessor(
    buildSessionProcessorDeps({
      streamModelResponse: (() =>
        createFakeStream({
          events: [],
          finalResponse: {
            id: 'resp-approval',
            output: [
              {
                arguments: JSON.stringify({
                  content: 'export const ok = false;\n',
                  path: 'src/index.ts'
                }),
                call_id: 'call-write-file',
                name: 'write_file',
                type: 'function_call'
              }
            ]
          }
        }) as unknown as ModelResponseStream) as StreamModelResponse
    })
  );
  const result = await processor.processTurn({
    input: 'Update the file',
    previousResponseId: null,
    sessionId: session.id,
    workspaceRoot: environment.workspaceRoot
  });

  assert.equal(result.kind, 'paused_for_approval');
  assert.equal(result.previousResponseId, 'resp-approval');
  assert.equal(result.checkpoint.kind, 'waiting_approval');
  assert.equal(result.checkpoint.provider?.openai?.callId, 'call-write-file');
  assert.equal(
    result.checkpoint.provider?.openai?.previousResponseId,
    'resp-approval'
  );

  const persistedSession = sessionService.getSession(session.id);

  assert.equal(persistedSession?.status, 'waiting_approval');
  assert.ok(persistedSession?.lastCheckpointJson);
  assert.deepEqual(
    sessionEventService
      .listAfterSequence(session.id, 0)
      .map((envelope) => envelope.event.type),
    ['tool.pending', 'approval.created', 'session.resumable', 'session.updated']
  );
});
