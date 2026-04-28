import type {
  ApprovalDto,
  SubmitSessionMessageResponse,
  ToolCallDto
} from '@opencode/shared';
import { normalizePrompt, type Lifecycle } from '@opencode/agent';
import { approvalRepository } from '../../repositories/approval-repository.js';
import { toolCallRepository } from '../../repositories/tool-call-repository.js';
import { ServiceError } from '../../lib/service-error.js';
import { lifecycle } from '../../wiring/agent.js';
import { messageService } from './message-service.js';
import { partService } from './part-service.js';
import type { SessionRunner } from './runner.js';
import { sessionRunner } from './runner.js';
import { sessionService } from './service.js';
import { sessionEventService } from './event-service.js';

type SubmitUserMessageInput = {
  content: string;
  sessionId: string;
};

function parseCheckpoint(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as
      | {
          approvalId?: string;
          kind?: string;
          messageId?: string;
          modelToolCallId?: string;
          partId?: string;
          toolCallId?: string;
        }
      | undefined;
  } catch {
    return undefined;
  }
}

function assertApprovalResumeReady(input: {
  approval: ApprovalDto;
  toolCall: ToolCallDto;
}) {
  const session = sessionService.getSession(input.approval.sessionId);

  if (!session) {
    throw new ServiceError(
      `Session not found: ${input.approval.sessionId}`,
      404
    );
  }

  if (session.status !== 'waiting_approval') {
    throw new ServiceError('Session is not waiting for approval.', 409);
  }

  if (input.toolCall.sessionId !== input.approval.sessionId) {
    throw new ServiceError('Approval and tool call session mismatch.', 409);
  }

  if (!input.toolCall.requiresApproval) {
    throw new ServiceError('Tool call does not require approval.', 409);
  }

  if (
    input.toolCall.status !== 'pending_approval' &&
    input.toolCall.status !== 'pending'
  ) {
    throw new ServiceError('Tool call is no longer waiting for approval.', 409);
  }

  const pendingApprovals = approvalRepository.listPendingBySession(
    input.approval.sessionId
  );

  if (pendingApprovals.length !== 1) {
    throw new ServiceError(
      `Expected one pending approval, found ${pendingApprovals.length}.`,
      409
    );
  }

  if (pendingApprovals[0]?.id !== input.approval.id) {
    throw new ServiceError(
      'Pending approval does not match session checkpoint.',
      409
    );
  }

  const checkpoint = parseCheckpoint(session.lastCheckpointJson);

  if (
    checkpoint?.kind !== 'waiting_approval' ||
    checkpoint.approvalId !== input.approval.id ||
    checkpoint.toolCallId !== input.toolCall.id ||
    !checkpoint.partId ||
    !checkpoint.messageId ||
    !checkpoint.modelToolCallId
  ) {
    throw new ServiceError('Session checkpoint does not match approval.', 409);
  }

  const part = partService.getPart(checkpoint.partId);

  if (!part || part.type !== 'tool') {
    throw new ServiceError(
      `Pending ToolPart not found: ${checkpoint.partId}`,
      409
    );
  }

  if (part.state.status !== 'pending') {
    throw new ServiceError('Approval ToolPart is no longer pending.', 409);
  }

  if (
    part.toolCallId !== input.toolCall.id ||
    part.id !== input.toolCall.messagePartId ||
    part.messageId !== input.toolCall.messageId ||
    part.modelToolCallId !== input.toolCall.modelToolCallId ||
    part.modelToolCallId !== checkpoint.modelToolCallId ||
    part.messageId !== checkpoint.messageId ||
    part.sessionId !== input.toolCall.sessionId ||
    part.toolName !== input.toolCall.toolName ||
    part.toolName !== input.approval.kind
  ) {
    throw new ServiceError('Approval checkpoint does not match ToolPart.', 409);
  }
}

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
        const normalized = normalizePrompt({
          content: input.content,
          sessionId: input.sessionId
        });
        const message = messageService.createMessage({
          ...normalized.message,
          content: normalized.parts
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

    assertApprovalResumeReady({ approval, toolCall });

    const response = await this.runner.ensureRunning(
      approval.sessionId,
      async () => {
        const now = new Date().toISOString();
        const updatedApproval = approvalRepository.updateDecision({
          decidedAt: now,
          id: approval.id,
          status: input.decision
        });
        const updatedToolCall = toolCall;

        if (!updatedApproval) {
          throw new ServiceError('Failed to persist approval decision.', 500);
        }

        sessionEventService.append({
          approvalId: updatedApproval.id,
          decision: input.decision,
          sessionId: approval.sessionId,
          type: 'approval.resolved'
        });

        return {
          approval: updatedApproval,
          toolCall: updatedToolCall
        };
      },
      async (ctx) => {
        await this.runtimeLifecycle.resumeApprovalRun({
          approval,
          decision: input.decision,
          toolCall: ctx.toolCall
        });
      }
    );

    return response;
  }
}

export const sessionPromptService = new SessionPromptService();
