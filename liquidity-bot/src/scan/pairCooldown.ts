import fs from 'node:fs';
import path from 'node:path';
import type { BotConfig } from '../config/schema.js';
import { getBotCooldownPath } from '../config/paths.js';
import type { ScanOpportunity } from './types.js';

interface CooldownFile {
  lastTradedAt: Record<string, number>;
}

const EMPTY: CooldownFile = { lastTradedAt: {} };

/**
 * Persists per-pair last-trade timestamps so the bot does not re-enter
 * the same base→alt pair within `pairCooldownMs` (phase D calls recordTrade).
 */
export class PairCooldownStore {
  private data: CooldownFile;
  private readonly filePath: string;

  constructor(
    botId: string,
    private readonly cooldownMs: number,
    filePath?: string
  ) {
    this.filePath = filePath ?? getBotCooldownPath(botId);
    this.data = this.load();
  }

  static forBot(bot: BotConfig, filePath?: string): PairCooldownStore {
    return new PairCooldownStore(
      bot.id,
      bot.trade.pairCooldownMs,
      filePath
    );
  }

  isOnCooldown(pairKey: string, now = Date.now()): boolean {
    return this.cooldownRemainingMs(pairKey, now) > 0;
  }

  cooldownRemainingMs(pairKey: string, now = Date.now()): number {
    if (this.cooldownMs <= 0) return 0;
    const last = this.data.lastTradedAt[pairKey];
    if (last === undefined) return 0;
    return Math.max(0, last + this.cooldownMs - now);
  }

  filterEligible(opportunities: ScanOpportunity[]): ScanOpportunity[] {
    if (this.cooldownMs <= 0) return opportunities;
    return opportunities.filter((o) => !this.isOnCooldown(o.pairKey));
  }

  /** Call after leg 1+2 complete (phase D/E). */
  recordTrade(pairKey: string, tradedAt = Date.now()): void {
    this.data.lastTradedAt[pairKey] = tradedAt;
    this.save();
  }

  onCooldownPairKeys(now = Date.now()): string[] {
    return Object.keys(this.data.lastTradedAt).filter((k) =>
      this.isOnCooldown(k, now)
    );
  }

  private load(): CooldownFile {
    try {
      if (!fs.existsSync(this.filePath)) return { ...EMPTY };
      const raw = JSON.parse(
        fs.readFileSync(this.filePath, 'utf8')
      ) as CooldownFile;
      if (!raw.lastTradedAt || typeof raw.lastTradedAt !== 'object') {
        return { ...EMPTY };
      }
      return { lastTradedAt: { ...raw.lastTradedAt } };
    } catch {
      return { ...EMPTY };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.data, null, 2) + '\n'
    );
  }
}
