import { describe, expect, it, vi } from 'vitest';
import {
  cycleWatchdogMs,
  CYCLE_WATCHDOG_MAX_MS,
  isRpcRateLimitError,
  waitForTx,
  withTimeout,
} from '../../src/chain/txTimeout.js';

describe('txTimeout helpers', () => {
  it('withTimeout resolves when promise is fast', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000, 'fast')).resolves.toBe(
      42
    );
  });

  it('withTimeout rejects when promise hangs', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 50, 'hang');
    const assertion = expect(pending).rejects.toThrow(/hang timed out after 50ms/);
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    vi.useRealTimers();
  });

  it('waitForTx rejects on null receipt', async () => {
    await expect(
      waitForTx({ hash: '0xabc', wait: async () => null }, 1000)
    ).rejects.toThrow(/null receipt/);
  });

  it('isRpcRateLimitError detects Alchemy 503 / -32001', () => {
    expect(
      isRpcRateLimitError(
        new Error(
          'server response 503 Service Unavailable ... Unable to complete request at this time'
        )
      )
    ).toBe(true);
    expect(isRpcRateLimitError(new Error('execution reverted: STF'))).toBe(
      false
    );
    expect(isRpcRateLimitError(new Error('swap timed out after 60000ms'))).toBe(
      true
    );
  });

  it('cycleWatchdogMs caps at 10 minutes', () => {
    expect(cycleWatchdogMs(1_800_000)).toBe(CYCLE_WATCHDOG_MAX_MS);
    expect(cycleWatchdogMs(300_000)).toBe(300_000);
  });
});
