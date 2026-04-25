import type {
  ApprovalDto,
  SessionDto,
  SessionEvent,
  SessionStatus,
  ToolCallDto
} from '@opencode/shared';
import {
  getCheckpointCallId,
  getCheckpointPreviousResponseId,
  parseSessionCheckpoint
} from './checkpoint.js';
import type { RunLoop, RunLoopResult } from './run-loop.js';
import type { SessionProcessor } from './session-processor.js';

type UpdateSessionRuntimeStateInput = {
  currentTaskId?: null | string;
  lastCheckpoint?: null | string;
  lastErrorText?: null | string;
  sessionId: string;
  status?: SessionStatus;
};

export type LifecycleDeps = {
  appendSessionEvent(event: SessionEvent): unknown;
  getSession(sessionId: string): SessionDto | null;
  getWorkspaceRootPath(sessionId: string): string;
  processor: Pick<SessionProcessor, 'executeApprovedToolCall'>;
  updateSessionRuntimeState(
    input: UpdateSessionRuntimeStateInput
  ): SessionDto | null;
};

type StartPromptRunInput = {
  input: string;
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
      const previousResponseId = getCheckpointPreviousResponseId(checkpoint);
      const callId = getCheckpointCallId(checkpoint);

      if (!previousResponseId || !callId) {
        throw new Error(
          'Session checkpoint is missing OpenAI continuation data.'
        );
      }

      const workspaceRoot = this.deps.getWorkspaceRootPath(
        input.approval.sessionId
      );
      const functionCallOutput =
        await this.deps.processor.executeApprovedToolCall({
          callId,
          decision: input.decision,
          sessionId: input.approval.sessionId,
          toolCall: input.toolCall,
          workspaceRoot
        });

      const result = await this.loop.run({
        input: [functionCallOutput],
        previousResponseId,
        sessionId: input.approval.sessionId,
        workspaceRoot
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

      const checkpoint = parseSessionCheckpoint(session.lastCheckpointJson);
      const result = await this.loop.run({
        input: input.input,
        previousResponseId: getCheckpointPreviousResponseId(checkpoint),
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
