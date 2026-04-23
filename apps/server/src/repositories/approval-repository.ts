import { approvals } from '@opencode/orm';
import type { ApprovalRow, NewApproval } from '@opencode/orm';
import type { ApprovalDto, ApprovalStatus } from '@opencode/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { parseJsonValue, stringifyJsonValue } from '../lib/json.js';

type CreateApprovalInput = Omit<NewApproval, 'payloadJson'> & {
  payload: Record<string, unknown>;
};

type UpdateApprovalDecisionInput = {
  decidedAt: string;
  id: string;
  status: ApprovalStatus;
};

function mapNullableString(value: null | string) {
  return value ?? undefined;
}

function mapApprovalRow(row: ApprovalRow): ApprovalDto {
  return {
    createdAt: row.createdAt,
    decidedAt: mapNullableString(row.decidedAt),
    id: row.id,
    kind: row.kind as ApprovalDto['kind'],
    payload: parseJsonValue<Record<string, unknown>>(row.payloadJson, {}),
    sessionId: row.sessionId,
    status: row.status as ApprovalStatus,
    toolCallId: row.toolCallId
  };
}

export const approvalRepository = {
  create(input: CreateApprovalInput): ApprovalDto {
    const row = db
      .insert(approvals)
      .values({
        ...input,
        payloadJson: stringifyJsonValue(input.payload)
      })
      .returning()
      .get();

    return mapApprovalRow(row);
  },

  getById(id: string): ApprovalDto | null {
    const row = db.select().from(approvals).where(eq(approvals.id, id)).get();
    return row ? mapApprovalRow(row) : null;
  },

  updateDecision(input: UpdateApprovalDecisionInput): ApprovalDto | null {
    const row = db
      .update(approvals)
      .set({
        decidedAt: input.decidedAt,
        status: input.status
      })
      .where(eq(approvals.id, input.id))
      .returning()
      .get();

    return row ? mapApprovalRow(row) : null;
  }
};
