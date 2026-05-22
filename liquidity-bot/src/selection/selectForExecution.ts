import type { BotConfig } from '../config/schema.js';
import type { PairCooldownStore } from '../scan/pairCooldown.js';
import type { TradeHistoryStore } from '../scan/tradeHistory.js';
import {
  formatPredictedWin,
  formatOpportunityLine,
} from '../scan/formatOpportunity.js';
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
  const pickRt = sel.pick?.roundTripBps ?? sel.bandHigh;
  return (
    `selection=mid_range_spread floor=p25:${sel.bandLow}bps ` +
    `eligible=${sel.eligibleCount} best=${pickRt}bps`
  );
}

/** Prominent one-run summary of the execution pick (dry-run or live). */
export function formatSelectedTradeBlock(
  sel: ExecutionSelection,
  options?: {
    headline?: string;
    emptyMessage?: string;
  }
): string {
  const headline = options?.headline ?? 'SELECTED TRADE THIS RUN';
  if (!sel.pick) {
    const empty =
      options?.emptyMessage ??
      'No trade — no eligible opportunity after cooldown, repeat guard, or coupled floor.';
    return `\n── ${headline} ──\n  ${empty}\n  ${formatSelectionLog(sel)}\n`;
  }

  const p = sel.pick;
  const decaDex =
    p.direction === 'reverse' ? p.deepBuyDex : p.referenceSellDex;
  const leg1Label =
    p.direction === 'reverse' ? 'alt→base swap' : 'base→alt swap';

  return [
    '',
    `── ${headline} ──`,
    `  pair:         ${p.baseSymbol}→${p.targetName}`,
    `  direction:    ${p.direction}`,
    `  coupled:      ${p.roundTripBps} bps`,
    `  buy spread:   ${p.buySpreadBps} bps (leg-1 vs deep book, diagnostic)`,
    `  predicted:    ${formatPredictedWin(p)} (quote-only, before gas)`,
    `  leg 1 (${leg1Label}): ${p.candidateDex}`,
    `  leg 2 (Deca):       ${decaDex}`,
    `  ${formatSelectionLog(sel)}`,
    `  detail: ${formatOpportunityLine(p)}`,
    '',
  ].join('\n');
}
