import PQueue from 'p-queue';

const DEFAULT_CONCURRENCY = 1;
const DEFAULT_DELAY_MS = 2000;

export function createRateLimiter(opts?: { concurrency?: number; delayMs?: number }) {
  const concurrency = opts?.concurrency ?? DEFAULT_CONCURRENCY;
  const delayMs = opts?.delayMs ?? DEFAULT_DELAY_MS;

  const queue = new PQueue({
    concurrency,
    interval: delayMs,
    intervalCap: concurrency,
  });

  return queue;
}
