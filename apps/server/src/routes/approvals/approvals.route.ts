import { Hono } from 'hono';
import * as handlers from './approvals.handler.js';

export const approvalRoutes = new Hono()
  .post('/:approvalId/approve', ...handlers.approve)
  .post('/:approvalId/reject', ...handlers.reject);
