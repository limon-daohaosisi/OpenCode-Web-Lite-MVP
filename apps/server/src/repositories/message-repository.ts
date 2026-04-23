import { messages } from '@opencode/orm';
import type { MessageRow, NewMessage } from '@opencode/orm';
import type { MessageDto, MessagePart } from '@opencode/shared';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { parseJsonValue, stringifyJsonValue } from '../lib/json.js';

type CreateMessageInput = Omit<NewMessage, 'contentJson'> & {
  content: MessagePart[];
};

function mapMessageRow(row: MessageRow): MessageDto {
  return {
    content: parseJsonValue<MessagePart[]>(row.contentJson, []),
    createdAt: row.createdAt,
    id: row.id,
    kind: 'message',
    role: row.role as MessageDto['role'],
    sessionId: row.sessionId
  };
}

export const messageRepository = {
  create(input: CreateMessageInput): MessageDto {
    const row = db
      .insert(messages)
      .values({
        ...input,
        contentJson: stringifyJsonValue(input.content)
      })
      .returning()
      .get();

    return mapMessageRow(row);
  },

  getById(id: string): MessageDto | null {
    const row = db.select().from(messages).where(eq(messages.id, id)).get();
    return row ? mapMessageRow(row) : null;
  },

  listBySession(sessionId: string): MessageDto[] {
    return db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt))
      .all()
      .map(mapMessageRow);
  },

  updateContent(id: string, content: MessagePart[]): MessageDto | null {
    const row = db
      .update(messages)
      .set({
        contentJson: stringifyJsonValue(content)
      })
      .where(eq(messages.id, id))
      .returning()
      .get();

    return row ? mapMessageRow(row) : null;
  }
};
