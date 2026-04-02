import { Hono } from 'hono';
import * as handlers from './workspaces.handler.js';

export const workspaceRoutes = new Hono()
  .get('/', ...handlers.list)
  .post('/', ...handlers.create)
  .get('/:workspaceId/tree', ...handlers.getTree);
