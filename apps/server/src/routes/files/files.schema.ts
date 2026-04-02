import { z } from 'zod';

export const FilesSchemas = {
  content: {
    query: z.object({
      path: z.string().trim().min(1),
      workspaceRoot: z.string().trim().min(1).optional()
    })
  },

  search: {
    query: z.object({
      q: z.string().trim().optional()
    })
  }
};
