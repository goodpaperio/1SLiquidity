import { effectiveMinNetBps } from '../scan/feeModel.js';
import type { BotConfig } from '../config/schema.js';
import type { ScanOpportunity } from '../scan/types.js';

/** Structural gates (no Deca net floor — applied after size sweep). */
export function passesStructuralSafety(
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

  if (
    edge.exitMode !== 'both_price' &&
    edge.liquidityRatio < bot.scan.minLiquidityRatio
  ) {
    return false;
  }

  return true;
}

/** Structural + fee-aware net gate. */
export function passesCandidateSafety(
  edge: ScanOpportunity,
  bot: BotConfig
): boolean {
  if (!passesStructuralSafety(edge, bot)) return false;
  if (edge.netBps < effectiveMinNetBps(bot)) return false;
  return true;
}
