import fs from 'node:fs';
import { Contract, type Provider } from 'ethers';
import type { BotConfig } from '../config/schema.js';
import { getBotNotifyStatePath, getBotsDir } from '../config/paths.js';
import { CORE_EVENT_ABI, parseTradeCompletedLogs } from './parseTradeEvents.js';
import { TradeNotifier } from './tradeNotify.js';

interface NotifyState {
  lastCompletedBlock: number;
  notifiedTradeIds: number[];
}

const MAX_NOTIFIED_IDS = 500;

function loadState(botId: string): NotifyState {
  const path = getBotNotifyStatePath(botId);
  if (!fs.existsSync(path)) {
    return { lastCompletedBlock: 0, notifiedTradeIds: [] };
  }
  return JSON.parse(fs.readFileSync(path, 'utf8')) as NotifyState;
}

function saveState(botId: string, state: NotifyState): void {
  fs.mkdirSync(getBotsDir(), { recursive: true });
  const trimmed = state.notifiedTradeIds.slice(-MAX_NOTIFIED_IDS);
  fs.writeFileSync(
    getBotNotifyStatePath(botId),
    JSON.stringify({ ...state, notifiedTradeIds: trimmed }, null, 2) + '\n',
    'utf8'
  );
}

/**
 * Poll Core for TradeCompleted events matching open ledger rows.
 */
export async function pollTradeCompletions(
  bot: BotConfig,
  provider: Provider
): Promise<number> {
  const notifier = new TradeNotifier(bot);
  const ledger = notifier.getLedger();
  const open = ledger.openTrades();
  if (open.length === 0) return 0;

  const state = loadState(bot.id);
  const core = new Contract(bot.contracts.core, CORE_EVENT_ABI, provider);
  const filter = core.filters.TradeCompleted();
  const fromBlock = state.lastCompletedBlock > 0 ? state.lastCompletedBlock + 1 : 0;
  const events = await core.queryFilter(filter, fromBlock);
  const completed = parseTradeCompletedLogs(
    events.map((e) => {
      const log = e as { blockNumber: number; transactionHash: string };
      return {
        address: e.address,
        topics: e.topics as readonly string[],
        data: e.data,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      };
    }),
    bot.contracts.core
  );

  let notified = 0;
  let maxBlock = state.lastCompletedBlock;

  for (const event of completed) {
    if (event.blockNumber > maxBlock) maxBlock = event.blockNumber;
    if (state.notifiedTradeIds.includes(event.tradeId)) continue;

    const row = open.find((r) => r.tradeId === event.tradeId);
    if (!row || row.tradeId == null) continue;

    await notifier.tradeCompleted({
      tradeId: event.tradeId,
      pair: row.pair,
      leg1AmountIn: BigInt(row.leg1AmountIn),
      settlementToken: row.settlementToken,
      finalOut: event.finalRealisedAmountOut,
      placedAt: row.placedAt,
    });
    state.notifiedTradeIds.push(event.tradeId);
    notified++;
  }

  if (maxBlock > state.lastCompletedBlock) {
    state.lastCompletedBlock = maxBlock;
  }
  saveState(bot.id, state);
  return notified;
}
