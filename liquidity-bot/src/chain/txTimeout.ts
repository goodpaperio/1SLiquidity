/** Default timeout for broadcasting a transaction (eth_sendRawTransaction path). */
export const TX_SEND_TIMEOUT_MS = 60_000;
/** Default timeout for waiting on a mined receipt. */
export const TX_WAIT_TIMEOUT_MS = 120_000;
/** How long to skip trading after RPC rate-limit / 503 errors. */
export const RATE_LIMIT_PAUSE_MS = 60 * 60_000;
/** Soft upper bound for a single scan+execute cycle before watchdog trips. */
export const CYCLE_WATCHDOG_MAX_MS = 10 * 60_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type WaitableTx = {
  hash?: string;
  wait: (confirms?: number) => Promise<unknown>;
};

/**
 * Wait for a transaction receipt with a hard deadline.
 * Prevents ethers/provider retries from wedging the bot forever.
 */
export async function waitForTx<T>(
  tx: WaitableTx,
  ms: number = TX_WAIT_TIMEOUT_MS
): Promise<T> {
  const label = tx.hash ? `tx.wait(${tx.hash.slice(0, 10)}…)` : 'tx.wait';
  const receipt = (await withTimeout(tx.wait(), ms, label)) as T | null;
  if (receipt == null) {
    throw new Error(`${label} returned null receipt`);
  }
  return receipt;
}

export function errorText(err: unknown): string {
  if (err instanceof Error) {
    const anyErr = err as Error & {
      shortMessage?: string;
      info?: { responseBody?: string; responseStatus?: string };
      code?: string | number;
    };
    return [
      err.message,
      anyErr.shortMessage,
      anyErr.code != null ? String(anyErr.code) : '',
      anyErr.info?.responseStatus,
      anyErr.info?.responseBody,
      // nested cause
      err.cause instanceof Error ? err.cause.message : '',
    ]
      .filter(Boolean)
      .join(' | ');
  }
  return String(err);
}

/**
 * Alchemy/Infura (and similar) overload / quota signals that should trigger
 * a cool-down rather than infinite retry.
 */
export function isRpcRateLimitError(err: unknown): boolean {
  const text = errorText(err);
  return /503|429| -32001|Unable to complete request|Too Many Requests|call rate|rate.?limit|capacity|Service Unavailable|TIMEOUT|ECONNRESET|ETIMEDOUT|timed out after/i.test(
    text
  );
}

export function cycleWatchdogMs(intervalMs: number): number {
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    return CYCLE_WATCHDOG_MAX_MS;
  }
  return Math.min(CYCLE_WATCHDOG_MAX_MS, intervalMs);
}
