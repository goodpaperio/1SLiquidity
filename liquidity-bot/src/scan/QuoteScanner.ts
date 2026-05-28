import type { BotConfig } from '../config/schema.js';
import {
  BASE_TOKEN_SYMBOLS,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import type { Provider } from 'ethers';
import { BalanceService } from './BalanceService.js';
import { DexQuoteService, STREAM_DEX_IDS } from './DexQuoteService.js';
import { formatOpportunityLine } from './formatOpportunity.js';
import { collectCandidateOpportunities } from '../selection/collectCandidates.js';
import {
  formatSelectedTradeBlock,
  formatSelectionLog,
  selectForExecution,
} from '../selection/selectForExecution.js';
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
const DEFAULT_DEX_DELAY = 0;

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

  async scanBot(bot: BotConfig): Promise<ScanResult> {
    const start = Date.now();
    const discoverMode = this.options.discoverMode === true;
    const baseBalances = await this.balances.getBaseBalances(
      bot.address,
      [...BASE_TOKEN_SYMBOLS]
    );

    const balanceStrings: Partial<Record<BaseTokenSymbol, string>> = {};
    for (const sym of BASE_TOKEN_SYMBOLS) {
      const b = baseBalances[sym as BaseTokenSymbol] ?? 0n;
      balanceStrings[sym as BaseTokenSymbol] = b.toString();
    }

    const heldBases = BASE_TOKEN_SYMBOLS.filter((sym) => {
      const bal = baseBalances[sym as BaseTokenSymbol] ?? 0n;
      return bal > 0n;
    }) as BaseTokenSymbol[];
    const knownTokens =
      this.cache.selectionStores().tradeHistory?.provenTokenAddresses() ??
      new Set<string>();
    const scanBases = discoverMode
      ? (bot.baseTokens as BaseTokenSymbol[])
      : heldBases;

    const diagnostics: ScanDiagnostics = {
      mode: discoverMode ? 'discover' : 'live',
      totalPairsInUniverse: 0,
      pairsConsidered: 0,
      heldBases,
      scanBases,
      baseBalances: balanceStrings,
    };

    console.log(
      `  [1/2] Quoting pairs (mode=${discoverMode ? 'discover' : 'wallet balance'})…`
    );

    const collected = await collectQuoteSnapshots(this, bot, {
      discoverMode,
      maxPairs: this.options.maxPairsPerRun,
      provenTokenAddresses: knownTokens,
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
    if (!discoverMode && collected.pairsConsidered === 0) {
      diagnostics.message =
        'No trusted funded routes to scan yet. Hold a configured base or prior traded token, or use scan:dry-run.';
      return emptyResult(diagnostics, Date.now() - start);
    }

    const edgeStart = Date.now();
    console.log(
      `  [2/2] Building coupled routes for ${collected.snapshots.length} pairs…`
    );

    const opportunities =
      bot.scan.selectionMode === 'mid_range_spread'
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
        : await this.detectRoundTripOpportunities(
            collected.snapshots,
            bot
          );

    const edgeSec = ((Date.now() - edgeStart) / 1000).toFixed(0);
    console.log(
      `  scan phases done: ${opportunities.length} safe candidates (${edgeSec}s edge pass)`
    );

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
    const dexDelay = this.options.dexDelayMs ?? DEFAULT_DEX_DELAY;
    const results = [];
    for (const dex of STREAM_DEX_IDS) {
      const q = await this.quotes.quoteDex(dex, tokenIn, tokenOut, amountIn);
      if (q) results.push(q);
      if (dexDelay > 0) await sleep(dexDelay);
    }
    return results;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function emptyResult(
  diagnostics: ScanDiagnostics,
  durationMs: number
): ScanResult {
  return {
    pairsScanned: 0,
    pairsSkipped: 0,
    opportunities: [],
    errors: 0,
    diagnostics,
    durationMs,
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
