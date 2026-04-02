import { createWorkspaceInputSchema } from '@opencode/shared';
import { z } from 'zod';

export const WorkspacesSchemas = {
  create: {
    json: createWorkspaceInputSchema
  },

  tree: {
    param: z.object({
      workspaceId: z.string().trim().min(1)
    })
  }
};
