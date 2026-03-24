import type { SessionEvent } from '@opencode/shared';

export function serializeEvent(event: SessionEvent) {
  return JSON.stringify(event);
}
