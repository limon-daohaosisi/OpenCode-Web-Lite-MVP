import { submitSessionMessageInputSchema } from '@opencode/shared';
import { z } from 'zod';

export const AgentSchemas = {
  submitMessage: {
    json: submitSessionMessageInputSchema,
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
