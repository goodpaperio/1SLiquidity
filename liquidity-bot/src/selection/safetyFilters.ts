import type { BotConfig } from '../config/schema.js';
import type { ScanOpportunity } from '../scan/types.js';

/** Safety-only gates for mid-range selection (no minSpreadBps profit floor). */
export function passesCandidateSafety(
  edge: ScanOpportunity,
  bot: BotConfig
): boolean {
  const coupled = edge.roundTripBps;
  if (coupled < bot.scan.minCoupledSpreadBps) return false;
  if (edge.buySpreadBps > bot.scan.maxSpreadBps) return false;
  if (coupled > bot.scan.maxSpreadBps) return false;

  if (edge.sellReserveIn > 0n) {
    const usageBps = Number(
      (edge.amountOutCandidate * 10_000n) / edge.sellReserveIn
    );
    if (usageBps > bot.scan.maxSellReserveUsageBps) return false;
  }

  if (edge.liquidityRatio < bot.scan.minLiquidityRatio) return false;

  return true;
}
