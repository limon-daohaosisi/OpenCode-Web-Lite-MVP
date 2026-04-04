import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import * as schema from './schema.js';

export type SessionRow = InferSelectModel<typeof schema.sessions>;
export type NewSession = InferInsertModel<typeof schema.sessions>;

export type WorkspaceRow = InferSelectModel<typeof schema.workspaces>;
export type NewWorkspace = InferInsertModel<typeof schema.workspaces>;
