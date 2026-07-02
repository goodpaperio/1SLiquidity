import { formatEther, type Provider, type Signer } from 'ethers';
import type { BotConfig } from '../config/schema.js';
import { createBotWallet } from '../chain/wallet.js';
import { prefixBotMessage, sendTelegram, loadTelegramConfig } from '../notify/telegram.js';
import { ensurePriceCache } from './priceCache.js';
import {
  runGasSelfSustain,
  maybeAlertLowEth,
} from './gasSelfSustain.js';
import {
  runLiquifySweep,
  shouldRunDailySweep,
  msUntilNextSweepUtcHour,
  utcDateLabel,
} from './liquifySweep.js';
import {
  formatHelpMessage,
  pollTelegramCommands,
} from '../notify/telegramCommands.js';
import { readBotState, writeBotState, type BotState } from '../runner/BotRunner.js';

export interface OpsRunResult {
  swept: boolean;
  sweepMessage?: string;
  gasMessage?: string;
  skippedTrading: boolean;
}

/** Run the daily dust sweep (at most once per UTC day unless `force`). */
export async function runDailyLiquifySweep(
  bot: BotConfig,
  provider: Provider,
  options: {
    force?: boolean;
    signer?: Signer;
  } = {}
): Promise<{ swept: boolean; message?: string }> {
  if (!bot.liquify.enabled) {
    return { swept: false };
  }

  await ensurePriceCache();
  const state = readBotState(bot.id) ?? defaultOpsState();
  const today = utcDateLabel();
  if (!options.force && state.lastDustSweepDate === today) {
    return { swept: false, message: 'Daily liquify already attempted today.' };
  }

  const wallet = options.signer ?? createBotWallet(bot, provider);
  let swept = false;
  let message: string | undefined;

  try {
    const sweep = await runLiquifySweep(bot, provider, wallet);
    message = sweep.message;
    swept = sweep.tokensAttempted > 0 && !sweep.dryRun;
    if (sweep.tokensAttempted > 0 || options.force) {
      const body = `🧹 <b>Liquify sweep</b>\n${escapeHtml(sweep.message)}`;
      await sendTelegram(prefixBotMessage(bot.id, body));
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    const short = reason.length > 400 ? `${reason.slice(0, 400)}…` : reason;
    message = `Liquify sweep failed: ${short}`;
    console.error(`[${bot.id}] ${message}`);
    await sendTelegram(
      prefixBotMessage(
        bot.id,
        `🧹 <b>Liquify sweep failed</b>\n${escapeHtml(short)}`
      )
    );
  } finally {
    // One scheduled attempt per UTC day — do not retry until tomorrow 11:00.
    if (!options.force) {
      writeBotState(bot.id, {
        ...state,
        lastDustSweepDate: utcDateLabel(),
      });
    }
  }

  return { swept, message };
}

/**
 * Fire liquify once per day at `liquify.dailySweepHourUtc` (default 11:00 UTC).
 * Independent of the trade scan interval.
 */
export function startDailyLiquifyScheduler(
  bot: BotConfig,
  provider: Provider
): (() => void) | null {
  if (!bot.liquify.enabled) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const scheduleNext = () => {
    if (cancelled) return;
    const delay = msUntilNextSweepUtcHour(bot.liquify.dailySweepHourUtc);
    const at = new Date(Date.now() + delay);
    console.log(
      `[${bot.id}] next daily liquify sweep scheduled for ${at.toISOString()}`
    );
    timer = setTimeout(() => {
      void (async () => {
        try {
          console.log(`[${bot.id}] running scheduled daily liquify sweep`);
          await runDailyLiquifySweep(bot, provider);
        } catch (err) {
          console.error(
            `[${bot.id}] scheduled liquify failed:`,
            err instanceof Error ? err.message : err
          );
        } finally {
          scheduleNext();
        }
      })();
    }, delay);
  };

  // If the bot restarts during the 11:00 UTC hour and hasn't swept yet, run now.
  const state = readBotState(bot.id);
  if (
    shouldRunDailySweep(
      bot.liquify.dailySweepHourUtc,
      state?.lastDustSweepDate
    )
  ) {
    void runDailyLiquifySweep(bot, provider).finally(scheduleNext);
  } else {
    scheduleNext();
  }

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

export async function runBotMaintenance(
  bot: BotConfig,
  provider: Provider,
  options: {
    forceLiquify?: boolean;
    signer?: Signer;
  } = {}
): Promise<OpsRunResult> {
  if (options.forceLiquify) {
    const sweep = await runDailyLiquifySweep(bot, provider, {
      force: true,
      signer: options.signer,
    });
    return {
      swept: sweep.swept,
      sweepMessage: sweep.message,
      skippedTrading: false,
    };
  }

  await ensurePriceCache();
  const state = readBotState(bot.id) ?? defaultOpsState();
  const wallet = options.signer ?? createBotWallet(bot, provider);

  const gas = await runGasSelfSustain(bot, provider, wallet);
  if (gas.unwrappedWei > 0n && !gas.dryRun) {
    await sendTelegram(
      prefixBotMessage(
        bot.id,
        `⛽ <b>Gas top-up</b>\n${escapeHtml(gas.message)}`
      )
    );
  }

  if (gas.needsOperator) {
    const alertAt = await maybeAlertLowEth(
      bot,
      provider,
      state.lastLowEthAlertAt
    );
    if (alertAt) {
      writeBotState(bot.id, {
        ...(readBotState(bot.id) ?? defaultOpsState()),
        lastLowEthAlertAt: alertAt,
      });
    }
  }

  return { swept: false, sweepMessage: undefined, gasMessage: gas.message, skippedTrading: false };
}

export async function buildStatusMessage(
  bot: BotConfig,
  provider: Provider,
  paused: boolean
): Promise<string> {
  const eth = await provider.getBalance(bot.address);
  const hints = await ensurePriceCache();
  const ethStr = formatEther(eth);
  const usd =
    hints.ethUsd > 0
      ? ` (~$${(Number(ethStr) * hints.ethUsd).toFixed(2)})`
      : '';

  return (
    `<b>Status</b> ${paused ? '(paused)' : '(running)'}\n` +
    `address: <code>${bot.address}</code>\n` +
    `native ETH: ${ethStr}${usd}\n` +
    `ETH/USD: ${hints.ethUsd.toFixed(2)} (cached)\n` +
    `next daily sweep: ${bot.liquify.dailySweepHourUtc}:00 UTC (once per day)`
  );
}

function defaultOpsState(): BotState {
  return {
    lastUpdatedAt: new Date().toISOString(),
    lastEthBalanceWei: '0',
    status: 'idle',
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function startTelegramCommandLoop(
  bot: BotConfig,
  provider: Provider,
  getPaused: () => boolean,
  setPaused: (v: boolean) => void,
  runLiquify: () => Promise<string>
): ReturnType<typeof setInterval> | null {
  const tg = loadTelegramConfig();
  if (!tg) return null;

  return setInterval(() => {
    void pollTelegramCommands(tg.botToken, tg.chatId, bot.id, {
      liquify: runLiquify,
      status: async () => buildStatusMessage(bot, provider, getPaused()),
      pause: () => {
        setPaused(true);
        return 'Trading paused. Maintenance (/liquify, gas unwrap) still runs.';
      },
      resume: () => {
        setPaused(false);
        return 'Trading resumed.';
      },
      help: () => formatHelpMessage(),
    });
  }, 5000);
}
