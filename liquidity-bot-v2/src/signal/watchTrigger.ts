/**
 * Watch → confirm: decide which hot pairs get on-chain quotes this cycle.
 * Pure (no RPC). CEX books + last DEX mids are the only inputs.
 */
import type { TradePair } from '../config/loadPairs.js';
import { effectiveMinNetBps } from '../scan/feeModel.js';
import { binanceSpotSymbol, type WarmPairRef } from './cexBook.js';
import { cexDexGapBps, type DexMidRow } from './cexDexRank.js';
import type { LiveCexTicker } from './cexLive.js';

export type WatchSkipReason =
  | 'gap_too_small'
  | 'cex_stale'
  | 'book_too_wide'
  | 'rpc_budget'
  | 'dex_only_fresh';

export type ConfirmReason =
  | 'gap'
  | 'dex_mid_missing'
  | 'dex_mid_stale';

export type WatchSlice = 'cexListed' | 'dexOnly';

export interface WatchPairDecision {
  pair: TradePair;
  slice: WatchSlice;
  action: 'confirm' | 'skip';
  reason: ConfirmReason | WatchSkipReason;
  gapBps: number | null;
}

export interface SelectConfirmSetParams {
  pairs: TradePair[];
  warm: WarmPairRef[];
  lastMids: DexMidRow[];
  nowMs: number;
  confirmGapBps: number;
  maxCexSpreadBps: number;
  maxCexStalenessMs: number;
  maxDexMidAgeMs: number;
  maxConfirmPairs: number;
  liveTickers?: Map<string, LiveCexTicker>;
  /** Warm-file snapshot time; used when a pair has no live ticker. */
  warmFetchedAtMs?: number | null;
  /** If false, listed books are treated as missing (require mode idles). */
  cexAvailable?: boolean;
}

export interface SelectConfirmSetResult {
  decisions: WatchPairDecision[];
  confirm: TradePair[];
  hotN: number;
  cexListedN: number;
  dexOnlyN: number;
  confirmedN: number;
  skipCounts: Record<string, number>;
}

export function confirmGapThresholdBps(bot: {
  scan: {
    confirmGapBps?: number;
    decaProtocolFeeBps: number;
    minNetBps: number;
    strategyMode: 'pnl' | 'throughput';
  };
}): number {
  if (bot.scan.confirmGapBps != null && bot.scan.confirmGapBps > 0) {
    return bot.scan.confirmGapBps;
  }
  const minNet = effectiveMinNetBps(bot);
  return Math.max(bot.scan.decaProtocolFeeBps + Math.max(0, minNet) + 5, 15);
}

export function formatWatchLine(w: SelectConfirmSetResult): string {
  const skips = Object.entries(w.skipCounts)
    .map(([k, v]) => `${k}=${v}`)
    .join(',') || 'none';
  return (
    `watch hot=${w.hotN} cexListed=${w.cexListedN} dexOnly=${w.dexOnlyN} ` +
    `confirm=${w.confirmedN} skips=${skips}`
  );
}

function midAgeMs(row: DexMidRow | undefined, nowMs: number): number | null {
  if (!row?.fetchedAt) return null;
  const t = Date.parse(row.fetchedAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, nowMs - t);
}

