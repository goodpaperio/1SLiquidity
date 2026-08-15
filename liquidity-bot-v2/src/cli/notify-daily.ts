import 'dotenv/config';
import { loadBotConfig } from '../config/loadBot.js';
import { formatDailySummary } from '../notify/formatters.js';
import { TradeLedger } from '../notify/tradeLedger.js';
import { prefixBotMessage, sendTelegram } from '../notify/telegram.js';

function utcDayBounds(): { label: string; sinceMs: number } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)
  );
  const label = start.toISOString().slice(0, 10);
  return { label, sinceMs: start.getTime() };
}

async function main(): Promise<void> {
  const botId = process.argv[2]?.trim().toLowerCase();
  if (!botId) {
    console.error('Usage: npm run notify:daily -- <bot-id>');
    process.exit(1);
  }

  loadBotConfig(botId);
  const ledger = new TradeLedger(botId);
  const { label, sinceMs } = utcDayBounds();
  const rows = ledger.entriesSince(sinceMs);

  const placed = rows.filter((r) => r.tradeId != null).length;
  const leg2Failed = rows.filter((r) => r.status === 'leg2_failed').length;
  const completed = rows.filter((r) => r.status === 'completed').length;
  const open = rows.filter((r) => r.status === 'open').length;

  let volumeWei = 0n;
  let pnlWei = 0n;
  const pairSet = new Set<string>();

  for (const row of rows) {
    pairSet.add(row.pair);
    if (row.settlementToken === 'WETH' && row.direction === 'forward') {
      volumeWei += BigInt(row.leg1AmountIn);
    }
    if (row.status === 'completed' && row.pnlAmount && row.settlementToken === 'WETH') {
      pnlWei += BigInt(row.pnlAmount);
    }
  }

  const body = formatDailySummary({
    botId,
    dayLabel: `${label} UTC`,
    placed,
    completed,
    open,
    leg2Failed,
    volumeWei,
    pnlWei,
    pairs: [...pairSet],
  });

  const ok = await sendTelegram(prefixBotMessage(botId, body));
  console.log(
    ok
      ? `[${botId}] daily summary sent (${label})`
      : `[${botId}] daily summary skipped (Telegram disabled or failed)`
  );
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
