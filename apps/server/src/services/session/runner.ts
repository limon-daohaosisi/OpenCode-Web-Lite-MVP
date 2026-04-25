import { ServiceError } from '../../lib/service-error.js';

export class SessionRunner {
  private readonly activeRuns = new Set<string>();

  busy(sessionId: string) {
    return this.activeRuns.has(sessionId);
  }

  async ensureRunning<T>(
    sessionId: string,
    setup: () => Promise<T>,
    run: (ctx: T) => Promise<void>
  ): Promise<T> {
    if (this.activeRuns.has(sessionId)) {
      throw new ServiceError('Session already has an active run.', 409);
    }

    this.activeRuns.add(sessionId);

    try {
      const ctx = await setup();

      void Promise.resolve()
        .then(() => run(ctx))
        .finally(() => {
          this.activeRuns.delete(sessionId);
        });

      return ctx;
    } catch (error) {
      this.activeRuns.delete(sessionId);
      throw error;
    }
  }
}

export const sessionRunner = new SessionRunner();
