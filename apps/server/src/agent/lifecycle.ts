import type { ApprovalDto, ToolCallDto, ToolName } from '@opencode/shared';
import { workspaceRepository } from '../repositories/workspace-repository.js';
import { ServiceError } from '../lib/service-error.js';
import { messageService } from '../services/session/message-service.js';
import { sessionEventService } from '../services/session/session-event-service.js';
import { sessionService } from '../services/session/session-service.js';
import {
  getCheckpointCallId,
  getCheckpointPreviousResponseId,
  parseSessionCheckpoint
} from './checkpoint.js';
import { runLoop, type RunLoop, type RunLoopResult } from './run-loop.js';
import { buildFunctionCallOutput } from './session-processor.js';
import { executeApprovedTool } from './tool-executor.js';
import { toolCallRepository } from '../repositories/tool-call-repository.js';

type LifecycleDeps = {
  executeApprovedTool?: typeof executeApprovedTool;
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
    private readonly loop: RunLoop = runLoop,
    private readonly deps: LifecycleDeps = {}
  ) {}

  async resumeApprovalRun(
    input: ResumeApprovalRunInput
  ): Promise<LifecycleResult> {
    try {
      const session = sessionService.getSession(input.approval.sessionId);

      if (!session) {
        throw new ServiceError(
          `Session not found: ${input.approval.sessionId}`,
          404
        );
      }

      const checkpoint = parseSessionCheckpoint(session.lastCheckpointJson);
      const previousResponseId = getCheckpointPreviousResponseId(checkpoint);
      const callId = getCheckpointCallId(checkpoint);

      if (!previousResponseId || !callId) {
        throw new Error(
          'Session checkpoint is missing OpenAI continuation data.'
        );
      }

      const workspaceRoot = this.getWorkspaceRootPath(input.approval.sessionId);
      const payload = await this.resolveApprovalPayload({
        decision: input.decision,
        sessionId: input.approval.sessionId,
        toolCall: input.toolCall,
        workspaceRoot
      });
      const result = await this.loop.run({
        input: [buildFunctionCallOutput(callId, payload)],
        previousResponseId,
        sessionId: input.approval.sessionId,
        workspaceRoot
      });

      return {
        reason: result.kind
      };
    } catch (error) {
      return this.handleFailure(input.approval.sessionId, error);
    }
  }

  async startPromptRun(input: StartPromptRunInput): Promise<LifecycleResult> {
    try {
      const session = sessionService.getSession(input.sessionId);

      if (!session) {
        throw new ServiceError(`Session not found: ${input.sessionId}`, 404);
      }

      const checkpoint = parseSessionCheckpoint(session.lastCheckpointJson);
      const result = await this.loop.run({
        input: input.input,
        previousResponseId: getCheckpointPreviousResponseId(checkpoint),
        sessionId: input.sessionId,
        workspaceRoot: this.getWorkspaceRootPath(input.sessionId)
      });

      return {
        reason: result.kind
      };
    } catch (error) {
      return this.handleFailure(input.sessionId, error);
    }
  }

  private async createToolResultMessage(input: {
    payload: Record<string, unknown>;
    sessionId: string;
    toolName: ToolName;
  }) {
    const message = messageService.createMessage({
      content: [
        {
          content: input.payload,
          toolName: input.toolName,
          type: 'tool_result'
        }
      ],
      role: 'tool',
      sessionId: input.sessionId
    });

    sessionEventService.append({
      message,
      sessionId: input.sessionId,
      type: 'message.created'
    });

    return message;
  }

  private getWorkspaceRootPath(sessionId: string) {
    const session = sessionService.getSession(sessionId);

    if (!session) {
      throw new ServiceError(`Session not found: ${sessionId}`, 404);
    }

    const workspace = workspaceRepository.getById(session.workspaceId);

    if (!workspace) {
      throw new ServiceError(
        `Workspace not found for session ${sessionId}`,
        404
      );
    }

    return workspace.rootPath;
  }

  private handleFailure(sessionId: string, error: unknown): LifecycleResult {
    const errorMessage = formatError(error);
    const updatedSession = sessionService.updateSessionRuntimeState({
      lastErrorText: errorMessage,
      sessionId,
      status: 'failed'
    });

    sessionEventService.append({
      error: errorMessage,
      sessionId,
      type: 'session.failed'
    });

    if (updatedSession) {
      sessionEventService.append({
        sessionId: updatedSession.id,
        type: 'session.updated',
        updatedAt: updatedSession.updatedAt
      });
    }

    return {
      reason: 'failed'
    };
  }

  private async resolveApprovalPayload(input: {
    decision: 'approved' | 'rejected';
    sessionId: string;
    toolCall: ToolCallDto;
    workspaceRoot: string;
  }) {
    const now = new Date().toISOString();

    if (input.decision === 'approved') {
      toolCallRepository.update({
        id: input.toolCall.id,
        startedAt: now,
        status: 'running',
        updatedAt: now
      });

      sessionEventService.append({
        sessionId: input.sessionId,
        toolCallId: input.toolCall.id,
        type: 'tool.running'
      });

      try {
        const result = await this.executeApprovedTool(
          input.toolCall.toolName as Extract<
            ToolName,
            'run_command' | 'write_file'
          >,
          input.toolCall.input,
          input.workspaceRoot
        );
        const completedAt = new Date().toISOString();
        const completedToolCall = toolCallRepository.update({
          completedAt,
          id: input.toolCall.id,
          result,
          startedAt: now,
          status: 'completed',
          updatedAt: completedAt
        });

        await this.createToolResultMessage({
          payload: result,
          sessionId: input.sessionId,
          toolName: input.toolCall.toolName as ToolName
        });

        if (completedToolCall) {
          sessionEventService.append({
            sessionId: input.sessionId,
            toolCall: completedToolCall,
            type: 'tool.completed'
          });
        }

        return result;
      } catch (error) {
        const errorMessage = formatError(error);
        const payload = {
          error: errorMessage,
          ok: false
        };
        const completedAt = new Date().toISOString();

        toolCallRepository.update({
          completedAt,
          errorText: errorMessage,
          id: input.toolCall.id,
          result: payload,
          startedAt: now,
          status: 'failed',
          updatedAt: completedAt
        });

        await this.createToolResultMessage({
          payload,
          sessionId: input.sessionId,
          toolName: input.toolCall.toolName as ToolName
        });

        sessionEventService.append({
          error: errorMessage,
          sessionId: input.sessionId,
          toolCallId: input.toolCall.id,
          type: 'tool.failed'
        });

        return payload;
      }
    }

    const payload = {
      error: 'Approval rejected by user',
      ok: false,
      rejected: true
    };

    await this.createToolResultMessage({
      payload,
      sessionId: input.sessionId,
      toolName: input.toolCall.toolName as ToolName
    });

    sessionEventService.append({
      error: 'Approval rejected by user',
      sessionId: input.sessionId,
      toolCallId: input.toolCall.id,
      type: 'tool.failed'
    });

    return payload;
  }

  private executeApprovedTool(
    toolName: Extract<ToolName, 'run_command' | 'write_file'>,
    rawInput: Record<string, unknown>,
    workspaceRoot: string
  ) {
    return (this.deps.executeApprovedTool ?? executeApprovedTool)(
      toolName,
      rawInput,
      workspaceRoot
    );
  }
}

export const lifecycle = new Lifecycle();
