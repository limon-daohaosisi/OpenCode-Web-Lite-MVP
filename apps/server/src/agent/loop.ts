import type { MessageDto } from '@opencode/shared';
import { buildAssistantMessage } from '../services/session-service.js';
import { MockModelClient, type ModelClient } from './model-client.js';

type SubmitUserMessageInput = {
  content: string;
  sessionId: string;
};

export class AgentLoop {
  constructor(
    private readonly modelClient: ModelClient = new MockModelClient()
  ) {}

  async submitUserMessage(input: SubmitUserMessageInput): Promise<MessageDto> {
    const result = await this.modelClient.complete(input);

    return buildAssistantMessage(input.sessionId, result.content);
  }
}
