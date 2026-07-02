import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assessTradeStaleness,
  STALE_TRADE_THRESHOLD_MS,
} from '../../src/ops/tradeHealthCheck.js';
import { TradeLedger } from '../../src/notify/tradeLedger.js';

describe('tradeHealthCheck', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lb-health-'));

  afterEach(() => {
    for (const f of fs.readdirSync(tmpDir)) {
      fs.unlinkSync(path.join(tmpDir, f));
    }
  });

  it('flags stale when last placed trade exceeds threshold', () => {
    const ledgerPath = path.join(tmpDir, 'test.trade-ledger.jsonl');
    const ledger = new TradeLedger('test', ledgerPath);
    const old = new Date(Date.now() - STALE_TRADE_THRESHOLD_MS - 60_000).toISOString();
    ledger.append({
      tradeId: 1,
      direction: 'forward',
      pair: 'WETH→link',
      leg1TokenIn: 'WETH',
      leg1AmountIn: '1',
      leg2TokenIn: 'link',
      leg2AmountIn: '1',
      leg2MinOut: '1',
      settlementToken: 'WETH',
      leg1TxHash: '0xabc',
      placedAt: old,
      status: 'completed',
    });

    const check = assessTradeStaleness(ledger);
    expect(check.stale).toBe(true);
    expect(check.lastPair).toBe('WETH→link');
    expect(check.hoursSince).toBeGreaterThan(2);
  });

  it('not stale for recent trade', () => {
    const ledgerPath = path.join(tmpDir, 'fresh.trade-ledger.jsonl');
    const ledger = new TradeLedger('fresh', ledgerPath);
    ledger.append({
      tradeId: 2,
      direction: 'reverse',
      pair: 'WETH→aave',
      leg1TokenIn: 'aave',
      leg1AmountIn: '1',
      leg2TokenIn: 'WETH',
      leg2AmountIn: '1',
      leg2MinOut: '1',
      settlementToken: 'aave',
      leg1TxHash: '0xdef',
      placedAt: new Date().toISOString(),
      status: 'open',
    });

    const check = assessTradeStaleness(ledger);
    expect(check.stale).toBe(false);
  });
});
