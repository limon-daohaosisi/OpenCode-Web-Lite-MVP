export type AgentMessageInput = {
  content: string;
  sessionId: string;
};

export type AgentMessageOutput = {
  content: string;
  status: 'completed' | 'needs_approval';
};

export interface ModelClient {
  complete(input: AgentMessageInput): Promise<AgentMessageOutput>;
}

export class MockModelClient implements ModelClient {
  async complete(input: AgentMessageInput): Promise<AgentMessageOutput> {
    return {
      content: `Stub response for session ${input.sessionId}: wire this to the Responses API next.`,
      status: 'completed'
    };
  }
}
