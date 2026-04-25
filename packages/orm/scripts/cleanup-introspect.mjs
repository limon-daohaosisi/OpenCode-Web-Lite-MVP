import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const srcDir = resolve('src');
const metaDir = resolve(srcDir, 'meta');

rmSync(metaDir, { force: true, recursive: true });

// drizzle-kit generates imports without .js extension; normalize to ESM-compatible form
for (const file of ['schema.ts', 'relations.ts']) {
  const path = resolve(srcDir, file);
  const content = readFileSync(path, 'utf8');
  const fixed = content.replace(/from '\.\/(\w+)'/g, "from './$1.js'");
  writeFileSync(path, fixed);
}

for (const entry of readdirSync(srcDir)) {
  if (/^\d+_.*\.sql$/.test(entry)) {
    rmSync(resolve(srcDir, entry), { force: true });
  }
}
