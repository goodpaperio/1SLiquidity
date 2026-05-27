import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TradeHistoryStore } from '../../src/scan/tradeHistory.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('phase C — tradeHistory', () => {
  let tmpFile: string;

  afterEach(() => {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  it('blocks pair appearing in last N live trades (forward or reverse)', () => {
    tmpFile = path.join(os.tmpdir(), `history-${Date.now()}.json`);
    const store = new TradeHistoryStore('test', 4, 32, tmpFile);
    store.recordLiveTrade('weth:comp', 'forward', 'comp');
    expect(store.isBlocked('weth:comp')).toBe(true);
    expect(store.isBlocked('weth:ldo')).toBe(false);

    store.recordLiveTrade('weth:ldo', 'forward', 'ldo');
    store.recordLiveTrade('weth:ena', 'reverse', 'ena');
    store.recordLiveTrade('weth:inj', 'forward', 'inj');
    expect(store.isBlocked('weth:comp')).toBe(true);

    store.recordLiveTrade('weth:axs', 'forward', 'axs');
    expect(store.isBlocked('weth:comp')).toBe(false);
  });

  it('filters opportunities for selection', () => {
    tmpFile = path.join(os.tmpdir(), `history-${Date.now()}-2.json`);
    const store = new TradeHistoryStore('test', 4, 32, tmpFile);
    store.recordLiveTrade('a:b', 'forward', 'x');
    const list = [
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: 100 }),
      sampleOpportunity({ pairKey: 'c:d', roundTripBps: 50 }),
    ];
    expect(store.filterEligible(list)).toHaveLength(1);
    expect(store.filterEligible(list)[0].pairKey).toBe('c:d');
  });

  it('tracks proven tokens from live trades', () => {
    tmpFile = path.join(os.tmpdir(), `history-${Date.now()}-3.json`);
    const store = new TradeHistoryStore('test', 4, 32, tmpFile);
    store.recordLiveTrade(
      'weth:ldo',
      'forward',
      'ldo',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32'
    );

    const proven = store.provenTokenAddresses();
    expect(proven.has('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')).toBe(true);
    expect(proven.has('0x5a98fcbea516cf06857215779fd812ca3bef1b32')).toBe(true);
  });
});
