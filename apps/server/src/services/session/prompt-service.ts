import type {
  ApprovalDto,
  SubmitSessionMessageResponse,
  ToolCallDto
} from '@opencode/shared';
import type { Lifecycle } from '@opencode/agent';
import { approvalRepository } from '../../repositories/approval-repository.js';
import { toolCallRepository } from '../../repositories/tool-call-repository.js';
import { ServiceError } from '../../lib/service-error.js';
import { lifecycle } from '../../wiring/agent.js';
import { messageService } from './message-service.js';
import type { SessionRunner } from './runner.js';
import { sessionRunner } from './runner.js';
import { sessionService } from './service.js';
import { sessionEventService } from './event-service.js';

type SubmitUserMessageInput = {
  content: string;
  sessionId: string;
};

export class SessionPromptService {
  constructor(
    private readonly runner: SessionRunner = sessionRunner,
    private readonly runtimeLifecycle: Lifecycle = lifecycle
  ) {}

  async prompt(
    input: SubmitUserMessageInput
  ): Promise<SubmitSessionMessageResponse> {
    const session = sessionService.getSession(input.sessionId);

    if (!session) {
      throw new ServiceError(`Session not found: ${input.sessionId}`, 404);
    }

    if (session.status === 'waiting_approval') {
      throw new ServiceError(
        'Session is waiting for approval before it can continue.',
        409
      );
    }

    const response = await this.runner.ensureRunning(
      input.sessionId,
      async () => {
        const message = messageService.createMessage({
          content: [{ text: input.content, type: 'text' }],
          role: 'user',
          sessionId: input.sessionId
        });

        sessionEventService.append({
          message,
          sessionId: input.sessionId,
          type: 'message.created'
        });

        const updatedSession = sessionService.updateSessionRuntimeState({
          lastErrorText: null,
          sessionId: input.sessionId,
          status: 'executing'
        });

        if (updatedSession) {
          sessionEventService.append({
            sessionId: updatedSession.id,
            type: 'session.updated',
            updatedAt: updatedSession.updatedAt
          });
        }

        return {
          accepted: true as const,
          message
        };
      },
      async () => {
        await this.runtimeLifecycle.startPromptRun({
          input: input.content,
          sessionId: input.sessionId
        });
      }
    );

    return response;
  }

  async resolveApproval(input: {
    approvalId: string;
    decision: 'approved' | 'rejected';
  }): Promise<{ approval: ApprovalDto; toolCall: ToolCallDto }> {
    const approval = approvalRepository.getById(input.approvalId);

    if (!approval) {
      throw new ServiceError(`Approval not found: ${input.approvalId}`, 404);
    }

    if (approval.status !== 'pending') {
      throw new ServiceError('Approval has already been decided.', 409);
    }

    const toolCall = toolCallRepository.getById(approval.toolCallId);

    if (!toolCall) {
      throw new ServiceError(
        `Tool call not found: ${approval.toolCallId}`,
        404
      );
    }

    const response = await this.runner.ensureRunning(
      approval.sessionId,
      async () => {
        const now = new Date().toISOString();
        const updatedApproval = approvalRepository.updateDecision({
          decidedAt: now,
          id: approval.id,
          status: input.decision
        });
        const updatedToolCall = toolCallRepository.update({
          id: toolCall.id,
          status: input.decision === 'approved' ? 'approved' : 'rejected',
          updatedAt: now
        });

        if (!updatedApproval || !updatedToolCall) {
          throw new ServiceError('Failed to persist approval decision.', 500);
        }

        sessionEventService.append({
          approvalId: updatedApproval.id,
          decision: input.decision,
          sessionId: approval.sessionId,
          type: 'approval.resolved'
        });

        const updatedSession = sessionService.updateSessionRuntimeState({
          lastErrorText: null,
          sessionId: approval.sessionId,
          status: 'executing'
        });

        if (updatedSession) {
          sessionEventService.append({
            sessionId: updatedSession.id,
            type: 'session.updated',
            updatedAt: updatedSession.updatedAt
          });
        }

        return {
          approval: updatedApproval,
          toolCall: updatedToolCall
        };
      },
      async (ctx) => {
        await this.runtimeLifecycle.resumeApprovalRun({
          approval: ctx.approval,
          decision: input.decision,
          toolCall: ctx.toolCall
        });
      }
    );

    return response;
  }
}

export const sessionPromptService = new SessionPromptService();
