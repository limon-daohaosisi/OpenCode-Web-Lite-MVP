import { Hono } from 'hono';
import * as handlers from './sessions.handler.js';

export const sessionRoutes = new Hono()
  .get('/', ...handlers.list)
  .post('/', ...handlers.create)
  .get('/:sessionId', ...handlers.getById)
  .get('/:sessionId/messages', ...handlers.listMessages)
  .post('/:sessionId/resume', ...handlers.resume);
