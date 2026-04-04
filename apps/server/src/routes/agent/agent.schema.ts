import { z } from 'zod';

export const AgentSchemas = {
  submitMessage: {
    json: z.object({
      content: z.string().trim().min(1)
    }),
    param: z.object({
      sessionId: z.string().trim().min(1)
    })
  },

  stream: {
    param: z.object({
      sessionId: z.string().trim().min(1)
    })
  }
};
