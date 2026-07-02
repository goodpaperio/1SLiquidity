import { describe, expect, it } from 'vitest';
import {
  shouldRunDailySweep,
  msUntilNextSweepUtcHour,
  utcDateLabel,
} from '../../src/ops/liquifySweep.js';

describe('liquify sweep scheduler', () => {
  it('runs after sweep hour when not yet swept today', () => {
    const d = new Date('2026-06-26T11:30:00.000Z');
    expect(shouldRunDailySweep(11, '2026-06-25', d)).toBe(true);
    expect(shouldRunDailySweep(11, utcDateLabel(d), d)).toBe(false);
  });

  it('does not run before sweep hour', () => {
    const early = new Date('2026-06-26T09:00:00.000Z');
    expect(shouldRunDailySweep(11, undefined, early)).toBe(false);
  });

  it('does not run after the sweep hour on the same day', () => {
    const afternoon = new Date('2026-06-26T15:30:00.000Z');
    expect(shouldRunDailySweep(11, '2026-06-25', afternoon)).toBe(false);
    expect(shouldRunDailySweep(11, undefined, afternoon)).toBe(false);
  });

  it('computes delay until next sweep hour', () => {
    const before = new Date('2026-06-26T09:30:00.000Z');
    expect(msUntilNextSweepUtcHour(11, before)).toBe(90 * 60 * 1000);
  });
});

describe('buildSweepAllowlist', () => {
  it('includes pair targets and excludes WETH base', async () => {
    const { buildSweepAllowlist } = await import(
      '../../src/ops/sweepAllowlist.js'
    );
    const bot = {
      id: 'alpha',
      baseTokens: ['WETH'],
    } as import('../../src/config/schema.js').BotConfig;

    const set = buildSweepAllowlist(bot);
    expect(set.has('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')).toBe(false);
    expect(set.size).toBeGreaterThan(0);
  });
});
