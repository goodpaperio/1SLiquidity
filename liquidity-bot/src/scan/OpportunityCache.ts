import type { BotConfig } from '../config/schema.js';
import { selectForExecution } from '../selection/selectForExecution.js';
import type { PairCooldownStore } from './pairCooldown.js';
import type { TradeHistoryStore } from './tradeHistory.js';
import { dedupeByPair, selectBestOpportunity } from './selectOpportunity.js';
import type { ScanOpportunity } from './types.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  opportunity: ScanOpportunity;
  expiresAt: number;
}

export class OpportunityCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly pairCooldown?: PairCooldownStore,
    private readonly tradeHistory?: TradeHistoryStore
  ) {}

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

  /** One best opportunity per pair, ranked for execution (phase D+). */
  listForExecution(): ScanOpportunity[] {
    return dedupeByPair(this.list());
  }

  /** Single pair to trade when multiple opportunities are cached. */
  peekBestForExecution(bot?: BotConfig): ScanOpportunity | null {
    const all = this.list();
    if (bot) {
      return selectForExecution(bot, all, {
        pairCooldown: this.pairCooldown,
        tradeHistory: this.tradeHistory,
      }).pick;
    }
    const deduped = this.listForExecution();
    const eligible = this.pairCooldown?.filterEligible(deduped) ?? deduped;
    return selectBestOpportunity(eligible);
  }

  executionSelection(bot: BotConfig) {
    return selectForExecution(bot, this.list(), {
      pairCooldown: this.pairCooldown,
      tradeHistory: this.tradeHistory,
    });
  }

  selectionStores(): {
    pairCooldown?: PairCooldownStore;
    tradeHistory?: TradeHistoryStore;
  } {
    return {
      pairCooldown: this.pairCooldown,
      tradeHistory: this.tradeHistory,
    };
  }

  countBlockedByCooldown(): number {
    if (!this.pairCooldown) return 0;
    const deduped = this.listForExecution();
    return deduped.length - this.pairCooldown.filterEligible(deduped).length;
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
