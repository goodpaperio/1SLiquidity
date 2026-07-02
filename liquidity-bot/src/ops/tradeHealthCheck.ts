import type { BotConfig } from '../config/schema.js';
import { TradeLedger } from '../notify/tradeLedger.js';
import { prefixBotMessage, sendTelegram } from '../notify/telegram.js';

/** Warn operators when no leg2-confirmed trade for this long. */
export const STALE_TRADE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/** Re-alert at most once per threshold window. */
export const STALE_TRADE_ALERT_COOLDOWN_MS = STALE_TRADE_THRESHOLD_MS;

export interface StaleTradeCheck {
  stale: boolean;
  lastPlacedAt?: string;
  lastPair?: string;
  hoursSince?: number;
  reason?: string;
}

export function assessTradeStaleness(
  ledger: TradeLedger,
  nowMs = Date.now()
): StaleTradeCheck {
  const placed = ledger
    .readAll()
    .filter((r) => r.tradeId != null)
    .sort(
      (a, b) =>
        Date.parse(b.placedAt) - Date.parse(a.placedAt)
    );

  if (placed.length === 0) {
    return { stale: false, reason: 'no trades in ledger yet' };
  }

  const last = placed[0]!;
  const lastMs = Date.parse(last.placedAt);
  if (!Number.isFinite(lastMs)) {
    return { stale: false, reason: 'invalid last placedAt' };
  }

  const elapsed = nowMs - lastMs;
  const hoursSince = elapsed / (60 * 60 * 1000);

  return {
    stale: elapsed >= STALE_TRADE_THRESHOLD_MS,
    lastPlacedAt: last.placedAt,
    lastPair: last.pair,
    hoursSince,
  };
}

export async function maybeAlertStaleTrades(
  bot: BotConfig,
  options: {
    paused?: boolean;
    lastAlertAt?: string;
    nowMs?: number;
  } = {}
): Promise<string | undefined> {
  if (!bot.enabled || options.paused) return undefined;

  const nowMs = options.nowMs ?? Date.now();
  if (options.lastAlertAt) {
    const sinceAlert = nowMs - Date.parse(options.lastAlertAt);
    if (
      Number.isFinite(sinceAlert) &&
      sinceAlert < STALE_TRADE_ALERT_COOLDOWN_MS
    ) {
      return undefined;
    }
  }

  const check = assessTradeStaleness(new TradeLedger(bot.id), nowMs);
  if (!check.stale || check.hoursSince == null) return undefined;

  const hours = check.hoursSince.toFixed(1);
  const lastLine = check.lastPair
    ? `last trade: ${escapeHtml(check.lastPair)} @ ${check.lastPlacedAt}`
    : `last trade: ${check.lastPlacedAt ?? 'unknown'}`;

  const body =
    `⚠️ <b>No trades placed for ${hours}h</b>\n` +
    `${lastLine}\n` +
    `threshold: ${STALE_TRADE_THRESHOLD_MS / (60 * 60 * 1000)}h\n` +
    `\nLikely causes:\n` +
    `• wallet empty (no WETH for forward legs)\n` +
    `• liquify sweep failing (upgrade Liquifier on mainnet)\n` +
    `• repeat guard / recent-target filters\n` +
    `• no spread in band this cycle\n` +
    `Check PM2 logs or /status`;

  await sendTelegram(prefixBotMessage(bot.id, body));
  return new Date(nowMs).toISOString();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
