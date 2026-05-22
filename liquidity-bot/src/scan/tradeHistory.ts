import fs from 'node:fs';
import path from 'node:path';
import type { BotConfig } from '../config/schema.js';
import { getBotTradeHistoryPath } from '../config/paths.js';
import type { TradeDirection } from './types.js';

export interface TradeHistoryEntry {
  pairKey: string;
  direction: TradeDirection;
  targetName: string;
  at: number;
}

interface TradeHistoryFile {
  trades: TradeHistoryEntry[];
}

const EMPTY: TradeHistoryFile = { trades: [] };

/**
 * Blocks a pair if it appears in the last N live trades (forward or reverse).
 */
export class TradeHistoryStore {
  private trades: TradeHistoryEntry[];
  private readonly filePath: string;

  constructor(
    botId: string,
    private readonly minTradesBetweenSamePair: number,
    private readonly maxEntries: number,
    filePath?: string
  ) {
    this.filePath = filePath ?? getBotTradeHistoryPath(botId);
    this.trades = this.load().trades;
  }

  static forBot(bot: BotConfig, filePath?: string): TradeHistoryStore {
    return new TradeHistoryStore(
      bot.id,
      bot.trade.minTradesBetweenSamePair,
      bot.trade.tradeHistoryMaxEntries,
      filePath
    );
  }

  isBlocked(pairKey: string): boolean {
    if (this.minTradesBetweenSamePair <= 0) return false;
    const recent = this.trades.slice(-this.minTradesBetweenSamePair);
    return recent.some((t) => t.pairKey === pairKey);
  }

  filterEligible<T extends { pairKey: string; targetName: string }>(
    items: T[]
  ): T[] {
    return items.filter((o) => !this.isBlocked(o.pairKey));
  }

  blockedReason(pairKey: string): string | null {
    if (!this.isBlocked(pairKey)) return null;
    const recent = this.trades.slice(-this.minTradesBetweenSamePair);
    const hits = recent.filter((t) => t.pairKey === pairKey).length;
    return (
      `pair in last ${this.minTradesBetweenSamePair} live trades ` +
      `(${hits}×, forward/reverse shared)`
    );
  }

  /** Append after successful live execution only. */
  recordLiveTrade(
    pairKey: string,
    direction: TradeDirection,
    targetName: string,
    tradedAt = Date.now()
  ): void {
    this.trades.push({ pairKey, direction, targetName, at: tradedAt });
    if (this.trades.length > this.maxEntries) {
      this.trades = this.trades.slice(-this.maxEntries);
    }
    this.save();
  }

  recentSummary(limit = 5): string {
    const slice = this.trades.slice(-limit);
    if (slice.length === 0) return '(empty)';
    return slice
      .map((t) => `${t.targetName}:${t.direction[0]}`)
      .join(', ');
  }

  listRecent(n = 8): TradeHistoryEntry[] {
    return this.trades.slice(-n);
  }

  private load(): TradeHistoryFile {
    try {
      if (!fs.existsSync(this.filePath)) return { ...EMPTY };
      const raw = JSON.parse(
        fs.readFileSync(this.filePath, 'utf8')
      ) as TradeHistoryFile;
      if (!Array.isArray(raw.trades)) return { ...EMPTY };
      return { trades: raw.trades };
    } catch {
      return { ...EMPTY };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(
      this.filePath,
      JSON.stringify({ trades: this.trades }, null, 2) + '\n'
    );
  }
}
