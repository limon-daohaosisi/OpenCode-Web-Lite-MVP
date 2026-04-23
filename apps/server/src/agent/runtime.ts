import type { SessionPromptService } from '../services/session/session-prompt-service.js';
import { sessionPromptService } from '../services/session/session-prompt-service.js';
import { sessionRunner, type SessionRunner } from './runner.js';

export class AgentRuntime {
  constructor(
    private readonly promptService: SessionPromptService = sessionPromptService,
    private readonly runner: SessionRunner = sessionRunner
  ) {}

  hasActiveRun(sessionId: string) {
    return this.runner.busy(sessionId);
  }

  resolveApproval(input: {
    approvalId: string;
    decision: 'approved' | 'rejected';
  }) {
    return this.promptService.resolveApproval(input);
  }

  submitUserMessage(input: { content: string; sessionId: string }) {
    return this.promptService.prompt(input);
  }
}

export const agentRuntime = new AgentRuntime();
