import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PairCooldownStore } from '../../src/scan/pairCooldown.js';
import { OpportunityCache } from '../../src/scan/OpportunityCache.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('phase C — pairCooldown', () => {
  let tmpFile: string;

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    vi.useRealTimers();
  });

  it('blocks re-selection until cooldown elapses', () => {
    vi.useFakeTimers();
    tmpFile = path.join(os.tmpdir(), `cooldown-${Date.now()}.json`);
    const store = new PairCooldownStore('test', 60_000, tmpFile);
    store.recordTrade('0xa:0xb');

    const cache = new OpportunityCache(600_000, store);
    cache.upsert(sampleOpportunity({ pairKey: '0xa:0xb', roundTripBps: 500 }));
    cache.upsert(
      sampleOpportunity({ pairKey: '0xc:0xd', roundTripBps: 400 })
    );

    expect(cache.peekBestForExecution()?.pairKey).toBe('0xc:0xd');

    vi.advanceTimersByTime(61_000);
    cache.upsert(sampleOpportunity({ pairKey: '0xa:0xb', roundTripBps: 500 }));
    expect(cache.peekBestForExecution()?.pairKey).toBe('0xa:0xb');
  });

  it('persists last trade across reload', () => {
    tmpFile = path.join(os.tmpdir(), `cooldown-${Date.now()}-2.json`);
    const a = new PairCooldownStore('test', 60_000, tmpFile);
    a.recordTrade('x:y');
    const b = new PairCooldownStore('test', 60_000, tmpFile);
    expect(b.isOnCooldown('x:y')).toBe(true);
  });
});
