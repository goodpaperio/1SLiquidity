import type { ScanOpportunity } from '../../src/scan/types.js';

export function sampleOpportunity(
  overrides: Partial<ScanOpportunity> = {}
): ScanOpportunity {
  return {
    pairKey: '0xa:0xb',
    baseSymbol: 'USDC',
    targetName: 'pepe',
    tokenIn: '0xa',
    tokenOut: '0xb',
    direction: 'forward',
    amountIn: 1_000_000n,
    candidateDex: 'uniswap-v2',
    deepBuyDex: 'uniswap-v3-3000',
    referenceSellDex: 'uniswap-v3-10000',
    amountOutCandidate: 1_100_000n,
    predictedBaseOut: 1_080_000n,
    roundTripBps: 800,
    predictedWinWei: 80_000n,
    buySpreadBps: 1000,
    sellReserveIn: 20_000_000n,
    liquidityRatio: 3,
    detectedAt: Date.now(),
    sellImpactBps: 5,
    exitMode: 'both_price',
    leg2UsePriceBased: true,
    netBps: 780,
    dexFeesInQuoteBps: 60,
    decaFeeBps: 20,
    ...overrides,
  };
}
