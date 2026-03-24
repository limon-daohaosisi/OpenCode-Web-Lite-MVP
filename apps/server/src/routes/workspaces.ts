import { Hono } from 'hono';
import { workspaceService } from '../services/workspace-service.js';

export const workspaceRoutes = new Hono();

workspaceRoutes.get('/', (c) =>
  c.json({ data: workspaceService.listWorkspaces() })
);

workspaceRoutes.post('/', async (c) => {
  const payload = await c.req.json();
  const workspace = workspaceService.createWorkspace(payload.rootPath);

  return c.json({ data: workspace }, 201);
});

workspaceRoutes.get('/:workspaceId/tree', (c) => {
  const workspaceId = c.req.param('workspaceId');
  return c.json({ data: workspaceService.getTree(workspaceId) });
});
