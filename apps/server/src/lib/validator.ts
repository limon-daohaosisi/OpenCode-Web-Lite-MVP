import { zValidator } from '@hono/zod-validator';
import type { z } from 'zod';

export const createValidator = {
  json: <T extends z.ZodType>(schema: T) =>
    zValidator('json', schema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: 'Validation failed',
            issues: result.error.issues
          },
          400
        );
      }
    }),

  param: <T extends z.ZodType>(schema: T) =>
    zValidator('param', schema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: 'Validation failed',
            issues: result.error.issues
          },
          400
        );
      }
    }),

  query: <T extends z.ZodType>(schema: T) =>
    zValidator('query', schema, (result, c) => {
      if (!result.success) {
        return c.json(
          {
            error: 'Validation failed',
            issues: result.error.issues
          },
          400
        );
      }
    })
};
