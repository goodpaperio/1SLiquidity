import fs from 'node:fs';
import { Contract, type Provider } from 'ethers';
import type { BotConfig } from '../config/schema.js';
import { loadCoreDeploymentBlock } from '../config/deploymentManifest.js';
import { getBotNotifyStatePath, getBotsDir } from '../config/paths.js';
import { fetchTrade, getCoreContract } from '../chain/core.js';
import { CORE_EVENT_ABI, parseTradeCompletedLogs } from './parseTradeEvents.js';
import { TradeNotifier } from './tradeNotify.js';

interface NotifyState {
  lastCompletedBlock: number;
  notifiedTradeIds: number[];
}

const MAX_NOTIFIED_IDS = 500;

/** Alchemy free tier allows eth_getLogs ranges of at most 10 blocks. */
const DEFAULT_GETLOGS_MAX_RANGE = 10;
/** Safety blocks before estimated placement time on cold start. */
const PLACEMENT_LOOKBACK_BLOCKS = 2_880; // ~8h at 12s/block
const MAX_CHUNKS_PER_CYCLE = 200;

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

export function getLogsMaxRange(): number {
  const raw = process.env.ETH_GETLOGS_MAX_RANGE?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return DEFAULT_GETLOGS_MAX_RANGE;
}

/**
 * Choose the inclusive start block for TradeCompleted log polls.
 * Never earlier than Core deploymentBlock from the bot's deployment manifest.
 */
export function resolveCompletionFromBlock(params: {
  lastCompletedBlock: number;
  deploymentBlock: number;
  latestBlock: number;
  earliestOpenPlacedAtMs?: number;
  tipTimestampSec?: number;
}): number {
  const { lastCompletedBlock, deploymentBlock, latestBlock } = params;
  let from: number;
  if (lastCompletedBlock > 0) {
    from = lastCompletedBlock + 1;
  } else if (
    params.earliestOpenPlacedAtMs != null &&
    params.tipTimestampSec != null &&
    params.tipTimestampSec > 0
  ) {
    const secAgo = Math.max(
      0,
      params.tipTimestampSec - Math.floor(params.earliestOpenPlacedAtMs / 1000)
    );
    const approx = latestBlock - Math.ceil(secAgo / 12);
    from = approx - PLACEMENT_LOOKBACK_BLOCKS;
  } else {
    from = deploymentBlock;
  }

  return Math.max(deploymentBlock, Math.min(from, latestBlock + 1));
}

async function queryFilterChunked(
  core: Contract,
  filter: unknown,
  fromBlock: number,
  toBlock: number,
  maxRange: number,
  maxChunks: number
): Promise<{
  events: Awaited<ReturnType<Contract['queryFilter']>>;
  scannedTo: number;
}> {
  const events: Awaited<ReturnType<Contract['queryFilter']>> = [];
  let cursor = fromBlock;
  let chunks = 0;
  while (cursor <= toBlock && chunks < maxChunks) {
    const chunkTo = Math.min(cursor + maxRange - 1, toBlock);
    const batch = await core.queryFilter(filter as never, cursor, chunkTo);
    events.push(...batch);
    cursor = chunkTo + 1;
    chunks++;
  }
  return { events, scannedTo: cursor - 1 };
}

/**
 * Poll Core for TradeCompleted events matching open ledger rows.
 * Log scans are floored at Core deploymentBlock and chunked for RPC limits.
 */
export async function pollTradeCompletions(
  bot: BotConfig,
  provider: Provider
): Promise<number> {
  const notifier = new TradeNotifier(bot);
  const ledger = notifier.getLedger();
  const open = ledger.openTrades();
  if (open.length === 0) return 0;

  const deploymentBlock = loadCoreDeploymentBlock(bot);
  const state = loadState(bot.id);
  const latestBlock = await provider.getBlockNumber();
  const tip = await provider.getBlock(latestBlock);
  const tipTimestampSec = tip?.timestamp ?? 0;

  const earliestOpenPlacedAtMs = Math.min(
    ...open.map((r) => new Date(r.placedAt).getTime())
  );

  const fromBlock = resolveCompletionFromBlock({
    lastCompletedBlock: state.lastCompletedBlock,
    deploymentBlock,
    latestBlock,
    earliestOpenPlacedAtMs: Number.isFinite(earliestOpenPlacedAtMs)
      ? earliestOpenPlacedAtMs
      : undefined,
    tipTimestampSec,
  });

  if (fromBlock > latestBlock) {
    return 0;
  }

  // Drop ledger rows for trades that no longer exist on Core (settled/cancelled
  // while notify cursor was stuck). Avoids infinite eth_getLogs catch-up.
  const coreRead = getCoreContract(bot, provider);
  let reconciled = 0;
  for (const row of open) {
    if (row.tradeId == null) continue;
    const onChain = await fetchTrade(coreRead, row.tradeId);
    if (onChain != null) continue;
    ledger.updateOpen(
      { tradeId: row.tradeId },
      {
        status: 'completed',
        completedAt: new Date().toISOString(),
        error: 'reconciled: getTrade not found (settled or cancelled off-ledger)',
      }
    );
    if (!state.notifiedTradeIds.includes(row.tradeId)) {
      state.notifiedTradeIds.push(row.tradeId);
    }
    reconciled++;
  }
  if (reconciled > 0) {
    saveState(bot.id, state);
    console.log(
      `[${bot.id}] completion watcher reconciled ${reconciled} vanished open ledger trade(s)`
    );
  }

  const stillOpen = ledger.openTrades();
  if (stillOpen.length === 0) {
    if (state.lastCompletedBlock < latestBlock) {
      state.lastCompletedBlock = latestBlock;
      saveState(bot.id, state);
    }
    return 0;
  }

  const core = new Contract(bot.contracts.core, CORE_EVENT_ABI, provider);
  const filter = core.filters.TradeCompleted();
  const maxRange = getLogsMaxRange();
  const { events, scannedTo } = await queryFilterChunked(
    core,
    filter,
    fromBlock,
    latestBlock,
    maxRange,
    MAX_CHUNKS_PER_CYCLE
  );

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
  let maxBlock = Math.max(state.lastCompletedBlock, scannedTo);

  for (const event of completed) {
    if (event.blockNumber > maxBlock) maxBlock = event.blockNumber;
    if (state.notifiedTradeIds.includes(event.tradeId)) continue;

    const row = stillOpen.find((r) => r.tradeId === event.tradeId);
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

  // Always advance the cursor — including empty ranges — so catch-up progresses
  // under eth_getLogs max-range limits.
  if (maxBlock > state.lastCompletedBlock) {
    state.lastCompletedBlock = maxBlock;
  }
  saveState(bot.id, state);

  if (scannedTo < latestBlock) {
    console.log(
      `[${bot.id}] completion watcher catch-up: scanned through block ${scannedTo} ` +
        `(tip ${latestBlock}, range≤${maxRange}, floor=${deploymentBlock})`
    );
  }

  return notified;
}
