import { Hono } from 'hono';

export const approvalRoutes = new Hono();

approvalRoutes.post('/:approvalId/approve', (c) => {
  const approvalId = c.req.param('approvalId');

  return c.json({
    data: {
      approvalId,
      decision: 'approved'
    }
  });
});

approvalRoutes.post('/:approvalId/reject', (c) => {
  const approvalId = c.req.param('approvalId');

  return c.json({
    data: {
      approvalId,
      decision: 'rejected'
    }
  });
});
