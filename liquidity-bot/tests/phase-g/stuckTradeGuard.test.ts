import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bumpStuckCycle,
  clearStuckTradeState,
  loadStuckTradeState,
  saveStuckTradeState,
  stuckSettlementAttemptCycle,
} from '../../src/ops/stuckTradeGuard.js';
import { targetNameFromPairLabel } from '../../src/ops/tokenIssues.js';

describe('stuckTradeGuard state', () => {
  const botId = 'test-stuck';
  let tmpDir = '';

  afterEach(() => {
    clearStuckTradeState(botId);
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('counts consecutive cycles for the same tradeId', () => {
    expect(bumpStuckCycle(botId, 109).cyclesSeen).toBe(1);
    expect(bumpStuckCycle(botId, 109).cyclesSeen).toBe(2);
    expect(bumpStuckCycle(botId, 109).cyclesSeen).toBe(3);
    expect(loadStuckTradeState(botId)?.tradeId).toBe(109);
  });

  it('resets counter when tradeId changes', () => {
    bumpStuckCycle(botId, 109);
    bumpStuckCycle(botId, 109);
    const next = bumpStuckCycle(botId, 110);
    expect(next.cyclesSeen).toBe(1);
    expect(next.settlementAttempted).toBe(false);
  });

  it('preserves settlementAttempted across cycles for the same trade', () => {
    saveStuckTradeState(botId, {
      tradeId: 42,
      cyclesSeen: 1,
      settlementAttempted: true,
      updatedAt: new Date().toISOString(),
    });
    expect(bumpStuckCycle(botId, 42).settlementAttempted).toBe(true);
  });

  it('clears persisted state', () => {
    saveStuckTradeState(botId, {
      tradeId: 1,
      cyclesSeen: 2,
      settlementAttempted: false,
      updatedAt: new Date().toISOString(),
    });
    clearStuckTradeState(botId);
    expect(loadStuckTradeState(botId)).toBeNull();
  });
});

describe('stuckSettlementAttemptCycle', () => {
  it('uses ceil(threshold/2) when below cancel threshold', () => {
    expect(stuckSettlementAttemptCycle(3)).toBe(2);
    expect(stuckSettlementAttemptCycle(2)).toBe(1);
    expect(stuckSettlementAttemptCycle(1)).toBeNull();
  });
});

describe('targetNameFromPairLabel', () => {
  it('extracts alt from forward WETH pair', () => {
    expect(targetNameFromPairLabel('WETH→cbeth')).toBe('cbeth');
    expect(targetNameFromPairLabel('WETH→ldo')).toBe('ldo');
  });

  it('extracts alt from reverse pair', () => {
    expect(targetNameFromPairLabel('link→WETH')).toBe('link');
  });
});
