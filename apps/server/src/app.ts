import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { agentRoutes } from './routes/agent.js';
import { approvalRoutes } from './routes/approvals.js';
import { fileRoutes } from './routes/files.js';
import { sessionRoutes } from './routes/sessions.js';
import { workspaceRoutes } from './routes/workspaces.js';

const appInstance = new Hono()
  .use('/api/*', cors())
  .get('/health', (c) =>
    c.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  )
  .route('/api/workspaces', workspaceRoutes)
  .route('/api/files', fileRoutes)
  .route('/api/sessions', sessionRoutes)
  .route('/api/sessions', agentRoutes)
  .route('/api/approvals', approvalRoutes);

export const app = appInstance;
export type AppType = typeof appInstance;
