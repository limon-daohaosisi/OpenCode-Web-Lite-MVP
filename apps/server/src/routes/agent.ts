import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { AgentLoop } from '../agent/loop.js';
import { sessionService } from '../services/session-service.js';

const agentLoop = new AgentLoop();

export const agentRoutes = new Hono();

agentRoutes.post('/:sessionId/messages', async (c) => {
  const sessionId = c.req.param('sessionId');
  const payload = await c.req.json();

  const assistantMessage = await agentLoop.submitUserMessage({
    content: payload.content,
    sessionId
  });

  return c.json({ data: assistantMessage }, 202);
});

agentRoutes.get('/:sessionId/stream', (c) => {
  const sessionId = c.req.param('sessionId');
  const session = sessionService.getSession(sessionId);

  return streamSSE(c, async (stream) => {
    await stream.writeSSE({
      data: JSON.stringify({
        sessionId,
        timestamp: new Date().toISOString(),
        type: 'session.updated'
      }),
      event: 'session.updated'
    });

    await stream.writeSSE({
      data: JSON.stringify({
        message: `Connected to ${session?.title ?? 'unknown session'}`,
        sessionId,
        type: 'message.delta'
      }),
      event: 'message.delta'
    });
  });
});
