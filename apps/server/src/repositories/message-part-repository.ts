import { messageParts } from '@opencode/orm';
import type { MessagePartRow, NewMessagePart } from '@opencode/orm';
import type { MessagePart } from '@opencode/shared';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { parseJsonValue, stringifyJsonValue } from '../lib/json.js';

type CreateMessagePartInput = Omit<
  NewMessagePart,
  'dataJson' | 'orderIndex'
> & {
  data: MessagePart;
  order: number;
};

type UpdateMessagePartInput = {
  data: MessagePart;
  id: string;
  updatedAt: string;
};

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

export const messagePartRepository = {
  create(input: CreateMessagePartInput): MessagePart {
    const row = db
      .insert(messageParts)
      .values({
        ...input,
        dataJson: stringifyJsonValue(input.data),
        orderIndex: input.order
      })
      .returning()
      .get();

    return mapMessagePartRow(row);
  },

  getById(id: string): MessagePart | null {
    const row = db
      .select()
      .from(messageParts)
      .where(eq(messageParts.id, id))
      .get();
    return row ? mapMessagePartRow(row) : null;
  },

  listByMessage(messageId: string): MessagePart[] {
    return db
      .select()
      .from(messageParts)
      .where(eq(messageParts.messageId, messageId))
      .orderBy(asc(messageParts.orderIndex), asc(messageParts.id))
      .all()
      .map(mapMessagePartRow);
  },

  listBySession(sessionId: string): MessagePart[] {
    return db
      .select()
      .from(messageParts)
      .where(eq(messageParts.sessionId, sessionId))
      .orderBy(asc(messageParts.createdAt), asc(messageParts.id))
      .all()
      .map(mapMessagePartRow);
  },

  listBySessionMessage(sessionId: string, messageId: string): MessagePart[] {
    return db
      .select()
      .from(messageParts)
      .where(
        and(
          eq(messageParts.sessionId, sessionId),
          eq(messageParts.messageId, messageId)
        )
      )
      .orderBy(asc(messageParts.orderIndex), asc(messageParts.id))
      .all()
      .map(mapMessagePartRow);
  },

  update(input: UpdateMessagePartInput): MessagePart | null {
    const row = db
      .update(messageParts)
      .set({
        dataJson: stringifyJsonValue(input.data),
        updatedAt: input.updatedAt
      })
      .where(eq(messageParts.id, input.id))
      .returning()
      .get();

    return row ? mapMessagePartRow(row) : null;
  }
};
