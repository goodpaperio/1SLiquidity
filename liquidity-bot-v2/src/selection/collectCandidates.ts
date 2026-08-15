import type { BotConfig } from '../config/schema.js';
import type { DexQuoteService } from '../scan/DexQuoteService.js';
import {
  buildCandidateEdges,
  buildReverseCandidateEdges,
} from '../scan/opportunityDetector.js';
import type { PairQuoteSnapshot } from '../scan/collectQuotes.js';
import type { ScanOpportunity } from '../scan/types.js';
import { passesStructuralSafety } from './safetyFilters.js';
import { effectiveMinNetBps } from '../scan/feeModel.js';
import { getPriceHints } from '../config/sizing.js';
import { cexDexGapBps, impliedUsdPerAlt } from '../signal/cexDexRank.js';
import { readWarmSet } from '../signal/warmSet.js';

export async function collectCandidateOpportunities(
  snapshots: PairQuoteSnapshot[],
  bot: BotConfig,
  quoteService: DexQuoteService,
  options?: {
    onProgress?: (info: {
      index: number;
      total: number;
      pair: PairQuoteSnapshot['tradePair'];
      candidates: number;
    }) => void;
  }
): Promise<ScanOpportunity[]> {
  const out: ScanOpportunity[] = [];
  let rejectedByNet = 0;
  let grossPositive = 0;
  const netFloor = effectiveMinNetBps(bot);
  const hints = await getPriceHints();
  const warmByAddr = new Map(
    (readWarmSet(bot.id)?.pairs ?? []).map((w) => [
      w.targetAddress.toLowerCase(),
      w,
    ])
  );

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    const edges =
      snap.direction === 'reverse'
        ? await buildReverseCandidateEdges(
            snap.tradePair,
            snap.amountIn,
            snap.quotes,
            quoteService
          )
        : await buildCandidateEdges(
            snap.tradePair,
            snap.amountIn,
            snap.quotes,
            quoteService,
            {
              sellImpactBpsThreshold: bot.scan.sellImpactBpsThreshold,
              decaProtocolFeeBps: bot.scan.decaProtocolFeeBps,
            }
          );
    let added = 0;
    for (const edge of edges) {
      const warm = warmByAddr.get(snap.tradePair.targetAddress.toLowerCase());
      if (warm?.cexMid && snap.direction === 'forward') {
        const dexUsd = impliedUsdPerAlt({
          baseSymbol: snap.tradePair.baseSymbol,
          amountIn: snap.amountIn,
          amountOut: edge.amountOutCandidate,
          hints,
        });
        if (dexUsd != null) {
          edge.cexDexGapBps = Math.round(cexDexGapBps(warm.cexMid, dexUsd));
        }
      }
      if (edge.roundTripBps > 0) grossPositive++;
      if (passesStructuralSafety(edge, bot)) {
        out.push(edge);
        added++;
      }
      if (
        edge.roundTripBps >= bot.scan.minCoupledSpreadBps &&
        edge.netBps < netFloor
      ) {
        rejectedByNet++;
      }
    }
    options?.onProgress?.({
      index: i + 1,
      total: snapshots.length,
      pair: snap.tradePair,
      candidates: added,
    });
  }

  if (rejectedByNet > 0 || grossPositive > 0) {
    console.log(
      `  feeGate: grossPositive=${grossPositive} belowMinNet=${rejectedByNet} ` +
        `structurallySafe=${out.length} minNet=${netFloor}bps ` +
        `(net enforced at final select / sizeSweep)`
    );
  }

  return out;
}
