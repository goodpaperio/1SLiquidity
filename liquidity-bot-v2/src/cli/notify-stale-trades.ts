import 'dotenv/config';
import { loadBotConfig } from '../config/loadBot.js';
import {
  assessTradeStaleness,
  maybeAlertStaleTrades,
  STALE_TRADE_THRESHOLD_MS,
} from '../ops/tradeHealthCheck.js';
import { readBotState, writeBotState } from '../runner/BotRunner.js';
import { TradeLedger } from '../notify/tradeLedger.js';

async function main(): Promise<void> {
  const botId = process.argv[2]?.trim().toLowerCase();
  if (!botId) {
    console.error('Usage: npm run notify:stale-trades -- <bot-id>');
    process.exit(1);
  }

  const bot = loadBotConfig(botId);
  const state = readBotState(botId);
  const check = assessTradeStaleness(new TradeLedger(botId));

  if (!check.stale) {
    const hours = check.hoursSince?.toFixed(1) ?? 'n/a';
    console.log(
      `[${botId}] trades OK — ${hours}h since last placement (threshold ${STALE_TRADE_THRESHOLD_MS / (60 * 60 * 1000)}h)`
    );
    process.exit(0);
  }

  const alertAt = await maybeAlertStaleTrades(bot, {
    lastAlertAt: state?.lastStaleTradeAlertAt,
  });
  if (alertAt) {
    writeBotState(botId, {
      ...(state ?? {
        lastUpdatedAt: new Date().toISOString(),
        lastEthBalanceWei: '0',
        status: 'running',
      }),
      lastStaleTradeAlertAt: alertAt,
    });
    console.log(
      `[${botId}] stale-trade alert sent (${check.hoursSince?.toFixed(1)}h since last)`
    );
    process.exit(0);
  }

  console.log(
    `[${botId}] stale (${check.hoursSince?.toFixed(1)}h) but alert skipped (cooldown or Telegram disabled)`
  );
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
