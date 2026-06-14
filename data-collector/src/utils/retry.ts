import { logger } from './logger.js';

const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 2000;

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = DEFAULT_RETRIES,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable = isRetryableError(lastError);

      if (!isRetryable || attempt === maxRetries) {
        logger.error({ err: lastError.message, attempt, label }, 'Non-retryable or max retries reached');
        throw lastError;
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn({ attempt, delay, label, err: lastError.message }, 'Retrying after error');
      await sleep(delay);
    }
  }

  throw lastError;
}

function isRetryableError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  // Retry on network errors, 429, 5xx
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('enotfound')) return true;
  if (msg.includes('429') || msg.includes('too many requests')) return true;
  if (/5\d{2}/.test(msg)) return true;
  // Don't retry on 403, 404
  if (msg.includes('403') || msg.includes('404')) return false;
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
