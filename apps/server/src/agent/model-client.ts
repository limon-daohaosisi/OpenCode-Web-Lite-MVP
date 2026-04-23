import { SYSTEM_PROMPT, toolRegistry } from '@opencode/agent-core';
import type {
  FunctionTool,
  ResponseInputItem
} from 'openai/resources/responses/responses';
import {
  getOpenAIClient,
  getOpenAIModel,
  getOpenAIStatelessMode,
  getOpenAIStore
} from '../services/ai/index.js';

export type AgentRunInput = {
  input: string | ResponseInputItem[];
  previousResponseId?: null | string;
};

export function buildResponseTools(): FunctionTool[] {
  return toolRegistry.map((tool) => ({
    description: tool.description,
    name: tool.name,
    parameters: tool.inputSchema,
    strict: true,
    type: 'function'
  }));
}

export function normalizeResponseInput(
  input: string | ResponseInputItem[]
): ResponseInputItem[] {
  if (Array.isArray(input)) {
    return input;
  }

  return [
    {
      content: [
        {
          text: input,
          type: 'input_text'
        }
      ],
      role: 'user',
      type: 'message'
    }
  ];
}

export function buildResponseStreamRequest(input: AgentRunInput) {
  const store = getOpenAIStore();
  const statelessMode = getOpenAIStatelessMode();

  return {
    input: normalizeResponseInput(input.input),
    instructions: SYSTEM_PROMPT,
    model: getOpenAIModel(),
    ...(statelessMode
      ? {}
      : {
          parallel_tool_calls: false,
          tools: buildResponseTools()
        }),
    ...(store === undefined ? {} : { store }),
    ...(input.previousResponseId && !statelessMode
      ? { previous_response_id: input.previousResponseId }
      : {})
  };
}

export function streamModelResponse(input: AgentRunInput) {
  return getOpenAIClient().responses.stream(buildResponseStreamRequest(input));
}
