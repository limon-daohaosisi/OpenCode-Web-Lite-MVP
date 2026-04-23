import { randomUUID } from 'node:crypto';
import type { MessageDto, MessagePart } from '@opencode/shared';
import { ServiceError } from '../../lib/service-error.js';
import { messageRepository } from '../../repositories/message-repository.js';
import { sessionRepository } from '../../repositories/session-repository.js';

type CreateMessageInput = {
  content: MessagePart[];
  createdAt?: string;
  id?: string;
  role: MessageDto['role'];
  sessionId: string;
  taskId?: string;
};

export const messageService = {
  createMessage(input: CreateMessageInput): MessageDto {
    const session = sessionRepository.getById(input.sessionId);

    if (!session) {
      throw new ServiceError(`Session not found: ${input.sessionId}`, 404);
    }

    return messageRepository.create({
      content: input.content,
      createdAt: input.createdAt ?? new Date().toISOString(),
      id: input.id ?? randomUUID(),
      role: input.role,
      sessionId: input.sessionId,
      taskId: input.taskId ?? null
    });
  },

  listMessages(sessionId: string) {
    return messageRepository.listBySession(sessionId);
  },

  updateMessageContent(id: string, content: MessagePart[]) {
    return messageRepository.updateContent(id, content);
  }
};
