import { streamText, type StreamTextResult, type ToolSet } from 'ai';
import type { AiSdkTurnRequest } from './context/schema.js';

export type ModelResponseStream = StreamTextResult<ToolSet, never>;

export type StreamModelResponse = (
  request: AiSdkTurnRequest
) => ModelResponseStream;

export function streamModelResponse(
  request: AiSdkTurnRequest
): ModelResponseStream {
  return streamText({
    messages: request.messages,
    model: request.model,
    providerOptions: request.providerOptions as never,
    stopWhen: [],
    system: request.system,
    toolChoice: 'auto',
    tools: request.tools
  }) as ModelResponseStream;
}
