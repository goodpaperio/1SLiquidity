import fs from 'node:fs';
import path from 'node:path';
import type { BotConfig } from '../config/schema.js';
import { createBotWallet } from '../chain/wallet.js';
import {
  getCoreContract,
  listOutstandingTradesForOwner,
} from '../chain/core.js';
import { getBotsDir } from '../config/paths.js';
import { createProvider } from '../chain/provider.js';
import { TradeExecutor } from '../execution/TradeExecutor.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { PairCooldownStore } from '../scan/pairCooldown.js';
import { TradeHistoryStore } from '../scan/tradeHistory.js';
import {
  QuoteScanner,
  formatFinalistRefreshLog,
  formatScanSummary,
} from '../scan/QuoteScanner.js';
import { formatSelectedTradeBlock } from '../selection/selectForExecution.js';
import { pollTradeCompletions } from '../notify/completionWatcher.js';
import { maybeCancelStuckTrade } from '../ops/stuckTradeGuard.js';
import {
  runBotMaintenance,
  startTelegramCommandLoop,
} from '../ops/botOps.js';
import { runLiquifySweep } from '../ops/liquifySweep.js';

export interface BotState {
  lastUpdatedAt: string;
  lastEthBalanceWei: string;
  status: 'idle' | 'running';
  note?: string;
  /** UTC date YYYY-MM-DD of last successful daily liquify sweep. */
  lastDustSweepDate?: string;
  /** ISO timestamp of last low-ETH Telegram alert. */
  lastLowEthAlertAt?: string;
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
  private cycleInFlight = false;
  private liquifyInFlight = false;
  private pausedByOperator = false;
  private telegramTimer: ReturnType<typeof setInterval> | null = null;
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
    if (this.telegramTimer) {
      clearInterval(this.telegramTimer);
      this.telegramTimer = null;
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
      this.telegramTimer = startTelegramCommandLoop(
        this.config,
        provider,
        () => this.pausedByOperator,
        (v) => {
          this.pausedByOperator = v;
        },
        () => this.runLiquifyCommand(provider)
      );

      await this.runCycle(id, scanner, provider);
      this.scanTimer = setInterval(() => {
        void this.runCycle(id, scanner!, provider);
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

  private async runCycle(
    id: string,
    scanner: QuoteScanner,
    provider: ReturnType<typeof createProvider>
  ): Promise<void> {
    if (this.cycleInFlight || this.liquifyInFlight) {
      console.log(`[${id}] previous cycle still running; skip this tick.`);
      return;
    }
    this.cycleInFlight = true;
    try {
      this.liquifyInFlight = true;
      try {
        await runBotMaintenance(this.config, provider);
      } finally {
        this.liquifyInFlight = false;
      }

      if (this.pausedByOperator) {
        console.log(`[${id}] paused by operator — skipping trade cycle.`);
        return;
      }

      const notifiedEarly = await pollTradeCompletions(this.config, provider);
      if (notifiedEarly > 0) {
        console.log(`[${id}] trade completion alerts sent: ${notifiedEarly}`);
      }

      const core = getCoreContract(this.config, provider);
      const stuck = await maybeCancelStuckTrade(this.config, core, provider);
      if (stuck.cancelled) {
        console.log(
          `[${id}] auto-cancelled stuck trade #${stuck.tradeId} (${stuck.txHash})`
        );
      } else if (stuck.dryRun && stuck.tradeId != null) {
        console.log(
          `[${id}] stuck trade #${stuck.tradeId} would be cancelled next live cycle`
        );
      }

      const outstanding = await listOutstandingTradesForOwner(
        core,
        this.config.address
      );
      if (outstanding.length >= this.config.trade.maxOpenTrades) {
        console.log(
          `[${id}] skipping cycle: outstanding trades ${outstanding.length}/${this.config.trade.maxOpenTrades}`
        );
        return;
      }

      const result = await scanner.scanBot(this.config);
      console.log(
        formatScanSummary(id, this.config, result, this.opportunityCache)
      );

      const finalist = await scanner.finalizeExecutionSelection(
        this.config,
        result.opportunities,
        this.opportunityCache.selectionStores()
      );
      console.log(formatFinalistRefreshLog(finalist, this.config));
      const sel = finalist.final;
      console.log(
        formatSelectedTradeBlock(sel, {
          headline: 'RUNNER: executing this cycle',
          emptyMessage: 'No eligible pick this cycle.',
        })
      );
      if (!sel.pick) return;

      const wallet = createBotWallet(this.config, provider);
      const executor = new TradeExecutor(
        this.config,
        provider,
        this.pairCooldown,
        this.tradeHistory
      );
      await executor.execute(sel.pick, wallet);
    } catch (err) {
      console.error(
        `[${id}] cycle failed:`,
        err instanceof Error ? err.message : err
      );
    } finally {
      this.cycleInFlight = false;
    }
  }

  private async runLiquifyCommand(
    provider: ReturnType<typeof createProvider>
  ): Promise<string> {
    if (this.liquifyInFlight) {
      return 'Liquify sweep already in progress.';
    }
    this.liquifyInFlight = true;
    try {
      const wallet = createBotWallet(this.config, provider);
      const sweep = await runLiquifySweep(this.config, provider, wallet);
      if (!sweep.dryRun && sweep.tokensAttempted > 0) {
        writeBotState(this.config.id, {
          ...(readBotState(this.config.id) ?? {
            lastUpdatedAt: new Date().toISOString(),
            lastEthBalanceWei: '0',
            status: 'running' as const,
          }),
          lastDustSweepDate: new Date().toISOString().slice(0, 10),
        });
      }
      return sweep.message;
    } finally {
      this.liquifyInFlight = false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
