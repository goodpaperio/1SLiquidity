import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  bumpStuckCycle,
  clearStuckTradeState,
  loadStuckTradeState,
  saveStuckTradeState,
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
    expect(bumpStuckCycle(botId, 110).cyclesSeen).toBe(1);
  });

  it('clears persisted state', () => {
    saveStuckTradeState(botId, {
      tradeId: 1,
      cyclesSeen: 2,
      updatedAt: new Date().toISOString(),
    });
    clearStuckTradeState(botId);
    expect(loadStuckTradeState(botId)).toBeNull();
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
