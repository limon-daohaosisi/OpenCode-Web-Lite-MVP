import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SessionRunner } from '../agent/runner.js';

function waitForBackgroundTurn() {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

test('SessionRunner holds the lock for the detached run lifecycle', async () => {
  const runner = new SessionRunner();
  let releaseRun: () => void;
  let runStarted = false;
  const runFinished = new Promise<void>((resolve) => {
    releaseRun = resolve;
  });

  const setupResult = await runner.ensureRunning(
    'session-1',
    async () => 'ctx',
    async (ctx) => {
      assert.equal(ctx, 'ctx');
      runStarted = true;
      await runFinished;
    }
  );

  assert.equal(setupResult, 'ctx');

  await waitForBackgroundTurn();

  assert.equal(runStarted, true);
  assert.equal(runner.busy('session-1'), true);
  await assert.rejects(
    () =>
      runner.ensureRunning(
        'session-1',
        async () => 'other',
        async () => {}
      ),
    /Session already has an active run/iu
  );

  releaseRun!();
  await waitForBackgroundTurn();

  assert.equal(runner.busy('session-1'), false);
});

test('SessionRunner releases the lock when setup fails', async () => {
  const runner = new SessionRunner();

  await assert.rejects(
    () =>
      runner.ensureRunning(
        'session-2',
        async () => {
          throw new Error('setup failed');
        },
        async () => {}
      ),
    /setup failed/iu
  );

  assert.equal(runner.busy('session-2'), false);
});
