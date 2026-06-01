import type { BotConfig } from '../config/schema.js';
import type { TradePair } from '../config/loadPairs.js';
import type { DexQuoteService } from '../scan/DexQuoteService.js';
import type { PairCooldownStore } from '../scan/pairCooldown.js';
import {
  buildCandidateEdges,
  buildReverseCandidateEdges,
} from '../scan/opportunityDetector.js';
import type { TradeHistoryStore } from '../scan/tradeHistory.js';
import type { ScanOpportunity } from '../scan/types.js';
import { passesCandidateSafety } from './safetyFilters.js';
import { dedupeByPairBestCoupled } from './midRangeSpread.js';
import {
  selectForExecution,
  type ExecutionSelection,
} from './selectForExecution.js';

const DEFAULT_FINALIST_COUNT = 10;

export function finalistCountForBot(bot: BotConfig): number {
  const n = bot.scan.finalistCount ?? DEFAULT_FINALIST_COUNT;
  return Math.max(0, Math.floor(n));
}

/** Best coupled route per pair, ranked for a short re-quote pass. */
export function pickFinalistSeeds(
  opportunities: ScanOpportunity[],
  count: number,
  options?: {
    pairCooldown?: PairCooldownStore;
    tradeHistory?: TradeHistoryStore;
  }
): ScanOpportunity[] {
  if (count <= 0) return [];

  let pool = opportunities;
  if (options?.pairCooldown) {
    pool = options.pairCooldown.filterEligible(pool);
  }
  if (options?.tradeHistory) {
    pool = options.tradeHistory.filterEligible(pool);
  }

  return dedupeByPairBestCoupled(pool)
    .sort((a, b) => b.roundTripBps - a.roundTripBps)
    .slice(0, count);
}

function tradePairFromSeed(seed: ScanOpportunity): TradePair {
  const forward = seed.direction === 'forward';
  const baseAddress = forward ? seed.tokenIn : seed.tokenOut;
  const targetAddress = forward ? seed.tokenOut : seed.tokenIn;
  return {
    baseSymbol: seed.baseSymbol,
    baseAddress,
    targetName: seed.targetName,
    targetAddress,
    tokenIn: baseAddress,
    tokenOut: targetAddress,
  };
}

async function refreshOneFinalist(
  seed: ScanOpportunity,
  _bot: BotConfig,
  quoteService: DexQuoteService
): Promise<ScanOpportunity[]> {
  const tradePair = tradePairFromSeed(seed);
  const amountIn = seed.amountIn;

  if (seed.direction === 'reverse') {
    const quotes = await quoteService.quotePair(
      seed.tokenIn,
      seed.tokenOut,
      amountIn
    );
    return buildReverseCandidateEdges(
      tradePair,
      amountIn,
      quotes,
      quoteService
    );
  }

  const quotes = await quoteService.quotePair(
    tradePair.tokenIn,
    tradePair.tokenOut,
    amountIn
  );
  return buildCandidateEdges(tradePair, amountIn, quotes, quoteService);
}

/**
 * Re-quote top-N pairs from the coarse scan, then run selection on fresh edges.
 */
export async function refreshFinalistOpportunities(
  seeds: ScanOpportunity[],
  bot: BotConfig,
  quoteService: DexQuoteService
): Promise<ScanOpportunity[]> {
  const refreshed: ScanOpportunity[] = [];
  const now = Date.now();

  for (const seed of seeds) {
    const edges = await refreshOneFinalist(seed, bot, quoteService);
    for (const edge of edges) {
      if (passesCandidateSafety(edge, bot)) {
        refreshed.push({ ...edge, detectedAt: now });
      }
    }
  }

  return refreshed;
}

export interface FinalistSelectionResult {
  coarse: ExecutionSelection;
  final: ExecutionSelection;
  seeds: ScanOpportunity[];
  refreshedCount: number;
  refreshMs: number;
}

export async function selectForExecutionWithFinalistRefresh(
  bot: BotConfig,
  coarseOpportunities: ScanOpportunity[],
  quoteService: DexQuoteService,
  options?: {
    pairCooldown?: PairCooldownStore;
    tradeHistory?: TradeHistoryStore;
  }
): Promise<FinalistSelectionResult> {
  const stores = options;
  const coarse = selectForExecution(bot, coarseOpportunities, stores);
  const count = finalistCountForBot(bot);

  if (count <= 0 || coarseOpportunities.length === 0) {
    return {
      coarse,
      final: coarse,
      seeds: [],
      refreshedCount: 0,
      refreshMs: 0,
    };
  }

  const seeds = pickFinalistSeeds(coarseOpportunities, count, stores);
  if (seeds.length === 0) {
    return {
      coarse,
      final: coarse,
      seeds: [],
      refreshedCount: 0,
      refreshMs: 0,
    };
  }

  const refreshStart = Date.now();
  const refreshed = await refreshFinalistOpportunities(
    seeds,
    bot,
    quoteService
  );
  const refreshMs = Date.now() - refreshStart;

  const final =
    refreshed.length > 0
      ? selectForExecution(bot, refreshed, stores)
      : coarse;

  return {
    coarse,
    final,
    seeds,
    refreshedCount: refreshed.length,
    refreshMs,
  };
}

export function formatFinalistRefreshLog(
  result: FinalistSelectionResult,
  bot: BotConfig
): string {
  const count = finalistCountForBot(bot);
  if (count <= 0) return '  finalist refresh: disabled (finalistCount=0)';

  const seedLines = result.seeds
    .map(
      (s) =>
        `    ${s.baseSymbol}→${s.targetName} ${s.direction} ` +
        `coarse=${s.roundTripBps}bps leg1@${s.candidateDex}`
    )
    .join('\n');

  const coarseRt = result.coarse.pick?.roundTripBps ?? null;
  const finalRt = result.final.pick?.roundTripBps ?? null;
  const pickChanged =
    result.coarse.pick?.pairKey !== result.final.pick?.pairKey ||
    result.coarse.pick?.candidateDex !== result.final.pick?.candidateDex;

  return [
    `  finalist refresh: top ${result.seeds.length} pairs re-quoted in ${(result.refreshMs / 1000).toFixed(1)}s → ${result.refreshedCount} fresh edges`,
    seedLines,
    `  coarse pick: ${coarseRt ?? 'none'} bps → final pick: ${finalRt ?? 'none'} bps${pickChanged ? ' (changed)' : ''}`,
  ].join('\n');
}
