import {
  buildResponseStreamRequest,
  normalizeResponseInput
} from '@opencode/agent';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResponseInputItem } from 'openai/resources/responses/responses';

const defaultConfig = {
  model: 'gpt-4.1-mini'
};

test('normalizeResponseInput wraps plain text into a user message list', () => {
  assert.deepEqual(normalizeResponseInput('你好'), [
    {
      content: [
        {
          text: '你好',
          type: 'input_text'
        }
      ],
      role: 'user',
      type: 'message'
    }
  ]);
});

test('normalizeResponseInput preserves prebuilt response input lists', () => {
  const existingInput: ResponseInputItem[] = [
    {
      content: [
        {
          text: 'already normalized',
          type: 'input_text'
        }
      ],
      role: 'user',
      type: 'message'
    }
  ];

  assert.strictEqual(normalizeResponseInput(existingInput), existingInput);
});

test('buildResponseStreamRequest omits store and empty previous_response_id by default', () => {
  const request = buildResponseStreamRequest(
    {
      input: '你好',
      previousResponseId: null
    },
    defaultConfig
  );

  assert.equal('store' in request, false);
  assert.equal('previous_response_id' in request, false);
});

test('buildResponseStreamRequest includes previous_response_id when present', () => {
  const request = buildResponseStreamRequest(
    {
      input: '你好',
      previousResponseId: 'resp-123'
    },
    defaultConfig
  );

  assert.equal(request.previous_response_id, 'resp-123');
  assert.equal(Array.isArray(request.tools), true);
});

test('buildResponseStreamRequest includes store when explicitly configured', () => {
  const request = buildResponseStreamRequest(
    {
      input: '你好',
      previousResponseId: null
    },
    {
      ...defaultConfig,
      store: false
    }
  );

  assert.equal(request.store, false);
});

test('buildResponseStreamRequest omits previous_response_id and tools in stateless mode', () => {
  const request = buildResponseStreamRequest(
    {
      input: '你好',
      previousResponseId: 'resp-123'
    },
    {
      ...defaultConfig,
      statelessMode: true
    }
  );

  assert.equal('previous_response_id' in request, false);
  assert.equal('tools' in request, false);
  assert.equal('parallel_tool_calls' in request, false);
});
