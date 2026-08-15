import type { BotConfig } from '../config/schema.js';
import type { BaseTokenSymbol } from '../config/baseTokens.js';
import type { Provider } from 'ethers';
import { BalanceService } from './BalanceService.js';
import { DexQuoteService } from './DexQuoteService.js';
import { formatOpportunityLine } from './formatOpportunity.js';
import { collectCandidateOpportunities } from '../selection/collectCandidates.js';
import {
  formatSelectedTradeBlock,
  formatSelectionLog,
  selectForExecution,
} from '../selection/selectForExecution.js';
import {
  formatFinalistRefreshLog,
  selectForExecutionWithFinalistRefresh,
  type FinalistSelectionResult,
} from '../selection/finalistRefresh.js';
import { detectOpportunitiesForPair } from './opportunityDetector.js';
import { OpportunityCache } from './OpportunityCache.js';
import type { ScanOpportunity } from './types.js';
import {
  collectQuoteSnapshots,
  type CollectQuotesResult,
  type PairQuoteSnapshot,
} from './collectQuotes.js';

export interface ScanResult {
  pairsScanned: number;
  pairsSkipped: number;
  opportunities: ScanOpportunity[];
  errors: number;
  diagnostics: ScanDiagnostics;
  durationMs: number;
  watch?: CollectQuotesResult['watch'];
}

/** Why a run did or did not quote pairs. */
export interface ScanDiagnostics {
  mode: 'live' | 'discover';
  totalPairsInUniverse: number;
  pairsConsidered: number;
  heldBases: BaseTokenSymbol[];
  scanBases: BaseTokenSymbol[];
  baseBalances: Partial<Record<BaseTokenSymbol, string>>;
  message?: string;
}

export interface QuoteScannerOptions {
  pairDelayMs?: number;
  dexDelayMs?: number;
  maxPairsPerRun?: number;
  verbose?: boolean;
  /**
   * Dry-run / discovery: quote all configured bases at nominalTradeUsd
   * without requiring wallet balance. Live trading still uses balances only.
   */
  discoverMode?: boolean;
}

const DEFAULT_PAIR_DELAY = 50;

export interface QuoteScannerDeps {
  balanceService?: BalanceService;
  quoteService?: DexQuoteService;
}

export class QuoteScanner {
  private readonly balances: BalanceService;
  private readonly quotes: DexQuoteService;

  constructor(
    _provider: Provider,
    private readonly cache: OpportunityCache,
    private readonly options: QuoteScannerOptions = {},
    deps: QuoteScannerDeps = {}
  ) {
    this.balances = deps.balanceService ?? new BalanceService(_provider);
    this.quotes = deps.quoteService ?? new DexQuoteService(_provider);
  }

  getBaseBalances(holder: string, bases: BaseTokenSymbol[]) {
    return this.balances.getBaseBalances(holder, bases);
  }

  getTokenBalance(holder: string, token: string) {
    return this.balances.getTokenBalance(holder, token);
  }

  getTokenBalances(holder: string, tokens: readonly string[]) {
    return this.balances.getTokenBalances(holder, tokens);
  }

  async fetchQuotesForPair(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ) {
    const quotes = await this.fetchQuotesWithDelay(tokenIn, tokenOut, amountIn);
    await sleep(this.options.pairDelayMs ?? DEFAULT_PAIR_DELAY);
    return quotes;
  }

  async collectQuotes(bot: BotConfig): Promise<CollectQuotesResult> {
    return collectQuoteSnapshots(this, bot, {
      discoverMode: this.options.discoverMode === true,
      maxPairs: this.options.maxPairsPerRun,
    });
  }

  /**
   * Coarse scan selection + optional top-N finalist re-quote (fresh coupled edges).
   */
  async finalizeExecutionSelection(
    bot: BotConfig,
    opportunities: ScanOpportunity[],
    stores?: ReturnType<OpportunityCache['selectionStores']>
  ): Promise<FinalistSelectionResult> {
    return selectForExecutionWithFinalistRefresh(
      bot,
      opportunities,
      this.quotes,
      stores
    );
  }

