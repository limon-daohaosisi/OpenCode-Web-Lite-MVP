import { randomUUID } from 'node:crypto';
import { messageParts, toolCalls } from '@opencode/orm';
import type { MessagePartRow, ToolCallRow } from '@opencode/orm';
import type {
  CreateMessagePartInput,
  MessagePart,
  ToolCallDto,
  ToolCallStatus
} from '@opencode/shared';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { parseJsonValue, stringifyJsonValue } from '../../lib/json.js';
import { messagePartRepository } from '../../repositories/message-part-repository.js';
import { messageRepository } from '../../repositories/message-repository.js';
import { ServiceError } from '../../lib/service-error.js';

type UpdateToolPartWithToolCallInput = {
  part: Extract<MessagePart, { type: 'tool' }>;
  toolCall: {
    completedAt?: null | string;
    errorText?: null | string;
    id: string;
    result?: null | Record<string, unknown>;
    startedAt?: null | string;
    status: ToolCallStatus;
    updatedAt?: string;
  };
};

type CreateToolPartWithToolCallInput = {
  part: Extract<MessagePart, { type: 'tool' }>;
  toolCall: {
    createdAt: string;
    id: string;
    input: Record<string, unknown>;
    messageId: null | string;
    messagePartId: string;
    modelToolCallId: string;
    providerMetadata?: Record<string, unknown>;
    requiresApproval: boolean;
    sessionId: string;
    startedAt?: string;
    status: ToolCallStatus;
    taskId: null | string;
    toolName: ToolCallDto['toolName'];
    updatedAt: string;
  };
};

function mapNullableRecord(value: null | string) {
  return value ? parseJsonValue<Record<string, unknown>>(value, {}) : undefined;
}

function mapNullableString(value: null | string) {
  return value ?? undefined;
}

function mapMessagePartRow(row: MessagePartRow): MessagePart {
  return parseJsonValue<MessagePart>(row.dataJson, {
    createdAt: row.createdAt,
    id: row.id,
    messageId: row.messageId,
    order: row.orderIndex,
    sessionId: row.sessionId,
    text: '',
    type: 'text',
    updatedAt: row.updatedAt
  });
}

function mapToolCallRow(row: ToolCallRow): ToolCallDto {
  return {
    createdAt: row.createdAt,
    errorText: mapNullableString(row.errorText),
    id: row.id,
    input: parseJsonValue<Record<string, unknown>>(row.inputJson, {}),
    messageId: mapNullableString(row.messageId),
    messagePartId: mapNullableString(row.messagePartId),
    modelToolCallId: mapNullableString(row.modelToolCallId),
    providerMetadata: mapNullableRecord(row.providerMetadataJson),
    requiresApproval: row.requiresApproval === 1,
    result: mapNullableRecord(row.resultJson),
    sessionId: row.sessionId,
    status: row.status as ToolCallStatus,
    toolName: row.toolName as ToolCallDto['toolName'],
    updatedAt: row.updatedAt
  };
}

function normalizePart(input: CreateMessagePartInput, index = 0): MessagePart {
  const now = new Date().toISOString();

  if (!input.messageId || !input.sessionId) {
    throw new ServiceError('Message part is missing message/session ids.', 500);
  }

  return {
    ...input,
    createdAt: input.createdAt ?? now,
    id: input.id ?? randomUUID(),
    messageId: input.messageId,
    order: input.order ?? index,
    sessionId: input.sessionId,
    updatedAt: input.updatedAt ?? input.createdAt ?? now
  } as MessagePart;
}

