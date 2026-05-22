import type { BotConfig } from '../config/schema.js';
import type { BaseTokenSymbol } from '../config/baseTokens.js';
import type { TradePair } from '../config/loadPairs.js';
import { buildTradePairsForBot } from '../config/loadPairs.js';
import {
  computeEffectiveInForBase,
  computeEffectiveTradeAmount,
  getPriceHintsFromEnv,
  isAboveDustFloor,
  nominalUsdToBaseAmount,
} from '../config/sizing.js';
import type { TradeDirection } from './types.js';
import type { DexQuote } from './types.js';
import type { QuoteScanner } from './QuoteScanner.js';

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
    onProgress?: ProgressCallback;
  }
): Promise<CollectQuotesResult> {
  const start = Date.now();
  const hints = getPriceHintsFromEnv();
  const discoverMode = options.discoverMode;

  const baseBalances = await scanner.getBaseBalances(bot.address, bot.baseTokens);
  const heldBases = bot.baseTokens.filter(
    (sym) => (baseBalances[sym as BaseTokenSymbol] ?? 0n) > 0n
  ) as BaseTokenSymbol[];
  const scanBases = (discoverMode ? bot.baseTokens : heldBases) as BaseTokenSymbol[];

  const allPairs = buildTradePairsForBot(bot);
  const pairs = allPairs.filter((p) => scanBases.includes(p.baseSymbol));
  const slice = pairs.slice(0, options.maxPairs ?? pairs.length);

  const snapshots: PairQuoteSnapshot[] = [];
  let pairsScanned = 0;
  let pairsSkipped = 0;
  let errors = 0;

  for (let i = 0; i < slice.length; i++) {
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
      isAboveDustFloor(effectiveBaseIn, tradePair.baseSymbol, hints)
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
      let altBalance = 0n;
      try {
        altBalance = await scanner.getTokenBalance(
          bot.address,
          tradePair.tokenOut
        );
      } catch {
        errors++;
      }

      const effectiveAltIn = computeEffectiveTradeAmount(
        altBalance,
        altBalance,
        bot.trade.balanceUsagePct
      );

      if (effectiveAltIn > 0n) {
        try {
          const refBase = await scanner.fetchQuotesForPair(
            tradePair.tokenOut,
            tradePair.tokenIn,
            effectiveAltIn
          );
          const refOut =
            refBase.find((q) => q.amountOut > 0n)?.amountOut ?? 0n;
          const dustOk =
            refOut > 0n &&
            isAboveDustFloor(refOut, tradePair.baseSymbol, hints);

          if (dustOk) {
            const sellQuotes = await scanner.fetchQuotesForPair(
              tradePair.tokenOut,
              tradePair.tokenIn,
              effectiveAltIn
            );
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

  return {
    snapshots,
    pairsScanned,
    pairsSkipped,
    errors,
    durationMs: Date.now() - start,
    totalPairsInUniverse: allPairs.length,
    pairsConsidered: pairs.length,
  };
}
