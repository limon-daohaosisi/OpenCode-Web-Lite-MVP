import {
  buildResponseStreamRequest,
  type AgentRunInput
} from '@opencode/agent';
import {
  getOpenAIModel,
  getOpenAIStatelessMode,
  getOpenAIStore
} from './models.js';
import { getOpenAIClient } from './provider.js';

export function streamModelResponse(input: AgentRunInput) {
  return getOpenAIClient().responses.stream(
    buildResponseStreamRequest(input, {
      model: getOpenAIModel(),
      statelessMode: getOpenAIStatelessMode(),
      store: getOpenAIStore()
    })
  );
}
