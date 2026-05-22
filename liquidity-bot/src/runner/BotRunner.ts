import fs from 'node:fs';
import path from 'node:path';
import type { BotConfig } from '../config/schema.js';
import { getBotsDir } from '../config/paths.js';
import { createProvider } from '../chain/provider.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { PairCooldownStore } from '../scan/pairCooldown.js';
import { TradeHistoryStore } from '../scan/tradeHistory.js';
import { QuoteScanner, formatScanSummary } from '../scan/QuoteScanner.js';

export interface BotState {
  lastUpdatedAt: string;
  lastEthBalanceWei: string;
  status: 'idle' | 'running';
  note?: string;
}

export function getStatePath(botId: string): string {
  return path.join(getBotsDir(), `${botId}.state.json`);
}

export function readBotState(botId: string): BotState | null {
  const p = getStatePath(botId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as BotState;
}

export function writeBotState(botId: string, state: BotState): void {
  fs.mkdirSync(getBotsDir(), { recursive: true });
  fs.writeFileSync(getStatePath(botId), JSON.stringify(state, null, 2) + '\n');
}

/**
 * Minimal runner loop for phase B (scanner wired in phase C).
 */
export class BotRunner {
  private stopped = false;
  private readonly pairCooldown: PairCooldownStore;
  private readonly tradeHistory: TradeHistoryStore;
  private readonly opportunityCache: OpportunityCache;
  private scanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: BotConfig,
    private readonly heartbeatMs = 60_000
  ) {
    this.pairCooldown = PairCooldownStore.forBot(config);
    this.tradeHistory = TradeHistoryStore.forBot(config);
    this.opportunityCache = new OpportunityCache(
      undefined,
      this.pairCooldown,
      this.tradeHistory
    );
  }

  stop(): void {
    this.stopped = true;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  async run(): Promise<void> {
    const id = this.config.id;
    console.log(`[${id}] runner started (address ${this.config.address})`);

    let scanner: QuoteScanner | null = null;
    try {
      const provider = createProvider();
      scanner = new QuoteScanner(provider, this.opportunityCache, {
        pairDelayMs: 30,
      });
      await this.runScan(id, scanner);
      this.scanTimer = setInterval(() => {
        void this.runScan(id, scanner!);
      }, this.config.scan.intervalMs);
    } catch (err) {
      console.warn(
        `[${id}] scanner disabled:`,
        err instanceof Error ? err.message : err
      );
    }

    while (!this.stopped) {
      writeBotState(id, {
        lastUpdatedAt: new Date().toISOString(),
        lastEthBalanceWei: '0',
        status: 'running',
        note: `cached_opportunities=${this.opportunityCache.list().length}`,
      });
      await sleep(this.heartbeatMs);
    }

    if (this.scanTimer) clearInterval(this.scanTimer);
  }

  private async runScan(id: string, scanner: QuoteScanner): Promise<void> {
    try {
      const result = await scanner.scanBot(this.config);
      console.log(
        formatScanSummary(id, this.config, result, this.opportunityCache)
      );
    } catch (err) {
      console.error(
        `[${id}] scan failed:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
