import { describe, expect, it } from 'vitest';
import type { BotConfig } from '../../src/config/schema.js';
import { pickFinalistSeeds } from '../../src/selection/finalistRefresh.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('finalist refresh', () => {
  it('picks top N unique pairs by coarse coupled bps', () => {
    const opps = [
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: 10, targetName: 'a' }),
      sampleOpportunity({ pairKey: 'a:b', roundTripBps: 5, targetName: 'a' }),
      sampleOpportunity({ pairKey: 'c:d', roundTripBps: 8, targetName: 'c' }),
      sampleOpportunity({ pairKey: 'e:f', roundTripBps: 1, targetName: 'e' }),
    ];
    const seeds = pickFinalistSeeds(opps, 2);
    expect(seeds).toHaveLength(2);
    expect(seeds[0].targetName).toBe('a');
    expect(seeds[0].roundTripBps).toBe(10);
    expect(seeds[1].targetName).toBe('c');
  });

  it('respects finalistCount=0 as disabled', () => {
    const bot = { scan: { finalistCount: 0 } } as BotConfig;
    expect(bot.scan.finalistCount).toBe(0);
    expect(pickFinalistSeeds([sampleOpportunity()], 0)).toHaveLength(0);
  });
});
