import { z } from 'zod';

export const sessionStatusSchema = z.enum([
  'planning',
  'executing',
  'waiting_approval',
  'blocked',
  'failed',
  'completed',
  'archived'
]);

export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const createWorkspaceInputSchema = z.object({
  rootPath: z.string().trim().min(1)
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceInputSchema>;

export const createSessionInputSchema = z.object({
  goalText: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  workspaceId: z.string().trim().min(1)
});

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

export const submitSessionMessageInputSchema = z.object({
  content: z.string().trim().min(1)
});

export type SubmitSessionMessageInput = z.infer<
  typeof submitSessionMessageInputSchema
>;
