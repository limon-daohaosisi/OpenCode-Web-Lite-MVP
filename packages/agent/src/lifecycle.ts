import type {
  ApprovalDto,
  MessagePart,
  SessionDto,
  SessionEvent,
  SessionStatus,
  ToolCallDto
} from '@opencode/shared';
import { parseSessionCheckpoint } from './checkpoint.js';
import type { RunLoop, RunLoopResult } from './run-loop.js';
import type { ToolExecutor } from './tool-executor.js';

type UpdateSessionRuntimeStateInput = {
  currentTaskId?: null | string;
  lastCheckpoint?: null | string;
  lastErrorText?: null | string;
  sessionId: string;
  status?: SessionStatus;
};

export type LifecycleDeps = {
  appendSessionEvent(event: SessionEvent): unknown;
  getMessagePart(partId: string): MessagePart | null;
  getSession(sessionId: string): SessionDto | null;
  getWorkspaceRootPath(sessionId: string): string;
  toolExecutor: Pick<ToolExecutor, 'executeApprovedPart'>;
  updateSessionRuntimeState(
    input: UpdateSessionRuntimeStateInput
  ): SessionDto | null;
};

type StartPromptRunInput = {
  sessionId: string;
};

type ResumeApprovalRunInput = {
  approval: ApprovalDto;
  decision: 'approved' | 'rejected';
  toolCall: ToolCallDto;
};

export type LifecycleTerminalReason = RunLoopResult['kind'] | 'failed';

export type LifecycleResult = {
  reason: LifecycleTerminalReason;
};

function formatError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown runtime error.';
}

function isPendingApprovalToolCall(toolCall: ToolCallDto) {
  return (
    toolCall.status === 'pending_approval' || toolCall.status === 'pending'
  );
}

export class Lifecycle {
  constructor(
    private readonly loop: Pick<RunLoop, 'run'>,
    private readonly deps: LifecycleDeps
  ) {}

  async resumeApprovalRun(
    input: ResumeApprovalRunInput
  ): Promise<LifecycleResult> {
    try {
      const session = this.deps.getSession(input.approval.sessionId);

      if (!session) {
        throw new Error(`Session not found: ${input.approval.sessionId}`);
      }

      const checkpoint = parseSessionCheckpoint(session.lastCheckpointJson);

      if (session.status !== 'waiting_approval') {
        throw new Error('Session is not waiting for approval.');
      }

      if (input.approval.status !== 'pending') {
        throw new Error('Approval has already been decided.');
      }

      if (input.toolCall.sessionId !== input.approval.sessionId) {
        throw new Error('Approval and tool call belong to different sessions.');
      }

      if (input.toolCall.id !== input.approval.toolCallId) {
        throw new Error('Approval does not match tool call.');
      }

      if (!input.toolCall.requiresApproval) {
        throw new Error('Tool call does not require approval.');
      }

      if (!isPendingApprovalToolCall(input.toolCall)) {
        throw new Error('Tool call is no longer waiting for approval.');
      }

      if (
        checkpoint?.kind !== 'waiting_approval' ||
        checkpoint.approvalId !== input.approval.id ||
        !checkpoint.partId ||
        !checkpoint.messageId ||
        !checkpoint.modelToolCallId ||
        !checkpoint.toolCallId
      ) {
        throw new Error('Session checkpoint is missing approval resume data.');
      }

      const part = this.deps.getMessagePart(checkpoint.partId);

      if (!part || part.type !== 'tool') {
        throw new Error(`Pending ToolPart not found: ${checkpoint.partId}`);
      }

      if (
        part.messageId !== checkpoint.messageId ||
        part.modelToolCallId !== checkpoint.modelToolCallId ||
        part.toolCallId !== checkpoint.toolCallId ||
        part.id !== input.toolCall.messagePartId ||
        part.messageId !== input.toolCall.messageId ||
        part.modelToolCallId !== input.toolCall.modelToolCallId ||
        part.sessionId !== input.toolCall.sessionId ||
        part.toolName !== input.toolCall.toolName
      ) {
        throw new Error('Approval checkpoint does not match pending ToolPart.');
      }

      if (part.state.status !== 'pending') {
        throw new Error('Approval ToolPart is no longer pending.');
      }

      if (part.toolName !== input.approval.kind) {
        throw new Error('Approval kind does not match ToolPart.');
      }

      await this.deps.toolExecutor.executeApprovedPart({
        decision: input.decision,
        part,
        sessionId: input.approval.sessionId,
        workspaceRoot: this.deps.getWorkspaceRootPath(input.approval.sessionId)
      });

      this.deps.updateSessionRuntimeState({
        lastCheckpoint: null,
        lastErrorText: null,
        sessionId: input.approval.sessionId,
        status: 'executing'
      });

      const result = await this.loop.run({
        sessionId: input.approval.sessionId,
        workspaceRoot: this.deps.getWorkspaceRootPath(input.approval.sessionId)
      });

      return { reason: result.kind };
    } catch (error) {
      return this.handleFailure(input.approval.sessionId, error);
    }
  }

  async startPromptRun(input: StartPromptRunInput): Promise<LifecycleResult> {
    try {
      const session = this.deps.getSession(input.sessionId);

      if (!session) {
        throw new Error(`Session not found: ${input.sessionId}`);
      }

      const result = await this.loop.run({
        sessionId: input.sessionId,
        workspaceRoot: this.deps.getWorkspaceRootPath(input.sessionId)
      });

      return { reason: result.kind };
    } catch (error) {
      return this.handleFailure(input.sessionId, error);
    }
  }

  private handleFailure(sessionId: string, error: unknown): LifecycleResult {
    const errorMessage = formatError(error);
    const updatedSession = this.deps.updateSessionRuntimeState({
      lastErrorText: errorMessage,
      sessionId,
      status: 'failed'
    });

    this.deps.appendSessionEvent({
      error: errorMessage,
      sessionId,
      type: 'session.failed'
    });

    if (updatedSession) {
      this.deps.appendSessionEvent({
        sessionId: updatedSession.id,
        type: 'session.updated',
        updatedAt: updatedSession.updatedAt
      });
    }

    return { reason: 'failed' };
  }
}
