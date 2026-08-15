import { describe, expect, it } from 'vitest';
import {
  binanceSpotSymbol,
  bookTickerFromBinancePayload,
  selectWarmPairs,
} from '../../src/signal/cexBook.js';

describe('WP3 CEX warm-set helpers', () => {
  it('builds binance symbols', () => {
    expect(binanceSpotSymbol('mana')).toBe('MANAUSDT');
    expect(binanceSpotSymbol('pepe')).toBe('PEPEUSDT');
  });

  it('parses book ticker and spread bps', () => {
    const t = bookTickerFromBinancePayload({
      s: 'MANAUSDT',
      b: '0.50',
      a: '0.501',
    });
    expect(t?.mid).toBeCloseTo(0.5005, 4);
    expect(t!.spreadBps).toBeGreaterThan(0);
  });

  it('selects tightest CEX books up to limit', () => {
    const tickers = new Map([
      [
        'AAAUSDT',
        {
          symbol: 'AAAUSDT',
          bid: 1,
          ask: 1.01,
          mid: 1.005,
          spreadBps: 99.5,
        },
      ],
      [
        'BBBUSDT',
        {
          symbol: 'BBBUSDT',
          bid: 1,
          ask: 1.001,
          mid: 1.0005,
          spreadBps: 10,
        },
      ],
      [
        'CCCUSDT',
        {
          symbol: 'CCCUSDT',
          bid: 1,
          ask: 1.0002,
          mid: 1.0001,
          spreadBps: 2,
        },
      ],
    ]);
    const warm = selectWarmPairs({
      candidates: [
        { targetName: 'aaa', baseSymbol: 'WETH', targetAddress: '0x1' },
        { targetName: 'bbb', baseSymbol: 'WETH', targetAddress: '0x2' },
        { targetName: 'ccc', baseSymbol: 'WETH', targetAddress: '0x3' },
      ],
      tickers,
      limit: 2,
      maxCexSpreadBps: 50,
    });
    expect(warm).toHaveLength(2);
    expect(warm[0].targetName).toBe('ccc');
    expect(warm[1].targetName).toBe('bbb');
  });
});
