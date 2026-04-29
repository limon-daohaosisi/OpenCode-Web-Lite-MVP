import type {
  ApprovalDto,
  MessagePart,
  SessionDto,
  SessionEvent,
  SessionStatus,
  ToolCallDto
} from '@opencode/shared';
import { validateApprovalResume } from './approval-resume.js';
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

      const part = checkpoint?.partId
        ? this.deps.getMessagePart(checkpoint.partId)
        : null;
      const resumeValidation = validateApprovalResume({
        approval: input.approval,
        checkpoint,
        part,
        session,
        toolCall: input.toolCall
      });

      if (!resumeValidation.ok) {
        throw new Error(resumeValidation.reason);
      }

      await this.deps.toolExecutor.executeApprovedPart({
        decision: input.decision,
        part: resumeValidation.context.part,
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
