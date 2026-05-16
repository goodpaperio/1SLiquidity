import type { ScanOpportunity } from './types.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  opportunity: ScanOpportunity;
  expiresAt: number;
}

export class OpportunityCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(private readonly ttlMs = DEFAULT_TTL_MS) {}

  private static key(opp: ScanOpportunity): string {
    return `${opp.pairKey}:${opp.candidateDex}`;
  }

  upsert(opportunity: ScanOpportunity): void {
    this.prune();
    this.entries.set(OpportunityCache.key(opportunity), {
      opportunity,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  upsertMany(opportunities: ScanOpportunity[]): void {
    for (const o of opportunities) {
      this.upsert(o);
    }
  }

  list(): ScanOpportunity[] {
    this.prune();
    return [...this.entries.values()].map((e) => e.opportunity);
  }

  prune(): void {
    const now = Date.now();
    for (const [k, v] of this.entries) {
      if (v.expiresAt <= now) this.entries.delete(k);
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