function bump(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

/**
 * Rank confirms: tradable gaps first, then seed missing mids, then heartbeats.
 * Overflow is skipped as rpc_budget.
 */
export function selectConfirmSet(
  params: SelectConfirmSetParams
): SelectConfirmSetResult {
  const warmByAddr = new Map(
    params.warm.map((w) => [w.targetAddress.toLowerCase(), w])
  );
  const midByAddr = new Map(
    params.lastMids.map((r) => [r.targetAddress.toLowerCase(), r])
  );
  const cexAvailable =
    params.cexAvailable ??
    (params.warm.length > 0 ||
      (params.liveTickers != null && params.liveTickers.size > 0));

  const raw: WatchPairDecision[] = [];

  for (const pair of params.pairs) {
    const addr = pair.targetAddress.toLowerCase();
    const symbol = binanceSpotSymbol(pair.targetName);
    const live = params.liveTickers?.get(symbol.toUpperCase());
    const warm = warmByAddr.get(addr);
    const listed = Boolean(live || (warm && warm.cexMid != null));
    const slice: WatchSlice = listed ? 'cexListed' : 'dexOnly';
    const spread = live?.spreadBps ?? warm?.cexSpreadBps;
    const cexMid = live?.mid ?? warm?.cexMid;
    const cexAgeMs = live
      ? Math.max(0, params.nowMs - live.fetchedAtMs)
      : params.warmFetchedAtMs != null
        ? Math.max(0, params.nowMs - params.warmFetchedAtMs)
        : null;

    const last = midByAddr.get(addr);
    const dexAge = midAgeMs(last, params.nowMs);
    const gapBps =
      cexMid != null && last?.usdPerAlt
        ? cexDexGapBps(cexMid, last.usdPerAlt)
        : null;

    const midMissing = last == null || !(last.usdPerAlt > 0);
    const midStale =
      !midMissing &&
      (dexAge == null || dexAge > params.maxDexMidAgeMs);

    if (midMissing) {
      raw.push({
        pair,
        slice,
        action: 'confirm',
        reason: 'dex_mid_missing',
        gapBps,
      });
      continue;
    }
    if (midStale) {
      raw.push({
        pair,
        slice,
        action: 'confirm',
        reason: 'dex_mid_stale',
        gapBps,
      });
      continue;
    }

    if (!listed) {
      raw.push({
        pair,
        slice,
        action: 'skip',
        reason: 'dex_only_fresh',
        gapBps,
      });
      continue;
    }

    if (spread != null && spread > params.maxCexSpreadBps) {
      raw.push({
        pair,
        slice,
        action: 'skip',
        reason: 'book_too_wide',
        gapBps,
      });
      continue;
    }

    if (!cexAvailable || cexAgeMs == null || cexAgeMs > params.maxCexStalenessMs) {
      raw.push({
        pair,
        slice,
        action: 'skip',
        reason: 'cex_stale',
        gapBps,
      });
      continue;
    }

    if (gapBps != null && gapBps >= params.confirmGapBps) {
      raw.push({
        pair,
        slice,
        action: 'confirm',
        reason: 'gap',
        gapBps,
      });
      continue;
    }

    raw.push({
      pair,
      slice,
      action: 'skip',
      reason: 'gap_too_small',
      gapBps,
    });
  }

  const confirmRank = (d: WatchPairDecision): number => {
    if (d.reason === 'gap') return 0;
    if (d.reason === 'dex_mid_missing') return 1;
    if (d.reason === 'dex_mid_stale') return 2;
    return 9;
  };

  const wouldConfirm = raw
    .filter((d) => d.action === 'confirm')
    .sort((a, b) => {
      const ra = confirmRank(a);
      const rb = confirmRank(b);
      if (ra !== rb) return ra - rb;
      return (b.gapBps ?? 0) - (a.gapBps ?? 0);
    });

  const cap = Math.max(0, params.maxConfirmPairs);
  const kept = new Set(
    wouldConfirm.slice(0, cap).map((d) => d.pair.targetAddress.toLowerCase())
  );

  const decisions = raw.map((d) => {
    if (
      d.action === 'confirm' &&
      !kept.has(d.pair.targetAddress.toLowerCase())
    ) {
      return { ...d, action: 'skip' as const, reason: 'rpc_budget' as const };
    }
    return d;
  });

  const skipCounts: Record<string, number> = {};
  let cexListedN = 0;
  let dexOnlyN = 0;
  const confirm: TradePair[] = [];
  for (const d of decisions) {
    if (d.slice === 'cexListed') cexListedN += 1;
    else dexOnlyN += 1;
    if (d.action === 'confirm') confirm.push(d.pair);
    else bump(skipCounts, d.reason);
  }

  return {
    decisions,
    confirm,
    hotN: params.pairs.length,
    cexListedN,
    dexOnlyN,
    confirmedN: confirm.length,
    skipCounts,
  };
}
