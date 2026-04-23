import type { SubmitSessionMessageResponse } from '@opencode/shared';
import { agentRuntime, type AgentRuntime } from './runtime.js';

type SubmitUserMessageInput = {
  content: string;
  sessionId: string;
};

export class AgentLoop {
  constructor(private readonly runtime: AgentRuntime = agentRuntime) {}

  submitUserMessage(
    input: SubmitUserMessageInput
  ): Promise<SubmitSessionMessageResponse> {
    return this.runtime.submitUserMessage(input);
  }

  resolveApproval(input: {
    approvalId: string;
    decision: 'approved' | 'rejected';
  }) {
    return this.runtime.resolveApproval(input);
  }
}
