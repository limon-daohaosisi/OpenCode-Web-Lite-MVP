import {
  Lifecycle,
  RunLoop,
  SessionProcessor,
  type LifecycleDeps,
  type SessionProcessorDeps
} from '@opencode/agent';
import { ServiceError } from '../lib/service-error.js';
import { approvalRepository } from '../repositories/approval-repository.js';
import { toolCallRepository } from '../repositories/tool-call-repository.js';
import { workspaceRepository } from '../repositories/workspace-repository.js';
import { streamModelResponse } from '../services/ai/response-stream.js';
import { messageService } from '../services/session/message-service.js';
import { sessionEventService } from '../services/session/event-service.js';
import { sessionService } from '../services/session/service.js';

export function buildSessionProcessorDeps(
  overrides: Partial<SessionProcessorDeps> = {}
): SessionProcessorDeps {
  return {
    appendSessionEvent: (event) => sessionEventService.append(event),
    createApproval: (input) => approvalRepository.create(input),
    createMessage: (input) => messageService.createMessage(input),
    createToolCall: (input) => toolCallRepository.create(input),
    streamModelResponse,
    updateMessageContent: (id, content) =>
      messageService.updateMessageContent(id, content),
    updateSessionRuntimeState: (input) =>
      sessionService.updateSessionRuntimeState(input),
    updateToolCall: (input) => toolCallRepository.update(input),
    ...overrides
  };
}

export const sessionProcessor = new SessionProcessor(
  buildSessionProcessorDeps()
);
export const runLoop = new RunLoop(sessionProcessor);

function getWorkspaceRootPath(sessionId: string) {
  const session = sessionService.getSession(sessionId);

  if (!session) {
    throw new ServiceError(`Session not found: ${sessionId}`, 404);
  }

  const workspace = workspaceRepository.getById(session.workspaceId);

  if (!workspace) {
    throw new ServiceError(`Workspace not found for session ${sessionId}`, 404);
  }

  return workspace.rootPath;
}

export function buildLifecycleDeps(
  overrides: Partial<LifecycleDeps> = {}
): LifecycleDeps {
  return {
    appendSessionEvent: (event) => sessionEventService.append(event),
    getSession: (sessionId) => sessionService.getSession(sessionId),
    getWorkspaceRootPath,
    updateSessionRuntimeState: (input) =>
      sessionService.updateSessionRuntimeState(input),
    ...overrides,
    processor: overrides.processor ?? sessionProcessor
  };
}

export const lifecycle = new Lifecycle(runLoop, buildLifecycleDeps());
