import { describe, expect, it } from 'vitest';
import {
  computeFeeStack,
  publishedDexFeeBps,
  DECA_PROTOCOL_FEE_BPS,
} from '../../src/scan/feeModel.js';
import { passesCandidateSafety } from '../../src/selection/safetyFilters.js';
import { botConfigSchema } from '../../src/config/schema.js';
import { createBotConfigTemplate } from '../../src/ops/botTemplate.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('WP1 fee-aware net EV', () => {
  it('maps published dex fees correctly', () => {
    expect(publishedDexFeeBps('uniswap-v3-3000')).toBe(30);
    expect(publishedDexFeeBps('uniswap-v3-500')).toBe(5);
    expect(publishedDexFeeBps('uniswap-v2')).toBe(30);
  });

  it('nets gross coupled minus Deca only (quotes already include DEX fees)', () => {
    const s = computeFeeStack({
      grossCoupledBps: 2,
      buyDex: 'sushiswap',
      sellDex: 'uniswap-v3-3000',
    });
    expect(s.decaFeeBps).toBe(DECA_PROTOCOL_FEE_BPS);
    expect(s.dexFeesInQuoteBps).toBe(60); // 30+30
    expect(s.netBps).toBe(2 - 20);
  });

  it('rejects +2 gross under pnl minNetBps=0 after Deca', () => {
    const bot = botConfigSchema.parse(
      createBotConfigTemplate('fees', '0x1111111111111111111111111111111111111111')
    );
    expect(bot.scan.minNetBps).toBe(0);
    const edge = sampleOpportunity({
      roundTripBps: 2,
      netBps: 2 - 20,
      decaFeeBps: 20,
      dexFeesInQuoteBps: 60,
      buySpreadBps: 13,
      liquidityRatio: 1,
      exitMode: 'both_price',
    });
    expect(passesCandidateSafety(edge, bot)).toBe(false);
  });

  it('accepts when net clears Deca', () => {
    const bot = botConfigSchema.parse(
      createBotConfigTemplate('fees', '0x1111111111111111111111111111111111111111')
    );
    const edge = sampleOpportunity({
      roundTripBps: 45,
      netBps: 25,
      buySpreadBps: 10,
      exitMode: 'both_price',
    });
    expect(passesCandidateSafety(edge, bot)).toBe(true);
  });

  it('throughput mode allows net ≥ −20 when minNet is 0', () => {
    const bot = botConfigSchema.parse({
      ...createBotConfigTemplate(
        'thru',
        '0x1111111111111111111111111111111111111111'
      ),
      scan: {
        ...createBotConfigTemplate(
          'thru',
          '0x1111111111111111111111111111111111111111'
        ).scan,
        strategyMode: 'throughput',
        minNetBps: 0,
      },
    });
    const edge = sampleOpportunity({
      roundTripBps: 2,
      netBps: -18,
      buySpreadBps: 10,
      exitMode: 'both_price',
    });
    expect(passesCandidateSafety(edge, bot)).toBe(true);
  });
});