  async scanBot(bot: BotConfig): Promise<ScanResult> {
    const { beginCycleMetrics, endCycleMetrics, formatCycleMetrics, recordSkip } =
      await import('../ops/cycleMetrics.js');
    const metrics = beginCycleMetrics();
    const start = Date.now();
    const discoverMode = this.options.discoverMode === true;
    const knownTokens =
      this.cache.selectionStores().tradeHistory?.provenTokenAddresses() ??
      new Set<string>();
    const recentTargets =
      this.cache
        .selectionStores()
        .tradeHistory?.recentTargetNames(bot.scan.skipRecentTargetsCount) ??
      new Set<string>();

    const diagnostics: ScanDiagnostics = {
      mode: discoverMode ? 'discover' : 'live',
      totalPairsInUniverse: 0,
      pairsConsidered: 0,
      heldBases: [],
      scanBases: bot.baseTokens as BaseTokenSymbol[],
      baseBalances: {},
    };

    const collected = await collectQuoteSnapshots(this, bot, {
      discoverMode,
      maxPairs: this.options.maxPairsPerRun,
      provenTokenAddresses: knownTokens,
      recentTargetNames: recentTargets,
      onProgress: (p) => {
        if (p.index % 10 === 0 || p.index === p.total) {
          console.log(
            `        quotes ${p.index}/${p.total} ${p.pair.baseSymbol}→${p.pair.targetName}  ${(p.elapsedMs / 1000).toFixed(0)}s`
          );
        }
      },
    });
    diagnostics.totalPairsInUniverse = collected.totalPairsInUniverse;
    diagnostics.pairsConsidered = collected.pairsConsidered;
    diagnostics.scanBases = collected.scanBases;
    if (collected.hotPairs) {
      metrics.hotPairsCount = collected.totalPairsInUniverse;
      metrics.hotCacheAgeMs = collected.hotPairs.cacheAgeMs;
      metrics.hotPairsSource = collected.hotPairs.source;
      if (collected.hotPairs.skipReason) {
        recordSkip(metrics, collected.hotPairs.skipReason);
      }
      if (collected.totalPairsInUniverse === 0) {
        recordSkip(metrics, 'empty_hot_set');
      }
    }
    if (collected.watch) {
      metrics.watchHotN = collected.watch.hotN;
      metrics.watchCexListedN = collected.watch.cexListedN;
      metrics.watchDexOnlyN = collected.watch.dexOnlyN;
      metrics.watchConfirmedN = collected.watch.confirmedN;
      for (const [reason, n] of Object.entries(collected.watch.skipCounts)) {
        for (let i = 0; i < n; i++) recordSkip(metrics, reason);
      }
    }

    const quoting = collected.snapshots.length > 0;
    const watchIdle = collected.hotPairs?.skipReason === 'watch_idle';
    console.log(
      quoting
        ? `  [1/2] Quoting ${collected.snapshots.length} confirm pair(s) (mode=${discoverMode ? 'discover' : 'wallet balance'})…`
        : watchIdle
          ? `  [1/2] Watch idle — 0 quote RPC (mode=${discoverMode ? 'discover' : 'wallet balance'})`
          : `  [1/2] No pairs to quote (mode=${discoverMode ? 'discover' : 'wallet balance'})`
    );
    if (watchIdle) {
      diagnostics.message =
        'Watch idle — no CEX–DEX gap large enough (and DEX mids still fresh). 0 quote RPC.';
      console.log(`  ${formatCycleMetrics(metrics)}`);
      endCycleMetrics();
      return emptyResult(diagnostics, Date.now() - start, collected.watch);
    }
    if (!discoverMode && collected.pairsConsidered === 0) {
      diagnostics.message =
        'No trusted funded routes to scan yet. Hold a configured base or prior traded token, or use scan:dry-run.';
      console.log(`  ${formatCycleMetrics(metrics)}`);
      endCycleMetrics();
      return emptyResult(diagnostics, Date.now() - start, collected.watch);
    }

    const edgeStart = Date.now();
    console.log(
      `  [2/2] Building coupled routes for ${collected.snapshots.length} pairs…`
    );

    const useCandidateEdges =
      bot.scan.selectionMode === 'mid_range_spread' ||
      bot.scan.selectionMode === 'price_vs_depth';
    const opportunities = useCandidateEdges
      ? await collectCandidateOpportunities(
          collected.snapshots,
          bot,
          this.quotes,
          {
            onProgress: (p) => {
              if (p.index % 10 === 0 || p.index === p.total) {
                console.log(
                  `        edges ${p.index}/${p.total} ${p.pair.baseSymbol}→${p.pair.targetName}  (+${p.candidates} candidates)`
                );
              }
            },
          }
        )
      : await this.detectRoundTripOpportunities(collected.snapshots, bot);

    if (opportunities.length === 0) {
      recordSkip(metrics, 'no_candidates');
    }

    const edgeSec = ((Date.now() - edgeStart) / 1000).toFixed(0);
    console.log(
      `  scan phases done: ${opportunities.length} safe candidates (${edgeSec}s edge pass)`
    );
    console.log(`  ${formatCycleMetrics(metrics)}`);
    endCycleMetrics();

    if (this.options.verbose) {
      const sel = selectForExecution(bot, opportunities, this.cache.selectionStores());
      console.log(`  ${formatSelectionLog(sel)}`);
      for (const o of opportunities.slice(0, 20)) {
        console.log(
          `  candidate ${o.baseSymbol}→${o.targetName} ${o.direction} ` +
            `coupled=${o.roundTripBps}bps buySpr=${o.buySpreadBps} ` +
            `leg1@${o.candidateDex}`
        );
      }
      console.log(
        formatSelectedTradeBlock(sel, {
          headline: 'SELECTED TRADE THIS RUN (pre-cache)',
        })
      );
    }

    this.cache.upsertMany(opportunities);

    return {
      pairsScanned: collected.pairsScanned,
      pairsSkipped: collected.pairsSkipped,
      opportunities,
      errors: collected.errors,
      diagnostics,
      durationMs: collected.durationMs,
      watch: collected.watch,
    };
  }

