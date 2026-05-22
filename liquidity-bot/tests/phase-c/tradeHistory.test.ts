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
});
