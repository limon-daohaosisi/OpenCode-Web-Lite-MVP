import { toolCalls } from '@opencode/orm';
import type { NewToolCall, ToolCallRow } from '@opencode/orm';
import type { ToolCallDto, ToolCallStatus } from '@opencode/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { parseJsonValue, stringifyJsonValue } from '../lib/json.js';

type CreateToolCallInput = Omit<
  NewToolCall,
  'inputJson' | 'requiresApproval'
> & {
  input: Record<string, unknown>;
  requiresApproval: boolean;
};

type UpdateToolCallInput = {
  completedAt?: null | string;
  errorText?: null | string;
  id: string;
  result?: null | Record<string, unknown>;
  startedAt?: null | string;
  status: ToolCallStatus;
  updatedAt: string;
};

function mapNullableRecord(value: null | string) {
  return value ? parseJsonValue<Record<string, unknown>>(value, {}) : undefined;
}

function mapNullableString(value: null | string) {
  return value ?? undefined;
}

function mapToolCallRow(row: ToolCallRow): ToolCallDto {
  return {
    createdAt: row.createdAt,
    errorText: mapNullableString(row.errorText),
    id: row.id,
    input: parseJsonValue<Record<string, unknown>>(row.inputJson, {}),
    messageId: mapNullableString(row.messageId),
    result: mapNullableRecord(row.resultJson),
    sessionId: row.sessionId,
    status: row.status as ToolCallStatus,
    toolName: row.toolName as ToolCallDto['toolName'],
    updatedAt: row.updatedAt
  };
}

export const toolCallRepository = {
  create(input: CreateToolCallInput): ToolCallDto {
    const row = db
      .insert(toolCalls)
      .values({
        ...input,
        inputJson: stringifyJsonValue(input.input),
        requiresApproval: input.requiresApproval ? 1 : 0
      })
      .returning()
      .get();

    return mapToolCallRow(row);
  },

  getById(id: string): ToolCallDto | null {
    const row = db.select().from(toolCalls).where(eq(toolCalls.id, id)).get();
    return row ? mapToolCallRow(row) : null;
  },

  update(input: UpdateToolCallInput): ToolCallDto | null {
    const row = db
      .update(toolCalls)
      .set({
        completedAt: input.completedAt,
        errorText: input.errorText,
        resultJson:
          input.result === undefined
            ? undefined
            : input.result === null
              ? null
              : stringifyJsonValue(input.result),
        startedAt: input.startedAt,
        status: input.status,
        updatedAt: input.updatedAt
      })
      .where(eq(toolCalls.id, input.id))
      .returning()
      .get();

    return row ? mapToolCallRow(row) : null;
  }
};
