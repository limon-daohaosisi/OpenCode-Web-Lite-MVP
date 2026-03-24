import { Hono } from 'hono';
import { readFileTool } from '../tools/read-file.js';

export const fileRoutes = new Hono();

fileRoutes.get('/content', async (c) => {
  const workspaceRoot = c.req.query('workspaceRoot') ?? process.cwd();
  const path = c.req.query('path') ?? '';
  const data = await readFileTool({ path }, workspaceRoot);

  return c.json({ data });
});

fileRoutes.get('/search', (c) =>
  c.json({
    data: [],
    query: c.req.query('q') ?? ''
  })
);
