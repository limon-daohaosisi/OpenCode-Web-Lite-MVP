import type {
  CreateSessionInput,
  ResumeSessionDto,
  SessionCheckpoint,
  SessionDto
} from '@opencode/shared';
import type { SessionStatus } from '@opencode/shared';
import { randomUUID } from 'node:crypto';
import { stringifyJsonValue } from '../../lib/json.js';
import { ServiceError } from '../../lib/service-error.js';
import { sessionRepository } from '../../repositories/session-repository.js';
import { workspaceRepository } from '../../repositories/workspace-repository.js';
import { approvalRepository } from '../../repositories/approval-repository.js';
import { toolCallRepository } from '../../repositories/tool-call-repository.js';
import { partService } from './part-service.js';

type UpdateSessionRuntimeStateInput = {
  currentTaskId?: null | string;
  lastCheckpoint?: null | SessionCheckpoint | string;
  lastErrorText?: null | string;
  sessionId: string;
  status?: SessionStatus;
};

function buildSessionTitle(goalText: string, title?: string): string {
  const trimmedTitle = title?.trim();

  if (trimmedTitle) {
    return trimmedTitle;
  }

  const firstLine = goalText
    .trim()
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0);

  const fallbackTitle = (firstLine ?? 'New session')
    .trim()
    .replace(/\s+/gu, ' ');
  return fallbackTitle.length <= 60
    ? fallbackTitle
    : `${fallbackTitle.slice(0, 57).trimEnd()}...`;
}

function serializeCheckpoint(
  checkpoint: null | SessionCheckpoint | string | undefined
) {
  if (checkpoint === undefined) {
    return undefined;
  }

  if (checkpoint === null) {
    return null;
  }

  return typeof checkpoint === 'string'
    ? checkpoint
    : stringifyJsonValue(checkpoint);
}

function parseSessionCheckpoint(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as SessionCheckpoint | undefined;
  } catch {
    return undefined;
  }
}

function validateResumeState(session: SessionDto): ResumeSessionDto {
  if (session.status !== 'waiting_approval') {
    return {
      canResume: true,
      checkpoint: session.lastCheckpointJson,
      session
    };
  }

  const checkpoint = parseSessionCheckpoint(session.lastCheckpointJson);

  if (
    checkpoint?.kind !== 'waiting_approval' ||
    !checkpoint.approvalId ||
    !checkpoint.messageId ||
    !checkpoint.partId ||
    !checkpoint.toolCallId ||
    !checkpoint.modelToolCallId
  ) {
    return {
      canResume: false,
      checkpoint: session.lastCheckpointJson,
      session
    };
  }

  const pendingApprovals = approvalRepository.listPendingBySession(session.id);
  const approval = approvalRepository.getById(checkpoint.approvalId);
  const toolCall = toolCallRepository.getById(checkpoint.toolCallId);
  const part = partService.getPart(checkpoint.partId);

  if (
    pendingApprovals.length !== 1 ||
    !approval ||
    approval.status !== 'pending' ||
    approval.id !== pendingApprovals[0]?.id ||
    approval.toolCallId !== checkpoint.toolCallId ||
    approval.sessionId !== session.id ||
    !toolCall ||
    toolCall.sessionId !== session.id ||
    toolCall.id !== approval.toolCallId ||
    !toolCall.requiresApproval ||
    (toolCall.status !== 'pending_approval' && toolCall.status !== 'pending') ||
    toolCall.messageId !== checkpoint.messageId ||
    toolCall.messagePartId !== checkpoint.partId ||
    toolCall.modelToolCallId !== checkpoint.modelToolCallId ||
    !part ||
    part.type !== 'tool' ||
    part.state.status !== 'pending' ||
    part.id !== checkpoint.partId ||
    part.messageId !== checkpoint.messageId ||
    part.toolCallId !== checkpoint.toolCallId ||
    part.modelToolCallId !== checkpoint.modelToolCallId ||
    part.sessionId !== session.id ||
    part.toolName !== toolCall.toolName ||
    part.toolName !== approval.kind
  ) {
    return {
      canResume: false,
      checkpoint: session.lastCheckpointJson,
      session
    };
  }

  return {
    canResume: true,
    checkpoint: session.lastCheckpointJson,
    session
  };
}

export const sessionService = {
  createSession(input: CreateSessionInput): SessionDto {
    const workspace = workspaceRepository.getById(input.workspaceId);

    if (!workspace) {
      throw new ServiceError(`Workspace not found: ${input.workspaceId}`, 404);
    }

    const now = new Date().toISOString();
    const session = sessionRepository.create({
      createdAt: now,
      goalText: input.goalText.trim(),
      id: randomUUID(),
      status: 'planning',
      title: buildSessionTitle(input.goalText, input.title),
      updatedAt: now,
      workspaceId: input.workspaceId
    });
    return session;
  },

  getSession(sessionId: string) {
    return sessionRepository.getById(sessionId);
  },

  listSessions(workspaceId: string) {
    return sessionRepository.listByWorkspace(workspaceId);
  },

  resumeSession(sessionId: string): ResumeSessionDto {
    const session = sessionRepository.getById(sessionId);

    if (!session) {
      return {
        canResume: false
      };
    }

    return validateResumeState(session);
  },

  updateSessionRuntimeState(
    input: UpdateSessionRuntimeStateInput
  ): SessionDto | null {
    return sessionRepository.updateResumeState({
      currentTaskId: input.currentTaskId,
      id: input.sessionId,
      lastCheckpointJson: serializeCheckpoint(input.lastCheckpoint),
      lastErrorText: input.lastErrorText,
      status: input.status,
      updatedAt: new Date().toISOString()
    });
  }
};
