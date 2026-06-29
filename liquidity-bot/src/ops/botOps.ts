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

export async function runBotMaintenance(
  bot: BotConfig,
  provider: Provider,
  options: {
    forceLiquify?: boolean;
    signer?: Signer;
  } = {}
): Promise<OpsRunResult> {
  if (!bot.liquify.enabled) {
    return { swept: false, skippedTrading: false };
  }

  await ensurePriceCache();
  const state = readBotState(bot.id) ?? defaultOpsState();
  const wallet = options.signer ?? createBotWallet(bot, provider);

  let swept = false;
  let sweepMessage: string | undefined;
  const dailyDue =
    options.forceLiquify ||
    shouldRunDailySweep(bot.liquify.dailySweepHourUtc, state.lastDustSweepDate);

  if (dailyDue) {
    const sweep = await runLiquifySweep(bot, provider, wallet);
    sweepMessage = sweep.message;
    swept = sweep.tokensAttempted > 0 && !sweep.dryRun;
    if (sweep.tokensAttempted > 0 || options.forceLiquify) {
      const body =
        swept || sweep.dryRun
          ? `🧹 <b>Liquify sweep</b>\n${escapeHtml(sweep.message)}`
          : `🧹 <b>Liquify sweep</b>\n${escapeHtml(sweep.message)}`;
      await sendTelegram(prefixBotMessage(bot.id, body));
    }
    if (!sweep.dryRun && dailyDue && !options.forceLiquify) {
      writeBotState(bot.id, {
        ...state,
        lastDustSweepDate: utcDateLabel(),
      });
    } else if (options.forceLiquify && !sweep.dryRun && sweep.tokensAttempted > 0) {
      writeBotState(bot.id, {
        ...state,
        lastDustSweepDate: utcDateLabel(),
      });
    }
  }

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

  return { swept, sweepMessage, gasMessage: gas.message, skippedTrading: false };
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
    `next daily sweep: ${bot.liquify.dailySweepHourUtc}:00 UTC`
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
