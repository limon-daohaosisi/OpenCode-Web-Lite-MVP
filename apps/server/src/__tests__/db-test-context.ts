import { createServerTestEnvironment } from './server-test-helpers.js';

const environment = createServerTestEnvironment('opencode-server-db-test-');

process.env.DATABASE_PATH = environment.databasePath;

const [
  { app },
  { sqlite },
  { ServiceError },
  { buildSessionCheckpoint },
  { messageService },
  { sessionEventService },
  { sessionService },
  { workspaceService }
] = await Promise.all([
  import('../app.js'),
  import('../db/client.js'),
  import('../lib/service-error.js'),
  import('@opencode/agent'),
  import('../services/session/message-service.js'),
  import('../services/session/event-service.js'),
  import('../services/session/service.js'),
  import('../services/workspace/service.js')
]);

try {
  sqlite.exec(environment.migrationSql);
} catch (error) {
  if (!(error instanceof Error) || !/already exists/u.test(error.message)) {
    throw error;
  }
}

process.once('exit', () => {
  try {
    sqlite.close();
  } catch {
    // Ignore duplicate-close during test teardown.
  }

  environment.cleanup();
});

export const dbTestContext = {
  app,
  buildSessionCheckpoint,
  environment,
  ServiceError,
  messageService,
  sessionEventService,
  sessionService,
  sqlite,
  workspaceService
};

export function resetTestDatabase() {
  sqlite.exec('DELETE FROM workspaces;');
}
