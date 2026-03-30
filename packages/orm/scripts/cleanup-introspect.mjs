import { readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const srcDir = resolve('src');
const metaDir = resolve(srcDir, 'meta');

rmSync(metaDir, { force: true, recursive: true });

for (const entry of readdirSync(srcDir)) {
  if (/^\d+_.*\.sql$/.test(entry)) {
    rmSync(resolve(srcDir, entry), { force: true });
  }
}
