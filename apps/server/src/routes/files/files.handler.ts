import { appFactory } from '../../lib/factory.js';
import { createValidator } from '../../lib/validator.js';
import { readFileTool } from '../../tools/read-file.js';
import { FilesSchemas } from './files.schema.js';

export const content = appFactory.createHandlers(
  createValidator.query(FilesSchemas.content.query),
  async (c) => {
    const { path, workspaceRoot } = c.req.valid('query');
    const data = await readFileTool({ path }, workspaceRoot ?? process.cwd());

    return c.json({ data });
  }
);

export const search = appFactory.createHandlers(
  createValidator.query(FilesSchemas.search.query),
  (c) => {
    const { q } = c.req.valid('query');

    return c.json({
      data: [],
      query: q ?? ''
    });
  }
);
