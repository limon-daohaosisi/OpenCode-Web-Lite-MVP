import type OpenAI from 'openai';
import type {
  FunctionTool,
  ResponseInputItem
} from 'openai/resources/responses/responses';
import { SYSTEM_PROMPT } from './prompt.js';
import { toolRegistry } from './tools/index.js';
import type { ToolDefinition } from './tools/types.js';

export type AgentRunInput = {
  input: string | ResponseInputItem[];
  previousResponseId?: null | string;
};

export type ModelResponseStream = ReturnType<OpenAI['responses']['stream']>;

export type StreamModelResponse = (input: AgentRunInput) => ModelResponseStream;

export type ResponseStreamConfig = {
  instructions?: string;
  model: string;
  statelessMode?: boolean;
  store?: boolean;
  tools?: ToolDefinition[];
};

export function buildResponseTools(
  tools: ToolDefinition[] = toolRegistry
): FunctionTool[] {
  return tools.map((tool) => ({
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

export function buildResponseStreamRequest(
  input: AgentRunInput,
  config: ResponseStreamConfig
) {
  const tools = config.tools ?? toolRegistry;
  const statelessMode = config.statelessMode ?? false;

  return {
    input: normalizeResponseInput(input.input),
    instructions: config.instructions ?? SYSTEM_PROMPT,
    model: config.model,
    ...(statelessMode
      ? {}
      : {
          parallel_tool_calls: false,
          tools: buildResponseTools(tools)
        }),
    ...(config.store === undefined ? {} : { store: config.store }),
    ...(input.previousResponseId && !statelessMode
      ? { previous_response_id: input.previousResponseId }
      : {})
  };
}

export function createModelResponseStreamer(
  client: OpenAI,
  config: ResponseStreamConfig
): StreamModelResponse {
  return (input) =>
    client.responses.stream(buildResponseStreamRequest(input, config));
}
