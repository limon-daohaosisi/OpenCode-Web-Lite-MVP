import { z } from 'zod';

export const ApprovalsSchemas = {
  decision: {
    param: z.object({
      approvalId: z.string().trim().min(1)
    })
  }
};