  private async detectRoundTripOpportunities(
    snapshots: PairQuoteSnapshot[],
    bot: BotConfig
  ): Promise<ScanOpportunity[]> {
    const opportunities: ScanOpportunity[] = [];
    for (const snap of snapshots) {
      const found = await detectOpportunitiesForPair(
        snap.tradePair,
        snap.amountIn,
        snap.quotes,
        bot,
        this.quotes
      );
      opportunities.push(...found);
    }
    return opportunities;
  }

  private async fetchQuotesWithDelay(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ) {
    return this.quotes.quotePair(tokenIn, tokenOut, amountIn);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function emptyResult(
  diagnostics: ScanDiagnostics,
  durationMs: number,
  watch?: ScanResult['watch']
): ScanResult {
  return {
    pairsScanned: 0,
    pairsSkipped: 0,
    opportunities: [],
    errors: 0,
    diagnostics,
    durationMs,
    watch,
  };
}

function formatBalanceRow(
  sym: BaseTokenSymbol,
  wei: string | undefined
): string {
  const w = wei ?? '0';
  if (sym === 'USDC' || sym === 'USDT') {
    return `${sym}: ${(Number(w) / 1e6).toFixed(2)}`;
  }
  if (sym === 'DAI') {
    return `${sym}: ${(Number(w) / 1e18).toFixed(4)}`;
  }
  if (sym === 'WETH') {
    return `${sym}: ${(Number(w) / 1e18).toFixed(6)} ETH`;
  }
  if (sym === 'WBTC') {
    return `${sym}: ${(Number(w) / 1e8).toFixed(8)} BTC`;
  }
  return `${sym}: ${w} wei`;
}

export { formatFinalistRefreshLog };

export function formatScanSummary(
  botId: string,
  bot: BotConfig,
  result: ScanResult,
  cache: OpportunityCache
): string {
  const d = result.diagnostics;
  const lines = [
    `\nScan complete for bot "${botId}"`,
    `  mode:           ${d.mode}${d.mode === 'discover' ? ' (nominal $ size, no balance required)' : ' (held balances only)'}`,
    `  pair universe:  ${d.totalPairsInUniverse} pairs`,
    `  considering:    ${d.pairsConsidered} pairs across [${d.scanBases.join(', ')}]`,
    ...(result.watch
      ? [
          `  watch:          hot=${result.watch.hotN} cexListed=${result.watch.cexListedN} dexOnly=${result.watch.dexOnlyN} confirm=${result.watch.confirmedN}`,
        ]
      : []),
    `  wallet balances:`,
    ...(Object.keys(d.baseBalances) as BaseTokenSymbol[]).map(
      (sym) => `    ${formatBalanceRow(sym, d.baseBalances[sym])}`
    ),
    `  pairs scanned:  ${result.pairsScanned}`,
    `  pairs skipped:  ${result.pairsSkipped}`,
    `  errors:         ${result.errors}`,
    `  duration:       ${(result.durationMs / 1000).toFixed(1)}s`,
    `  opportunities this run: ${result.opportunities.length}`,
    `  cached total:   ${cache.list().length}`,
  ];
  const blocked = cache.countBlockedByCooldown();
  if (blocked > 0) {
    lines.push(`  on pair cooldown: ${blocked} (skipped for execution pick)`);
  }
  const stores = cache.selectionStores();
  const beforeHistory = stores.tradeHistory
    ? stores.tradeHistory.filterEligible(result.opportunities).length
    : result.opportunities.length;
  const sel = cache.executionSelection(bot);
  lines.push(`  ${formatSelectionLog(sel)}`);
  lines.push(
    `  coupled floor:  ${bot.scan.minCoupledSpreadBps} bps (~${(Math.abs(bot.scan.minCoupledSpreadBps) / 100).toFixed(2)}% max quoted loss)`
  );
  if (stores.tradeHistory) {
    lines.push(
      `  repeat guard:   block pair if in last ${bot.trade.minTradesBetweenSamePair} live trades (fwd+rev)`
    );
    lines.push(
      `  trade history:  ${stores.tradeHistory.recentSummary(8)}`
    );
    if (beforeHistory > (sel.pick ? 1 : 0) && beforeHistory < result.opportunities.length) {
      lines.push(
        `  repeat skips:   ${result.opportunities.length - beforeHistory} candidates removed`
      );
    }
  }
  if (d.message) {
    lines.push(`  note: ${d.message}`);
  }
  if (result.opportunities.length > 0) {
    lines.push('\n  Top candidates (coupled bps):');
    const top = [...result.opportunities]
      .sort((a, b) => b.roundTripBps - a.roundTripBps)
      .slice(0, 15);
    for (const o of top) {
      lines.push(`    ${formatOpportunityLine(o)}`);
    }
  }
  const summaryBody = lines.join('\n');
  const pickBlock = formatSelectedTradeBlock(sel, {
    headline:
      d.mode === 'discover'
        ? 'DRY-RUN: would execute (discover / nominal $)'
        : 'WOULD EXECUTE THIS RUN (wallet-sized quotes)',
    emptyMessage:
      blocked > 0
        ? 'No trade — candidates on pair cooldown or filtered out.'
        : undefined,
  });
  return summaryBody + pickBlock;
}
