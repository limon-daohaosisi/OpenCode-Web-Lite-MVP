import { Hono } from 'hono';
import * as handlers from './agent.handler.js';

export const agentRoutes = new Hono()
  .post('/:sessionId/messages', ...handlers.submitMessage)
  .get('/:sessionId/stream', ...handlers.stream);
