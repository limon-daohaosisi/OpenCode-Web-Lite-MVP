import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  out: './src',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? '../../apps/server/data/opencode.db'
  },
  introspect: {
    casing: 'camel'
  },
  verbose: true,
  strict: true
});
