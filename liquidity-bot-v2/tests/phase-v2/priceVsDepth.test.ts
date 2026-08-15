import { describe, expect, it } from 'vitest';
import { botConfigSchema } from '../../src/config/schema.js';
import { createBotConfigTemplate } from '../../src/ops/botTemplate.js';
import { selectForExecution } from '../../src/selection/selectForExecution.js';
import { selectPriceVsDepthFromOpportunities } from '../../src/selection/priceVsDepth.js';
import { sampleOpportunity } from '../helpers/sampleOpportunity.js';

describe('v2 price_vs_depth selection', () => {
  it('skips price_then_depth when DEXes match and requirePriceNeDepth', () => {
    const list = [
      sampleOpportunity({
        candidateDex: 'uniswap-v3-3000',
        referenceSellDex: 'uniswap-v3-3000',
        buySpreadBps: 2000,
        roundTripBps: 50,
        exitMode: 'price_then_depth',
        leg2UsePriceBased: false,
      }),
    ];
    const sel = selectPriceVsDepthFromOpportunities(list, {
      requirePriceNeDepth: true,
    });
    expect(sel.pick).toBeNull();
    expect(sel.eligibleCount).toBe(0);
  });

  it('wires through selectForExecution preferring positive RT', () => {
    const bot = botConfigSchema.parse(
      createBotConfigTemplate('sel', '0x1111111111111111111111111111111111111111')
    );
    expect(bot.scan.selectionMode).toBe('price_vs_depth');
    const sel = selectForExecution(bot, [
      sampleOpportunity({
        pairKey: '0xa:0xwin',
        targetName: 'win',
        buySpreadBps: 100,
        roundTripBps: 45,
        netBps: 25,
        exitMode: 'both_price',
        leg2UsePriceBased: true,
      }),
      sampleOpportunity({
        pairKey: '0xa:0xlose',
        targetName: 'lose',
        buySpreadBps: 700,
        roundTripBps: -10,
        netBps: -30,
        exitMode: 'price_then_depth',
        leg2UsePriceBased: false,
        candidateDex: 'sushiswap',
        referenceSellDex: 'uniswap-v2',
      }),
    ]);
    expect(sel.mode).toBe('price_vs_depth');
    expect(sel.pick?.targetName).toBe('win');
    expect(sel.pick?.netBps).toBe(25);
  });
});
