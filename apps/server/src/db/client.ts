import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { applySqlitePragmas } from './pragmas.js';

export function getDatabasePath() {
  return process.env.DATABASE_PATH ?? './apps/server/data/opencode.db';
}

export function createDatabaseClient() {
  const path = resolve(getDatabasePath());
  mkdirSync(dirname(path), { recursive: true });

  const sqlite = new Database(path);
  applySqlitePragmas(sqlite);

  return sqlite;
}

export const sqlite = createDatabaseClient();
export const db = drizzle(sqlite);
