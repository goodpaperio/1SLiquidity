import type { BotConfig } from '../config/schema.js';
import {
  BASE_TOKEN_ADDRESSES,
  BASE_TOKEN_SYMBOLS,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import type { TradePair } from '../config/loadPairs.js';
import { buildTradePairsForBaseSymbols } from '../config/loadPairs.js';
import {
  computeEffectiveInForBase,
  computeEffectiveTradeAmount,
  getPriceHints,
  isAboveDustFloor,
  nominalUsdToBaseAmount,
} from '../config/sizing.js';
import type { TradeDirection } from './types.js';
import type { DexQuote } from './types.js';
import type { QuoteScanner } from './QuoteScanner.js';
import { ethCallBudgetExceeded } from '../ops/cycleMetrics.js';
import type { SelectConfirmSetResult } from '../signal/watchTrigger.js';

export interface PairQuoteSnapshot {
  tradePair: TradePair;
  direction: TradeDirection;
  amountIn: bigint;
  quotes: DexQuote[];
}

export interface CollectQuotesResult {
  snapshots: PairQuoteSnapshot[];
  pairsScanned: number;
  pairsSkipped: number;
  errors: number;
  durationMs: number;
  totalPairsInUniverse: number;
  pairsConsidered: number;
  scanBases: BaseTokenSymbol[];
  /** Present when universeMode is hot_pairs. */
  hotPairs?: {
    source: string;
    cacheAgeMs: number | null;
    skipReason?: string;
  };
  /** Present when watchMode is on for hot_pairs. */
  watch?: SelectConfirmSetResult;
}

export type ProgressCallback = (info: {
  index: number;
  total: number;
  pair: TradePair;
  elapsedMs: number;
}) => void;

/** One RPC pass over the universe; reuse snapshots for BPS threshold sweeps. */
export async function collectQuoteSnapshots(
  scanner: QuoteScanner,
  bot: BotConfig,
  options: {
    discoverMode: boolean;
    maxPairs?: number;
    provenTokenAddresses?: Set<string>;
    recentTargetNames?: Set<string>;
    onProgress?: ProgressCallback;
  }
): Promise<CollectQuotesResult> {
  const start = Date.now();
  const discoverMode = options.discoverMode;
  const configuredBases = bot.baseTokens as BaseTokenSymbol[];
  const useHotPairs = bot.scan.universeMode === 'hot_pairs';
  const watchOn = useHotPairs && bot.scan.watchMode !== 'off';

  let allPairs: TradePair[] = [];
  let hotPairsMeta: CollectQuotesResult['hotPairs'];
  let watch: SelectConfirmSetResult | undefined;
  /** Configured bases until we know we will quote (avoids RPC on idle watch). */
  let scanBases: BaseTokenSymbol[] = configuredBases;

  if (useHotPairs) {
    const { resolveHotPairsForBot } = await import('./hotPairs.js');
    const hot = await resolveHotPairsForBot(bot);
    hotPairsMeta = {
      source: hot.source,
      cacheAgeMs: hot.cacheAgeMs,
      skipReason: hot.skipReason,
    };
    allPairs = hot.pairs.filter((p) =>
      configuredBases.includes(p.baseSymbol as BaseTokenSymbol)
    );
    if (allPairs.length === 0) {
      return {
        snapshots: [],
        pairsScanned: 0,
        pairsSkipped: 0,
        errors: 0,
        durationMs: Date.now() - start,
        totalPairsInUniverse: 0,
        pairsConsidered: 0,
        scanBases,
        hotPairs: hotPairsMeta,
      };
    }

    if (bot.scan.warmSetMode !== 'off' || watchOn) {
      const { warmTargetAddressSet, refreshWarmSetFromCex } = await import(
        '../signal/warmSet.js'
      );
      const { getLiveTickers } = await import('../signal/cexLive.js');
      const liveFresh = [...getLiveTickers().values()].some(
        (t) => Date.now() - t.fetchedAtMs <= bot.scan.maxCexStalenessMs
      );

      if (!liveFresh) {
        try {
          await refreshWarmSetFromCex(bot);
        } catch {
          // keep last warm file / live tickers
        }
      }

      if (!watchOn) {
        const warm = warmTargetAddressSet(bot.id);
        if (warm && warm.size > 0) {
          const before = allPairs.length;
          allPairs = allPairs.filter((p) =>
            warm.has(p.targetAddress.toLowerCase())
          );
          console.log(
            `  warmSet: mode=${bot.scan.warmSetMode} ` +
              `cexWarm=${warm.size} quoted=${allPairs.length}/${before}`
          );
        } else if (bot.scan.warmSetMode === 'require') {
          console.log('  warmSet: require but empty — skipping quotes');
          return {
            snapshots: [],
            pairsScanned: 0,
            pairsSkipped: 0,
            errors: 0,
            durationMs: Date.now() - start,
            totalPairsInUniverse: 0,
            pairsConsidered: 0,
            scanBases,
            hotPairs: {
              ...hotPairsMeta,
              skipReason: 'warm_set_empty',
            },
          };
        }
      }
    }

    const { readWarmSet } = await import('../signal/warmSet.js');
    const { readDexMidCache } = await import('../signal/dexMidCache.js');
    const { rankPairsForQuote } = await import('../signal/cexDexRank.js');
    const { getLiveTickers } = await import('../signal/cexLive.js');
    const {
      selectConfirmSet,
      confirmGapThresholdBps,
      formatWatchLine,
    } = await import('../signal/watchTrigger.js');

    const warmFile = readWarmSet(bot.id);
    const lastMids = readDexMidCache(bot.id)?.rows ?? [];
    const liveTickers = getLiveTickers();
    const cexAvailable = (warmFile?.pairs.length ?? 0) > 0 || liveTickers.size > 0;

    if (watchOn) {
      if (bot.scan.watchMode === 'require' && !cexAvailable) {
        console.log('  watch: require but no CEX books — skipping quotes');
        return {
          snapshots: [],
          pairsScanned: 0,
          pairsSkipped: 0,
          errors: 0,
          durationMs: Date.now() - start,
          totalPairsInUniverse: allPairs.length,
          pairsConsidered: 0,
          scanBases,
          hotPairs: {
            ...hotPairsMeta,
            skipReason: 'cex_unavailable',
          },
        };
      }

      const warmFetchedAtMs = warmFile?.fetchedAt
        ? Date.parse(warmFile.fetchedAt)
        : null;
      watch = selectConfirmSet({
        pairs: allPairs,
        warm: warmFile?.pairs ?? [],
        lastMids,
        nowMs: Date.now(),
        confirmGapBps: confirmGapThresholdBps(bot),
        maxCexSpreadBps: bot.scan.warmMaxCexSpreadBps,
        maxCexStalenessMs: bot.scan.maxCexStalenessMs,
        maxDexMidAgeMs: bot.scan.maxDexMidAgeMs,
        maxConfirmPairs: bot.scan.maxConfirmPairs,
        liveTickers,
        warmFetchedAtMs: Number.isFinite(warmFetchedAtMs)
          ? warmFetchedAtMs
          : null,
        cexAvailable,
      });
      console.log(`  ${formatWatchLine(watch)}`);
      allPairs = watch.confirm;
      if (allPairs.length === 0) {
        return {
          snapshots: [],
          pairsScanned: 0,
          pairsSkipped: watch.hotN,
          errors: 0,
          durationMs: Date.now() - start,
          totalPairsInUniverse: watch.hotN,
          pairsConsidered: 0,
          scanBases,
          hotPairs: {
            ...hotPairsMeta,
            skipReason: 'watch_idle',
          },
          watch,
        };
      }
    } else if (warmFile?.pairs.length || lastMids.length) {
      allPairs = rankPairsForQuote(allPairs, warmFile?.pairs ?? [], lastMids);
    }
  }

  const hints = await getPriceHints();
  const baseBalances = await scanner.getBaseBalances(bot.address, [
    ...BASE_TOKEN_SYMBOLS,
  ]);
  const heldBases = BASE_TOKEN_SYMBOLS.filter(
    (sym) => (baseBalances[sym as BaseTokenSymbol] ?? 0n) > 0n
  ) as BaseTokenSymbol[];
  const activeBaseSet = new Set<BaseTokenSymbol>(configuredBases);
  if (!discoverMode) {
    for (const sym of heldBases) activeBaseSet.add(sym);
    for (const token of options.provenTokenAddresses ?? []) {
      const lower = token.toLowerCase();
      for (const sym of BASE_TOKEN_SYMBOLS) {
        if (BASE_TOKEN_ADDRESSES[sym].toLowerCase() === lower) {
          activeBaseSet.add(sym);
        }
      }
    }
  }
  scanBases = (discoverMode ? configuredBases : [...activeBaseSet]) as BaseTokenSymbol[];

  if (!useHotPairs) {
    allPairs = buildTradePairsForBaseSymbols(
      scanBases,
      bot.scan.excludedTargets
    );
  }

  const tradableTokens = new Set<string>(
    [...(options.provenTokenAddresses ?? [])].map((x) => x.toLowerCase())
  );
  for (const sym of configuredBases) {
    tradableTokens.add(BASE_TOKEN_ADDRESSES[sym].toLowerCase());
  }

  const recentTargets = options.recentTargetNames ?? new Set<string>();
  const pairs = discoverMode
    ? allPairs
    : allPairs.filter((p) => {
        if (recentTargets.has(p.targetName.trim().toLowerCase())) return false;
        const baseHeld = (baseBalances[p.baseSymbol] ?? 0n) > 0n;
        const altTrusted = tradableTokens.has(p.targetAddress.toLowerCase());
        return baseHeld || altTrusted;
      });
  const hardCap = useHotPairs ? bot.scan.hotPairsLimit : pairs.length;
  const slice = pairs.slice(
    0,
    Math.min(options.maxPairs ?? hardCap, hardCap)
  );

  let altBalances = new Map<string, bigint>();
  if (!discoverMode && slice.length > 0) {
    try {
      altBalances = await scanner.getTokenBalances(
        bot.address,
        slice.map((p) => p.tokenOut)
      );
    } catch {
      // per-pair getTokenBalance fallback below
    }
  }

  const snapshots: PairQuoteSnapshot[] = [];
  let pairsScanned = 0;
  let pairsSkipped = 0;
  let errors = 0;

  for (let i = 0; i < slice.length; i++) {
    if (ethCallBudgetExceeded(bot.scan.maxEthCallsPerCycle)) {
      console.log(
        `  rpcCap: maxEthCallsPerCycle=${bot.scan.maxEthCallsPerCycle} ` +
          `hit after ${i}/${slice.length} pairs — remaining skipped`
      );
      pairsSkipped += slice.length - i;
      break;
    }
    const tradePair = slice[i];
    let pairHadScan = false;

    const baseBalance = baseBalances[tradePair.baseSymbol] ?? 0n;
    const effectiveBaseIn = discoverMode
      ? nominalUsdToBaseAmount(
          tradePair.baseSymbol,
          bot.trade.nominalTradeUsd,
          hints
        )
      : computeEffectiveInForBase(bot, tradePair.baseSymbol, baseBalance, hints);

    if (
      effectiveBaseIn > 0n &&
      isAboveDustFloor(
        effectiveBaseIn,
        tradePair.baseSymbol,
        bot.scan.dustFloorUsd,
        hints
      )
    ) {
      try {
        const quotes = await scanner.fetchQuotesForPair(
          tradePair.tokenIn,
          tradePair.tokenOut,
          effectiveBaseIn
        );
        snapshots.push({
          tradePair,
          direction: 'forward',
          amountIn: effectiveBaseIn,
          quotes,
        });
        pairHadScan = true;
      } catch {
        errors++;
      }
    }

    if (!discoverMode) {
      let altBalance =
        altBalances.get(tradePair.tokenOut.toLowerCase()) ?? 0n;
      if (altBalances.size === 0) {
        try {
          altBalance = await scanner.getTokenBalance(
            bot.address,
            tradePair.tokenOut
          );
        } catch {
          errors++;
        }
      }

      const effectiveAltIn = computeEffectiveTradeAmount(
        altBalance,
        altBalance,
        bot.trade.balanceUsagePct
      );

      if (effectiveAltIn > 0n) {
        try {
          const sellQuotes = await scanner.fetchQuotesForPair(
            tradePair.tokenOut,
            tradePair.tokenIn,
            effectiveAltIn
          );
          const refOut =
            sellQuotes.find((q) => q.amountOut > 0n)?.amountOut ?? 0n;
          const dustOk =
            refOut > 0n &&
            isAboveDustFloor(
              refOut,
              tradePair.baseSymbol,
              bot.scan.dustFloorUsd,
              hints
            );

          if (dustOk) {
            snapshots.push({
              tradePair,
              direction: 'reverse',
              amountIn: effectiveAltIn,
              quotes: sellQuotes,
            });
            pairHadScan = true;
          }
        } catch {
          errors++;
        }
      }
    }

    if (pairHadScan) {
      pairsScanned++;
    } else {
      pairsSkipped++;
    }

    options.onProgress?.({
      index: i + 1,
      total: slice.length,
      pair: tradePair,
      elapsedMs: Date.now() - start,
    });
  }

  try {
    const { writeDexMidCache, readDexMidCache } = await import(
      '../signal/dexMidCache.js'
    );
    const { impliedUsdPerAlt } = await import('../signal/cexDexRank.js');
    const prev = readDexMidCache(bot.id)?.rows ?? [];
    const byAddr = new Map(
      prev.map((r) => [r.targetAddress.toLowerCase(), r])
    );
    for (const s of snapshots.filter((x) => x.direction === 'forward')) {
      const best = s.quotes.reduce(
        (a, q) => (q.amountOut > a ? q.amountOut : a),
        0n
      );
      const usd = impliedUsdPerAlt({
        baseSymbol: s.tradePair.baseSymbol,
        amountIn: s.amountIn,
        amountOut: best,
        hints,
      });
      if (usd == null) continue;
      byAddr.set(s.tradePair.targetAddress.toLowerCase(), {
        targetAddress: s.tradePair.targetAddress,
        targetName: s.tradePair.targetName,
        baseSymbol: s.tradePair.baseSymbol,
        usdPerAlt: usd,
        fetchedAt: new Date().toISOString(),
      });
    }
    const rows = [...byAddr.values()];
    if (rows.length > 0) writeDexMidCache(bot.id, rows);
  } catch {
    // cache is best-effort
  }

  return {
    snapshots,
    pairsScanned,
    pairsSkipped,
    errors,
    durationMs: Date.now() - start,
    totalPairsInUniverse: watch?.hotN ?? allPairs.length,
    pairsConsidered: pairs.length,
    scanBases,
    hotPairs: hotPairsMeta,
    watch,
  };
}
