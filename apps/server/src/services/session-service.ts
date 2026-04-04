import { randomUUID } from 'node:crypto';
import type {
  CreateSessionInput,
  MessageDto,
  ResumeSessionDto,
  SessionDto
} from '@opencode/shared';
import { sessionRepository } from '../repositories/session-repository.js';
import { workspaceRepository } from '../repositories/workspace-repository.js';
import { ServiceError } from './service-error.js';

const messages = new Map<string, MessageDto[]>();

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

export function buildAssistantMessage(
  sessionId: string,
  content: string
): MessageDto {
  return {
    content: [{ text: content, type: 'text' }],
    createdAt: new Date().toISOString(),
    id: `msg-${Date.now()}`,
    kind: 'message',
    role: 'assistant',
    sessionId
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

    messages.set(session.id, []);
    return session;
  },

  getSession(sessionId: string) {
    return sessionRepository.getById(sessionId);
  },

  listMessages(sessionId: string) {
    return messages.get(sessionId) ?? [];
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

    return {
      canResume: true,
      checkpoint: session.lastCheckpointJson,
      session
    };
  }
};
