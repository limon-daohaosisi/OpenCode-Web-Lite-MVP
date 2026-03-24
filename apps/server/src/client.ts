import { hc } from 'hono/client';
import type { AppType } from './app.js';

export function createClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}

export type OpenCodeClient = ReturnType<typeof createClient>;
