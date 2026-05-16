import type { BotConfig } from '../config/schema.js';
import type { BaseTokenSymbol } from '../config/baseTokens.js';
import { buildTradePairsForBot } from '../config/loadPairs.js';
import {
  computeEffectiveInForBase,
  getPriceHintsFromEnv,
  isAboveDustFloor,
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
}

export interface QuoteScannerOptions {
  pairDelayMs?: number;
  dexDelayMs?: number;
  maxPairsPerRun?: number;
  verbose?: boolean;
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
    const baseBalances = await this.balances.getBaseBalances(
      bot.address,
      bot.baseTokens
    );

    const heldBases = bot.baseTokens.filter((sym) => {
      const bal = baseBalances[sym as BaseTokenSymbol] ?? 0n;
      return bal > 0n;
    });

    if (heldBases.length === 0) {
      return {
        pairsScanned: 0,
        pairsSkipped: 0,
        opportunities: [],
        errors: 0,
      };
    }

    const allPairs = buildTradePairsForBot(bot);
    const pairs = allPairs.filter((p) =>
      heldBases.includes(p.baseSymbol)
    );

    const maxPairs = this.options.maxPairsPerRun ?? pairs.length;
    const slice = pairs.slice(0, maxPairs);

    let pairsScanned = 0;
    let pairsSkipped = 0;
    let errors = 0;
    const opportunities: ScanOpportunity[] = [];

    for (const tradePair of slice) {
      const balance =
        baseBalances[tradePair.baseSymbol] ??
        0n;
      const effectiveIn = computeEffectiveInForBase(
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

    return {
      pairsScanned,
      pairsSkipped,
      opportunities,
      errors,
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

export function formatScanSummary(
  botId: string,
  result: ScanResult,
  cache: OpportunityCache
): string {
  const lines = [
    `\nScan complete for bot "${botId}"`,
    `  pairs scanned:  ${result.pairsScanned}`,
    `  pairs skipped:  ${result.pairsSkipped}`,
    `  errors:         ${result.errors}`,
    `  opportunities this run: ${result.opportunities.length}`,
    `  cached total:   ${cache.list().length}`,
  ];
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
