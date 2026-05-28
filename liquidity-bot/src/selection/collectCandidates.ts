import type { BotConfig } from '../config/schema.js';
import type { DexQuoteService } from '../scan/DexQuoteService.js';
import {
  buildCandidateEdges,
  buildReverseCandidateEdges,
} from '../scan/opportunityDetector.js';
import type { PairQuoteSnapshot } from '../scan/collectQuotes.js';
import type { ScanOpportunity } from '../scan/types.js';
import { passesCandidateSafety } from './safetyFilters.js';

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
            quoteService
          );
    let added = 0;
    for (const edge of edges) {
      if (passesCandidateSafety(edge, bot)) {
        out.push(edge);
        added++;
      }
    }
    options?.onProgress?.({
      index: i + 1,
      total: snapshots.length,
      pair: snap.tradePair,
      candidates: added,
    });
  }

  return out;
}
