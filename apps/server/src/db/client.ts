export function getDatabasePath() {
  return process.env.DATABASE_PATH ?? './apps/server/data/opencode.db';
}

export function createDatabaseClient() {
  return {
    path: getDatabasePath(),
    ready: false
  };
}