function assertToolPartMatchesToolCall(input: {
  part: Extract<MessagePart, { type: 'tool' }>;
  toolCall: {
    id: string;
    messageId?: null | string;
    messagePartId?: null | string;
    modelToolCallId?: null | string;
    sessionId?: string;
    toolName?: string;
  };
}) {
  if (input.part.toolCallId !== input.toolCall.id) {
    throw new ServiceError('ToolPart/tool_calls id mismatch.', 500);
  }

  if (
    input.toolCall.messagePartId !== undefined &&
    input.toolCall.messagePartId !== input.part.id
  ) {
    throw new ServiceError('ToolPart/tool_calls part id mismatch.', 500);
  }

  if (
    input.toolCall.messageId !== undefined &&
    input.toolCall.messageId !== input.part.messageId
  ) {
    throw new ServiceError('ToolPart/tool_calls message id mismatch.', 500);
  }

  if (
    input.toolCall.modelToolCallId !== undefined &&
    input.toolCall.modelToolCallId !== input.part.modelToolCallId
  ) {
    throw new ServiceError(
      'ToolPart/tool_calls model tool call id mismatch.',
      500
    );
  }

  if (
    input.toolCall.sessionId !== undefined &&
    input.toolCall.sessionId !== input.part.sessionId
  ) {
    throw new ServiceError('ToolPart/tool_calls session id mismatch.', 500);
  }

  if (
    input.toolCall.toolName !== undefined &&
    input.toolCall.toolName !== input.part.toolName
  ) {
    throw new ServiceError('ToolPart/tool_calls name mismatch.', 500);
  }
}

function assertToolPartStateMatchesToolCallStatus(input: {
  part: Extract<MessagePart, { type: 'tool' }>;
  status: ToolCallStatus;
}) {
  switch (input.part.state.status) {
    case 'pending':
      if (input.status === 'pending' || input.status === 'pending_approval') {
        return;
      }
      break;
    case 'running':
      if (input.status === 'running') {
        return;
      }
      break;
    case 'completed':
      if (input.status === 'completed') {
        return;
      }
      break;
    case 'error':
      if (input.status === 'failed' || input.status === 'rejected') {
        return;
      }
      break;
  }

  throw new ServiceError('ToolPart/tool_calls status mismatch.', 500);
}

