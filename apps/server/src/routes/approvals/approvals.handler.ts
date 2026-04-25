import { appFactory } from '../../lib/factory.js';
import { isServiceError } from '../../lib/service-error.js';
import { sessionPromptService } from '../../services/session/prompt-service.js';
import { createValidator } from '../../lib/validator.js';
import { ApprovalsSchemas } from './approvals.schema.js';

export const approve = appFactory.createHandlers(
  createValidator.param(ApprovalsSchemas.decision.param),
  async (c) => {
    const { approvalId } = c.req.valid('param');

    try {
      const response = await sessionPromptService.resolveApproval({
        approvalId,
        decision: 'approved'
      });

      return c.json({ data: response });
    } catch (error) {
      if (isServiceError(error)) {
        return c.json({ error: error.message }, error.status);
      }

      throw error;
    }
  }
);

export const reject = appFactory.createHandlers(
  createValidator.param(ApprovalsSchemas.decision.param),
  async (c) => {
    const { approvalId } = c.req.valid('param');

    try {
      const response = await sessionPromptService.resolveApproval({
        approvalId,
        decision: 'rejected'
      });

      return c.json({ data: response });
    } catch (error) {
      if (isServiceError(error)) {
        return c.json({ error: error.message }, error.status);
      }

      throw error;
    }
  }
);
