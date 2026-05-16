import type { BotConfig } from '../config/schema.js';
import type { DexQuote, ScanOpportunity } from './types.js';
import type { TradePair } from '../config/loadPairs.js';

export function spreadBps(
  amountOutBetter: bigint,
  amountOutReference: bigint
): number {
  if (amountOutReference <= 0n) return 0;
  const diff = amountOutBetter - amountOutReference;
  if (diff <= 0n) return 0;
  return Number((diff * 10_000n) / amountOutReference);
}

export function pairKey(tokenIn: string, tokenOut: string): string {
  return `${tokenIn.toLowerCase()}:${tokenOut.toLowerCase()}`;
}

/**
 * Reference = deepest liquidity among valid quotes.
 * Candidate = other DEX with more output and strictly lower liquidity.
 */
export function detectOpportunitiesForPair(
  tradePair: TradePair,
  amountIn: bigint,
  quotes: DexQuote[],
  bot: BotConfig
): ScanOpportunity[] {
  const valid = quotes.filter((q) => q.amountOut > 0n && q.liquidityScore > 0n);
  if (valid.length < 2) return [];

  const reference = valid.reduce((best, q) =>
    q.liquidityScore > best.liquidityScore ? q : best
  );

  const opportunities: ScanOpportunity[] = [];
  const now = Date.now();
  const key = pairKey(tradePair.tokenIn, tradePair.tokenOut);

  for (const candidate of valid) {
    if (candidate.dex === reference.dex) continue;
    if (candidate.liquidityScore >= reference.liquidityScore) continue;
    if (candidate.amountOut <= reference.amountOut) continue;

    const bps = spreadBps(candidate.amountOut, reference.amountOut);
    if (bps < bot.scan.minSpreadBps) continue;

    const liquidityRatio =
      Number(reference.liquidityScore) / Number(candidate.liquidityScore);
    if (liquidityRatio < bot.scan.minLiquidityRatio) continue;

    opportunities.push({
      pairKey: key,
      baseSymbol: tradePair.baseSymbol,
      targetName: tradePair.targetName,
      tokenIn: tradePair.tokenIn,
      tokenOut: tradePair.tokenOut,
      amountIn,
      candidateDex: candidate.dex,
      referenceDex: reference.dex,
      amountOutCandidate: candidate.amountOut,
      amountOutReference: reference.amountOut,
      spreadBps: bps,
      liquidityRatio,
      detectedAt: now,
    });
  }

  return opportunities.sort((a, b) => b.spreadBps - a.spreadBps);
}
