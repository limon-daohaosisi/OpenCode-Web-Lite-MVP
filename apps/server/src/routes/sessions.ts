import { Hono } from 'hono';
import { sessionService } from '../services/session-service.js';

export const sessionRoutes = new Hono();

sessionRoutes.get('/', (c) => {
  const workspaceId = c.req.query('workspaceId') ?? '';
  return c.json({ data: sessionService.listSessions(workspaceId) });
});

sessionRoutes.post('/', async (c) => {
  const payload = await c.req.json();
  const session = sessionService.createSession(
    payload.workspaceId,
    payload.title
  );
  return c.json({ data: session }, 201);
});

sessionRoutes.get('/:sessionId/messages', (c) => {
  const sessionId = c.req.param('sessionId');
  return c.json({ data: sessionService.listMessages(sessionId) });
});

sessionRoutes.post('/:sessionId/resume', (c) => {
  const sessionId = c.req.param('sessionId');
  return c.json({ data: sessionService.resumeSession(sessionId) });
});
