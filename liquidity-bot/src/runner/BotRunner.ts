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
import {
  CYCLE_WATCHDOG_MAX_MS,
  RATE_LIMIT_PAUSE_MS,
  cycleWatchdogMs,
  errorText,
  isRpcRateLimitError,
} from '../chain/txTimeout.js';
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
import {
  loadTelegramConfig,
  prefixBotMessage,
  sendTelegram,
} from '../notify/telegram.js';
import { maybeCancelStuckTrade } from '../ops/stuckTradeGuard.js';
import {
  runBotMaintenance,
  runDailyLiquifySweep,
  startDailyLiquifyScheduler,
  startTelegramCommandLoop,
} from '../ops/botOps.js';
import { maybeAlertStaleTrades } from '../ops/tradeHealthCheck.js';

export interface BotState {
  lastUpdatedAt: string;
  lastEthBalanceWei: string;
  status: 'idle' | 'running';
  note?: string;
  /** UTC date YYYY-MM-DD of last successful daily liquify sweep. */
  lastDustSweepDate?: string;
  /** ISO timestamp of last low-ETH Telegram alert. */
  lastLowEthAlertAt?: string;
  /** ISO timestamp of last no-trade staleness Telegram alert. */
  lastStaleTradeAlertAt?: string;
  /** ISO timestamp of last /pull self-update request. */
  lastPullAt?: string;
  /** ISO timestamp until which trading is paused after RPC rate limits. */
  rateLimitPausedUntil?: string;
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
  private cycleStartedAtMs: number | null = null;
  private cycleWatchdogTimer: ReturnType<typeof setTimeout> | null = null;
  private liquifyInFlight = false;
  private pausedByOperator = false;
  private rateLimitPausedUntilMs = 0;
  private telegramTimer: ReturnType<typeof setInterval> | null = null;
  private liquifySchedulerStop: (() => void) | null = null;
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
    const prev = readBotState(config.id);
    if (prev?.rateLimitPausedUntil) {
      const until = Date.parse(prev.rateLimitPausedUntil);
      if (Number.isFinite(until) && until > Date.now()) {
        this.rateLimitPausedUntilMs = until;
      }
    }
  }

  stop(): void {
    this.stopped = true;
    this.clearCycleWatchdog();
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    if (this.telegramTimer) {
      clearInterval(this.telegramTimer);
      this.telegramTimer = null;
    }
    if (this.liquifySchedulerStop) {
      this.liquifySchedulerStop();
      this.liquifySchedulerStop = null;
    }
  }

  async run(): Promise<void> {
    const id = this.config.id;
    console.log(`[${id}] runner started (address ${this.config.address})`);
    if (this.rateLimitPausedUntilMs > Date.now()) {
      console.log(
        `[${id}] rate-limit cool-down active until ${new Date(this.rateLimitPausedUntilMs).toISOString()}`
      );
    }

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
        () => this.runLiquifyCommand(provider),
        () => this.cycleInFlight || this.liquifyInFlight
      );
      this.liquifySchedulerStop = startDailyLiquifyScheduler(
        this.config,
        provider
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
      const prev = readBotState(id);
      writeBotState(id, {
        lastUpdatedAt: new Date().toISOString(),
        lastEthBalanceWei: prev?.lastEthBalanceWei ?? '0',
        status: 'running',
        note: `cached_opportunities=${this.opportunityCache.list().length}`,
        lastDustSweepDate: prev?.lastDustSweepDate,
        lastLowEthAlertAt: prev?.lastLowEthAlertAt,
        lastStaleTradeAlertAt: prev?.lastStaleTradeAlertAt,
        lastPullAt: prev?.lastPullAt,
        rateLimitPausedUntil:
          this.rateLimitPausedUntilMs > Date.now()
            ? new Date(this.rateLimitPausedUntilMs).toISOString()
            : undefined,
      });
      await sleep(this.heartbeatMs);
    }

    if (this.scanTimer) clearInterval(this.scanTimer);
  }

  private clearCycleWatchdog(): void {
    if (this.cycleWatchdogTimer) {
      clearTimeout(this.cycleWatchdogTimer);
      this.cycleWatchdogTimer = null;
    }
  }

  private armCycleWatchdog(id: string): void {
    this.clearCycleWatchdog();
    const ms = cycleWatchdogMs(this.config.scan.intervalMs);
    this.cycleWatchdogTimer = setTimeout(() => {
      if (!this.cycleInFlight) return;
      const elapsed = this.cycleStartedAtMs
        ? Date.now() - this.cycleStartedAtMs
        : ms;
      console.error(
        `[${id}] cycle watchdog tripped after ${elapsed}ms (limit ${ms}ms) — exiting for PM2 restart`
      );
      void sendTelegram(
        prefixBotMessage(
          id,
          `cycle watchdog tripped after ${Math.round(elapsed / 1000)}s — restarting process`
        ),
        loadTelegramConfig()
      ).catch(() => {});
      // Hard exit: hung ethers awaits cannot be cancelled reliably.
      // Delay slightly so the Telegram fire-and-forget can flush.
      setTimeout(() => process.exit(1), 1_500);
    }, ms);
  }

  private beginRateLimitPause(id: string, err: unknown): void {
    this.rateLimitPausedUntilMs = Date.now() + RATE_LIMIT_PAUSE_MS;
    const until = new Date(this.rateLimitPausedUntilMs).toISOString();
    console.warn(
      `[${id}] RPC rate-limit / overload detected — pausing trades until ${until}`
    );
    console.warn(`[${id}] cause: ${errorText(err).slice(0, 300)}`);
    const prev = readBotState(id);
    writeBotState(id, {
      lastUpdatedAt: new Date().toISOString(),
      lastEthBalanceWei: prev?.lastEthBalanceWei ?? '0',
      status: 'running',
      note: prev?.note,
      lastDustSweepDate: prev?.lastDustSweepDate,
      lastLowEthAlertAt: prev?.lastLowEthAlertAt,
      lastStaleTradeAlertAt: prev?.lastStaleTradeAlertAt,
      lastPullAt: prev?.lastPullAt,
      rateLimitPausedUntil: until,
    });
    void sendTelegram(
      prefixBotMessage(
        id,
        `RPC rate-limit / 503 — pausing trades for 1h (until ${until})`
      ),
      loadTelegramConfig()
    );
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
    if (Date.now() < this.rateLimitPausedUntilMs) {
      console.log(
        `[${id}] rate-limit cool-down — skipping until ${new Date(this.rateLimitPausedUntilMs).toISOString()}`
      );
      return;
    }

    this.cycleInFlight = true;
    this.cycleStartedAtMs = Date.now();
    this.armCycleWatchdog(id);
    try {
      await runBotMaintenance(this.config, provider);

      const opsState = readBotState(id) ?? {
        lastUpdatedAt: new Date().toISOString(),
        lastEthBalanceWei: '0',
        status: 'running' as const,
      };
      const staleAlertAt = await maybeAlertStaleTrades(this.config, {
        paused: this.pausedByOperator,
        lastAlertAt: opsState.lastStaleTradeAlertAt,
      });
      if (staleAlertAt) {
        writeBotState(id, {
          ...opsState,
          lastStaleTradeAlertAt: staleAlertAt,
        });
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
      } else if (stuck.settlementAttempted && stuck.settlementTxHash) {
        console.log(
          `[${id}] settlement attempt via executeTrades for trade #${stuck.tradeId} (${stuck.settlementTxHash})`
        );
      } else if (stuck.settlementAttempted && stuck.dryRun) {
        console.log(
          `[${id}] would attempt executeTrades settlement for trade #${stuck.tradeId}`
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
      if (isRpcRateLimitError(err)) {
        this.beginRateLimitPause(id, err);
      }
    } finally {
      this.clearCycleWatchdog();
      this.cycleStartedAtMs = null;
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
      const result = await runDailyLiquifySweep(this.config, provider, {
        force: true,
      });
      if (result.message) return result.message;
      return result.swept ? 'Liquify sweep completed.' : 'Liquify sweep skipped.';
    } finally {
      this.liquifyInFlight = false;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exported for tests. */
export { CYCLE_WATCHDOG_MAX_MS, RATE_LIMIT_PAUSE_MS };
