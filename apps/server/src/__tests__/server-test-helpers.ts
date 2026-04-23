import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../..');

export function createServerTestEnvironment(prefix: string) {
  const testRoot = mkdtempSync(path.join(tmpdir(), prefix));
  const databasePath = path.join(testRoot, 'opencode-test.db');
  const workspaceRoot = path.join(testRoot, 'workspace');

  mkdirSync(path.join(workspaceRoot, 'src'), { recursive: true });
  writeFileSync(
    path.join(workspaceRoot, 'package.json'),
    '{"name":"workspace-test"}\n'
  );
  writeFileSync(
    path.join(workspaceRoot, 'src', 'index.ts'),
    'export const ok = true;\n'
  );

  const migrationSql = readFileSync(
    path.join(
      repoRoot,
      'packages/db/migrations/20260330144844_init_schema.sql'
    ),
    'utf8'
  );

  return {
    cleanup() {
      rmSync(testRoot, { force: true, recursive: true });
    },
    databasePath,
    migrationSql,
    testRoot,
    workspaceRoot
  };
}

export async function parseJson<T>(
  response: Response
): Promise<{ data?: T; error?: string }> {
  return (await response.json()) as { data?: T; error?: string };
}
