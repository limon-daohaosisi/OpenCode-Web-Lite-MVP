import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import { RunLoop } from '../agent/run-loop.js';
import type {
  ProcessTurnInput,
  ProcessorResult,
  SessionProcessor
} from '../agent/session-processor.js';

test('RunLoop continues with tool results until the turn completes', async () => {
  const calls: ProcessTurnInput[] = [];
  const nextInput: ResponseInputItem[] = [
    {
      call_id: 'call-1',
      output: '{"ok":true}',
      type: 'function_call_output'
    }
  ];
  const results: ProcessorResult[] = [
    {
      kind: 'continue_with_tool_results',
      nextInput,
      previousResponseId: 'resp-1'
    },
    {
      kind: 'completed',
      previousResponseId: 'resp-2'
    }
  ];
  const processor = {
    async processTurn(input: ProcessTurnInput) {
      calls.push(input);
      const result = results.shift();

      if (!result) {
        throw new Error('Unexpected extra processor call');
      }

      return result;
    }
  } as SessionProcessor;
  const loop = new RunLoop(processor);

  const result = await loop.run({
    input: 'Explain the repo',
    previousResponseId: null,
    sessionId: 'session-1',
    workspaceRoot: '/tmp/workspace'
  });

  assert.deepEqual(calls, [
    {
      input: 'Explain the repo',
      previousResponseId: null,
      sessionId: 'session-1',
      workspaceRoot: '/tmp/workspace'
    },
    {
      input: nextInput,
      previousResponseId: 'resp-1',
      sessionId: 'session-1',
      workspaceRoot: '/tmp/workspace'
    }
  ]);
  assert.deepEqual(result, {
    kind: 'completed',
    previousResponseId: 'resp-2'
  });
});

test('RunLoop returns immediately when the processor pauses for approval', async () => {
  const checkpoint = {
    kind: 'waiting_approval' as const,
    updatedAt: '2026-04-23T00:00:00.000Z'
  };
  const processor = {
    async processTurn(input: ProcessTurnInput) {
      assert.equal(input.input, 'Run a command');
      assert.equal(input.previousResponseId, 'resp-prev');
      return {
        checkpoint,
        kind: 'paused_for_approval',
        previousResponseId: 'resp-next'
      } satisfies ProcessorResult;
    }
  } as SessionProcessor;
  const loop = new RunLoop(processor);

  const result = await loop.run({
    input: 'Run a command',
    previousResponseId: 'resp-prev',
    sessionId: 'session-2',
    workspaceRoot: '/tmp/workspace'
  });

  assert.deepEqual(result, {
    checkpoint,
    kind: 'paused_for_approval',
    previousResponseId: 'resp-next'
  });
});
