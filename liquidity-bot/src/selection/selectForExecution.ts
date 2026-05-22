import type { BotConfig } from '../config/schema.js';
import type { PairCooldownStore } from '../scan/pairCooldown.js';
import type { TradeHistoryStore } from '../scan/tradeHistory.js';
import type { ScanOpportunity } from '../scan/types.js';
import { selectBestOpportunity } from '../scan/selectOpportunity.js';
import {
  dedupeByPairBestCoupled,
  selectMidRangeFromOpportunities,
  type MidRangeSelection,
} from './midRangeSpread.js';

export interface ExecutionSelection extends MidRangeSelection {
  mode: BotConfig['scan']['selectionMode'];
}

export function selectForExecution(
  bot: BotConfig,
  opportunities: ScanOpportunity[],
  options?: {
    pairCooldown?: PairCooldownStore;
    tradeHistory?: TradeHistoryStore;
  }
): ExecutionSelection {
  const mode = bot.scan.selectionMode;
  let pool = opportunities;
  if (options?.pairCooldown) {
    pool = options.pairCooldown.filterEligible(pool);
  }
  if (options?.tradeHistory) {
    pool = options.tradeHistory.filterEligible(pool);
  }

  if (mode === 'round_trip') {
    const pick = selectBestOpportunity(pool);
    return {
      mode,
      bandLow: 0,
      bandHigh: 0,
      eligibleCount: pool.length,
      pick,
    };
  }

  const perPair = dedupeByPairBestCoupled(pool);
  const mid = selectMidRangeFromOpportunities(perPair, {
    minCoupledSpreadBps: bot.scan.minCoupledSpreadBps,
  });
  return { mode, ...mid };
}

export function formatSelectionLog(sel: ExecutionSelection): string {
  if (sel.mode === 'round_trip') {
    return `selection=round_trip eligible=${sel.eligibleCount}`;
  }
  return (
    `selection=mid_range_spread band=[${sel.bandLow},${sel.bandHigh}] ` +
    `eligible=${sel.eligibleCount}`
  );
}
