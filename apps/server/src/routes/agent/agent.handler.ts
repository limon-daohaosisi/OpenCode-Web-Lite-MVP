import { streamSSE } from 'hono/streaming';
import { AgentLoop } from '../../agent/loop.js';
import { appFactory } from '../../lib/factory.js';
import { createValidator } from '../../lib/validator.js';
import { sessionService } from '../../services/session-service.js';
import { AgentSchemas } from './agent.schema.js';

const agentLoop = new AgentLoop();

export const submitMessage = appFactory.createHandlers(
  createValidator.param(AgentSchemas.submitMessage.param),
  createValidator.json(AgentSchemas.submitMessage.json),
  async (c) => {
    const { sessionId } = c.req.valid('param');
    const payload = c.req.valid('json');
    const assistantMessage = await agentLoop.submitUserMessage({
      content: payload.content,
      sessionId
    });

    return c.json({ data: assistantMessage }, 202);
  }
);

export const stream = appFactory.createHandlers(
  createValidator.param(AgentSchemas.stream.param),
  (c) => {
    const { sessionId } = c.req.valid('param');
    const session = sessionService.getSession(sessionId);

    return streamSSE(c, async (streamWriter) => {
      await streamWriter.writeSSE({
        data: JSON.stringify({
          sessionId,
          timestamp: new Date().toISOString(),
          type: 'session.updated'
        }),
        event: 'session.updated'
      });

      await streamWriter.writeSSE({
        data: JSON.stringify({
          message: `Connected to ${session?.title ?? 'unknown session'}`,
          sessionId,
          type: 'message.delta'
        }),
        event: 'message.delta'
      });
    });
  }
);
