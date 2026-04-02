import { appFactory } from '../../lib/factory.js';
import { createValidator } from '../../lib/validator.js';
import { ApprovalsSchemas } from './approvals.schema.js';

export const approve = appFactory.createHandlers(
  createValidator.param(ApprovalsSchemas.decision.param),
  (c) => {
    const { approvalId } = c.req.valid('param');

    return c.json({
      data: {
        approvalId,
        decision: 'approved'
      }
    });
  }
);

export const reject = appFactory.createHandlers(
  createValidator.param(ApprovalsSchemas.decision.param),
  (c) => {
    const { approvalId } = c.req.valid('param');

    return c.json({
      data: {
        approvalId,
        decision: 'rejected'
      }
    });
  }
);
