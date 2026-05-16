import type { BotConfig } from '../config/schema.js';
import type { BaseTokenSymbol } from '../config/baseTokens.js';
import { buildTradePairsForBot } from '../config/loadPairs.js';
import {
  computeEffectiveInForBase,
  getPriceHintsFromEnv,
  isAboveDustFloor,
  nominalUsdToBaseAmount,
} from '../config/sizing.js';
import type { Provider } from 'ethers';
import { BalanceService } from './BalanceService.js';
import { DexQuoteService, STREAM_DEX_IDS } from './DexQuoteService.js';
import { detectOpportunitiesForPair } from './opportunityDetector.js';
import { OpportunityCache } from './OpportunityCache.js';
import type { ScanOpportunity } from './types.js';

export interface ScanResult {
  pairsScanned: number;
  pairsSkipped: number;
  opportunities: ScanOpportunity[];
  errors: number;
  diagnostics: ScanDiagnostics;
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

  async scanBot(bot: BotConfig): Promise<ScanResult> {
    const hints = getPriceHintsFromEnv();
    const discoverMode = this.options.discoverMode === true;
    const baseBalances = await this.balances.getBaseBalances(
      bot.address,
      bot.baseTokens
    );

    const balanceStrings: Partial<Record<BaseTokenSymbol, string>> = {};
    for (const sym of bot.baseTokens) {
      const b = baseBalances[sym as BaseTokenSymbol] ?? 0n;
      balanceStrings[sym as BaseTokenSymbol] = b.toString();
    }

    const heldBases = bot.baseTokens.filter((sym) => {
      const bal = baseBalances[sym as BaseTokenSymbol] ?? 0n;
      return bal > 0n;
    }) as BaseTokenSymbol[];

    const scanBases = (
      discoverMode ? bot.baseTokens : heldBases
    ) as BaseTokenSymbol[];

    const allPairs = buildTradePairsForBot(bot);
    const pairs = allPairs.filter((p) => scanBases.includes(p.baseSymbol));

    const diagnostics: ScanDiagnostics = {
      mode: discoverMode ? 'discover' : 'live',
      totalPairsInUniverse: allPairs.length,
      pairsConsidered: pairs.length,
      heldBases,
      scanBases,
      baseBalances: balanceStrings,
    };

    if (scanBases.length === 0) {
      diagnostics.message =
        'No base tokens to scan. Fund the wallet with USDC/WETH/etc., or use scan:dry-run (discover mode).';
      return emptyResult(diagnostics);
    }

    const maxPairs = this.options.maxPairsPerRun ?? pairs.length;
    const slice = pairs.slice(0, maxPairs);

    if (slice.length === 0) {
      diagnostics.message = 'No pairs matched configured base tokens.';
      return emptyResult(diagnostics);
    }

    let pairsScanned = 0;
    let pairsSkipped = 0;
    let errors = 0;
    const opportunities: ScanOpportunity[] = [];

    for (const tradePair of slice) {
      const balance = baseBalances[tradePair.baseSymbol] ?? 0n;
      const effectiveIn = discoverMode
        ? nominalUsdToBaseAmount(
            tradePair.baseSymbol,
            bot.trade.nominalTradeUsd,
            hints
          )
        : computeEffectiveInForBase(
            bot,
            tradePair.baseSymbol,
            balance,
            hints
          );

      if (
        effectiveIn <= 0n ||
        !isAboveDustFloor(effectiveIn, tradePair.baseSymbol, hints)
      ) {
        pairsSkipped++;
        continue;
      }

      try {
        const dexQuotes = await this.fetchQuotesWithDelay(
          tradePair.tokenIn,
          tradePair.tokenOut,
          effectiveIn
        );
        const found = detectOpportunitiesForPair(
          tradePair,
          effectiveIn,
          dexQuotes,
          bot
        );
        opportunities.push(...found);
        this.cache.upsertMany(found);
        pairsScanned++;

        if (this.options.verbose && found.length > 0) {
          for (const o of found) {
            console.log(
              `  opportunity ${o.baseSymbol}→${o.targetName} ${o.spreadBps}bps ` +
                `${o.candidateDex} vs ref ${o.referenceDex}`
            );
          }
        }
      } catch {
        errors++;
      }

      await sleep(this.options.pairDelayMs ?? DEFAULT_PAIR_DELAY);
    }

    if (pairsScanned === 0 && pairsSkipped === slice.length) {
      diagnostics.message =
        'All pairs skipped (dust or zero effective size). In live mode fund bases; in discover mode check nominalTradeUsd.';
    }

    return {
      pairsScanned,
      pairsSkipped,
      opportunities,
      errors,
      diagnostics,
    };
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

function emptyResult(diagnostics: ScanDiagnostics): ScanResult {
  return {
    pairsScanned: 0,
    pairsSkipped: 0,
    opportunities: [],
    errors: 0,
    diagnostics,
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
    `  opportunities this run: ${result.opportunities.length}`,
    `  cached total:   ${cache.list().length}`,
  ];
  if (d.message) {
    lines.push(`  note: ${d.message}`);
  }
  if (result.opportunities.length > 0) {
    lines.push('\n  Top opportunities:');
    const top = [...result.opportunities]
      .sort((a, b) => b.spreadBps - a.spreadBps)
      .slice(0, 15);
    for (const o of top) {
      lines.push(
        `    ${o.baseSymbol}→${o.targetName.padEnd(12)} ${String(o.spreadBps).padStart(5)} bps  ` +
          `buy@${o.candidateDex}  stream@${o.referenceDex}`
      );
    }
  }
  lines.push('');
  return lines.join('\n');
}