export const partService = {
  appendPart(input: CreateMessagePartInput): MessagePart {
    if (!input.messageId) {
      throw new ServiceError('Message part is missing message id.', 500);
    }

    const message = messageRepository.getById(input.messageId);

    if (!message) {
      throw new ServiceError(`Message not found: ${input.messageId}`, 404);
    }

    const part = normalizePart(input);

    return messagePartRepository.create({
      createdAt: part.createdAt,
      data: part,
      id: part.id,
      messageId: part.messageId,
      order: part.order,
      sessionId: part.sessionId,
      type: part.type,
      updatedAt: part.updatedAt
    });
  },

  getPart(partId: string) {
    return messagePartRepository.getById(partId);
  },

  listParts(messageId: string) {
    return messagePartRepository.listByMessage(messageId);
  },

  updatePart(part: MessagePart): MessagePart | null {
    const updatedAt = new Date().toISOString();

    return messagePartRepository.update({
      data: {
        ...part,
        updatedAt
      } as MessagePart,
      id: part.id,
      updatedAt
    });
  },

  createToolPartWithToolCall(input: CreateToolPartWithToolCallInput): {
    part: Extract<MessagePart, { type: 'tool' }>;
    toolCall: ToolCallDto;
  } {
    assertToolPartMatchesToolCall(input);
    assertToolPartStateMatchesToolCallStatus({
      part: input.part,
      status: input.toolCall.status
    });

    return db.transaction((tx) => {
      const partRow = tx
        .insert(messageParts)
        .values({
          createdAt: input.part.createdAt,
          dataJson: stringifyJsonValue(input.part),
          id: input.part.id,
          messageId: input.part.messageId,
          orderIndex: input.part.order,
          sessionId: input.part.sessionId,
          type: input.part.type,
          updatedAt: input.part.updatedAt
        })
        .returning()
        .get();
      const toolCallRow = tx
        .insert(toolCalls)
        .values({
          completedAt: null,
          createdAt: input.toolCall.createdAt,
          errorText: null,
          id: input.toolCall.id,
          inputJson: stringifyJsonValue(input.toolCall.input),
          messageId: input.toolCall.messageId,
          messagePartId: input.toolCall.messagePartId,
          modelToolCallId: input.toolCall.modelToolCallId,
          providerMetadataJson: input.toolCall.providerMetadata
            ? stringifyJsonValue(input.toolCall.providerMetadata)
            : null,
          requiresApproval: input.toolCall.requiresApproval ? 1 : 0,
          resultJson: null,
          sessionId: input.toolCall.sessionId,
          startedAt: input.toolCall.startedAt,
          status: input.toolCall.status,
          taskId: input.toolCall.taskId,
          toolName: input.toolCall.toolName,
          updatedAt: input.toolCall.updatedAt
        })
        .returning()
        .get();

      const part = mapMessagePartRow(partRow);

      if (part.type !== 'tool') {
        throw new ServiceError('Created part is not a ToolPart.', 500);
      }

      return {
        part,
        toolCall: mapToolCallRow(toolCallRow)
      };
    });
  },

  updateToolPartWithToolCall(input: UpdateToolPartWithToolCallInput): {
    part: Extract<MessagePart, { type: 'tool' }>;
    toolCall: ToolCallDto;
  } {
    assertToolPartMatchesToolCall(input);
    assertToolPartStateMatchesToolCallStatus({
      part: input.part,
      status: input.toolCall.status
    });

    const updatedAt = input.toolCall.updatedAt ?? new Date().toISOString();
    const updatedPart: Extract<MessagePart, { type: 'tool' }> = {
      ...input.part,
      updatedAt
    };

    return db.transaction((tx) => {
      const existingPartRow = tx
        .select()
        .from(messageParts)
        .where(eq(messageParts.id, updatedPart.id))
        .get();
      const existingToolCallRow = tx
        .select()
        .from(toolCalls)
        .where(eq(toolCalls.id, input.toolCall.id))
        .get();

      if (!existingPartRow || !existingToolCallRow) {
        throw new ServiceError('Tool state row not found.', 404);
      }

      const existingPart = mapMessagePartRow(existingPartRow);

      if (existingPart.type !== 'tool') {
        throw new ServiceError('Existing part is not a ToolPart.', 500);
      }

      assertToolPartMatchesToolCall({
        part: existingPart,
        toolCall: {
          id: existingToolCallRow.id,
          messageId: existingToolCallRow.messageId,
          messagePartId: existingToolCallRow.messagePartId,
          modelToolCallId: existingToolCallRow.modelToolCallId,
          sessionId: existingToolCallRow.sessionId,
          toolName: existingToolCallRow.toolName
        }
      });

      assertToolPartMatchesToolCall({
        part: updatedPart,
        toolCall: {
          id: existingToolCallRow.id,
          messageId: existingToolCallRow.messageId,
          messagePartId: existingToolCallRow.messagePartId,
          modelToolCallId: existingToolCallRow.modelToolCallId,
          sessionId: existingToolCallRow.sessionId,
          toolName: existingToolCallRow.toolName
        }
      });

      const partRow = tx
        .update(messageParts)
        .set({
          dataJson: stringifyJsonValue(updatedPart),
          updatedAt
        })
        .where(eq(messageParts.id, updatedPart.id))
        .returning()
        .get();

      const toolCallRow = tx
        .update(toolCalls)
        .set({
          completedAt: input.toolCall.completedAt,
          errorText: input.toolCall.errorText,
          resultJson:
            input.toolCall.result === undefined
              ? undefined
              : input.toolCall.result === null
                ? null
                : stringifyJsonValue(input.toolCall.result),
          startedAt: input.toolCall.startedAt,
          status: input.toolCall.status,
          updatedAt
        })
        .where(eq(toolCalls.id, input.toolCall.id))
        .returning()
        .get();

      if (!partRow || !toolCallRow) {
        throw new ServiceError('Failed to update tool state transaction.', 500);
      }

      const part = mapMessagePartRow(partRow);

      if (part.type !== 'tool') {
        throw new ServiceError('Updated part is not a ToolPart.', 500);
      }

      return {
        part,
        toolCall: mapToolCallRow(toolCallRow)
      };
    });
  }
};
