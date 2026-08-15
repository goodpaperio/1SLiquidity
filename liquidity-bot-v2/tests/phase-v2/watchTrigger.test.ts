import { afterEach, describe, expect, it } from 'vitest';
import type { TradePair } from '../../src/config/loadPairs.js';
import {
  clearLiveTickers,
  upsertLiveTicker,
} from '../../src/signal/cexLive.js';
import {
  confirmGapThresholdBps,
  selectConfirmSet,
} from '../../src/signal/watchTrigger.js';

const pair = (
  name: string,
  addr: string,
  base: TradePair['baseSymbol'] = 'WETH'
): TradePair => ({
  baseSymbol: base,
  baseAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  targetName: name,
  targetAddress: addr,
  tokenIn: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  tokenOut: addr,
});

afterEach(() => {
  clearLiveTickers();
});

describe('watch plane confirm selection', () => {
  it('derives confirm gap from Deca + minNet', () => {
    expect(
      confirmGapThresholdBps({
        scan: {
          decaProtocolFeeBps: 20,
          minNetBps: 0,
          strategyMode: 'pnl',
        },
      })
    ).toBe(25);
    expect(
      confirmGapThresholdBps({
        scan: {
          confirmGapBps: 40,
          decaProtocolFeeBps: 20,
          minNetBps: 0,
          strategyMode: 'pnl',
        },
      })
    ).toBe(40);
  });

  it('seeds confirms when DEX mid is missing (0 RPC otherwise impossible)', () => {
    const a = pair('link', '0x0000000000000000000000000000000000000001');
    const r = selectConfirmSet({
      pairs: [a],
      warm: [
        {
          targetName: 'link',
          baseSymbol: 'WETH',
          targetAddress: a.targetAddress,
          cexMid: 10,
          cexSpreadBps: 5,
          reason: 'x',
        },
      ],
      lastMids: [],
      nowMs: 1_000_000,
      confirmGapBps: 25,
      maxCexSpreadBps: 25,
      maxCexStalenessMs: 30_000,
      maxDexMidAgeMs: 900_000,
      maxConfirmPairs: 3,
      warmFetchedAtMs: 999_000,
      cexAvailable: true,
    });
    expect(r.confirmedN).toBe(1);
    expect(r.decisions[0].reason).toBe('dex_mid_missing');
  });

  it('idles when gap is small and mids are fresh', () => {
    const a = pair('link', '0x0000000000000000000000000000000000000001');
    upsertLiveTicker(
      {
        symbol: 'LINKUSDT',
        bid: 9.99,
        ask: 10.01,
        mid: 10,
        spreadBps: 20,
      },
      999_500
    );
    const r = selectConfirmSet({
      pairs: [a],
      warm: [
        {
          targetName: 'link',
          baseSymbol: 'WETH',
          targetAddress: a.targetAddress,
          cexMid: 10,
          cexSpreadBps: 5,
          reason: 'x',
        },
      ],
      lastMids: [
        {
          targetAddress: a.targetAddress,
          targetName: 'link',
          baseSymbol: 'WETH',
          usdPerAlt: 10.01,
          fetchedAt: new Date(950_000).toISOString(),
        },
      ],
      nowMs: 1_000_000,
      confirmGapBps: 25,
      maxCexSpreadBps: 25,
      maxCexStalenessMs: 30_000,
      maxDexMidAgeMs: 900_000,
      maxConfirmPairs: 3,
      liveTickers: new Map([
        [
          'LINKUSDT',
          {
            symbol: 'LINKUSDT',
            bid: 9.99,
            ask: 10.01,
            mid: 10,
            spreadBps: 20,
            fetchedAtMs: 999_500,
          },
        ],
      ]),
      cexAvailable: true,
    });
    expect(r.confirmedN).toBe(0);
    expect(r.skipCounts.gap_too_small).toBe(1);
  });

  it('confirms on large CEX–DEX gap', () => {
    const a = pair('link', '0x0000000000000000000000000000000000000001');
    const r = selectConfirmSet({
      pairs: [a],
      warm: [
        {
          targetName: 'link',
          baseSymbol: 'WETH',
          targetAddress: a.targetAddress,
          cexMid: 12,
          cexSpreadBps: 5,
          reason: 'x',
        },
      ],
      lastMids: [
        {
          targetAddress: a.targetAddress,
          targetName: 'link',
          baseSymbol: 'WETH',
          usdPerAlt: 10,
          fetchedAt: new Date(950_000).toISOString(),
        },
      ],
      nowMs: 1_000_000,
      confirmGapBps: 25,
      maxCexSpreadBps: 25,
      maxCexStalenessMs: 30_000,
      maxDexMidAgeMs: 900_000,
      maxConfirmPairs: 3,
      warmFetchedAtMs: 999_000,
      cexAvailable: true,
    });
    expect(r.confirmedN).toBe(1);
    expect(r.decisions[0].reason).toBe('gap');
  });

  it('heartbeats stale DEX mids and caps confirm set', () => {
    const a = pair('aaa', '0x0000000000000000000000000000000000000001');
    const b = pair('bbb', '0x0000000000000000000000000000000000000002');
    const c = pair('ccc', '0x0000000000000000000000000000000000000003');
    const old = new Date(0).toISOString();
    const r = selectConfirmSet({
      pairs: [a, b, c],
      warm: [],
      lastMids: [
        {
          targetAddress: a.targetAddress,
          targetName: 'aaa',
          baseSymbol: 'WETH',
          usdPerAlt: 1,
          fetchedAt: old,
        },
        {
          targetAddress: b.targetAddress,
          targetName: 'bbb',
          baseSymbol: 'WETH',
          usdPerAlt: 1,
          fetchedAt: old,
        },
        {
          targetAddress: c.targetAddress,
          targetName: 'ccc',
          baseSymbol: 'WETH',
          usdPerAlt: 1,
          fetchedAt: old,
        },
      ],
      nowMs: Date.now(),
      confirmGapBps: 25,
      maxCexSpreadBps: 25,
      maxCexStalenessMs: 30_000,
      maxDexMidAgeMs: 900_000,
      maxConfirmPairs: 2,
      cexAvailable: false,
    });
    expect(r.confirmedN).toBe(2);
    expect(r.skipCounts.rpc_budget).toBe(1);
  });

  it('skips dex-only when mid is fresh', () => {
    const a = pair('susde', '0x0000000000000000000000000000000000000001');
    const r = selectConfirmSet({
      pairs: [a],
      warm: [],
      lastMids: [
        {
          targetAddress: a.targetAddress,
          targetName: 'susde',
          baseSymbol: 'USDC',
          usdPerAlt: 1,
          fetchedAt: new Date().toISOString(),
        },
      ],
      nowMs: Date.now(),
      confirmGapBps: 25,
      maxCexSpreadBps: 25,
      maxCexStalenessMs: 30_000,
      maxDexMidAgeMs: 900_000,
      maxConfirmPairs: 3,
      cexAvailable: true,
    });
    expect(r.confirmedN).toBe(0);
    expect(r.dexOnlyN).toBe(1);
    expect(r.skipCounts.dex_only_fresh).toBe(1);
  });
});
