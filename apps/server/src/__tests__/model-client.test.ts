import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ResponseInputItem } from 'openai/resources/responses/responses';
import {
  buildResponseStreamRequest,
  normalizeResponseInput
} from '../agent/model-client.js';

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
  const previousStore = process.env.OPENAI_STORE;

  try {
    delete process.env.OPENAI_STORE;

    const request = buildResponseStreamRequest({
      input: '你好',
      previousResponseId: null
    });

    assert.equal('store' in request, false);
    assert.equal('previous_response_id' in request, false);
  } finally {
    if (previousStore === undefined) {
      delete process.env.OPENAI_STORE;
    } else {
      process.env.OPENAI_STORE = previousStore;
    }
  }
});

test('buildResponseStreamRequest includes previous_response_id when present', () => {
  const request = buildResponseStreamRequest({
    input: '你好',
    previousResponseId: 'resp-123'
  });

  assert.equal(request.previous_response_id, 'resp-123');
  assert.equal(Array.isArray(request.tools), true);
});

test('buildResponseStreamRequest includes store when explicitly configured', () => {
  const previousStore = process.env.OPENAI_STORE;

  try {
    process.env.OPENAI_STORE = 'false';

    const request = buildResponseStreamRequest({
      input: '你好',
      previousResponseId: null
    });

    assert.equal(request.store, false);
  } finally {
    if (previousStore === undefined) {
      delete process.env.OPENAI_STORE;
    } else {
      process.env.OPENAI_STORE = previousStore;
    }
  }
});

test('buildResponseStreamRequest omits previous_response_id and tools in stateless mode', () => {
  const previousStatelessMode = process.env.OPENAI_STATELESS_MODE;

  try {
    process.env.OPENAI_STATELESS_MODE = 'true';

    const request = buildResponseStreamRequest({
      input: '你好',
      previousResponseId: 'resp-123'
    });

    assert.equal('previous_response_id' in request, false);
    assert.equal('tools' in request, false);
    assert.equal('parallel_tool_calls' in request, false);
  } finally {
    if (previousStatelessMode === undefined) {
      delete process.env.OPENAI_STATELESS_MODE;
    } else {
      process.env.OPENAI_STATELESS_MODE = previousStatelessMode;
    }
  }
});
