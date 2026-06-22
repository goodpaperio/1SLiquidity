import fs from 'node:fs';
import type { Contract, Provider } from 'ethers';
import type { BotConfig } from '../config/schema.js';
import {
  cancelTradeOnCore,
  fetchTrade,
  listOutstandingTradesForOwner,
  type CoreTradeView,
} from '../chain/core.js';
import { createBotWallet, isDryRun } from '../chain/wallet.js';
import { getBotsDir } from '../config/paths.js';
import { TradeLedger } from '../notify/tradeLedger.js';
import { recordTokenIssue, targetNameFromPairLabel } from './tokenIssues.js';

export interface StuckTradeState {
  tradeId: number;
  /** Consecutive bot scan cycles where this tradeId was still outstanding. */
  cyclesSeen: number;
  updatedAt: string;
}

function stuckStatePath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${getBotsDir()}/${safe}.stuck-trade.json`;
}

export function loadStuckTradeState(botId: string): StuckTradeState | null {
  const path = stuckStatePath(botId);
  if (!fs.existsSync(path)) return null;
  return JSON.parse(fs.readFileSync(path, 'utf8')) as StuckTradeState;
}

export function saveStuckTradeState(
  botId: string,
  state: StuckTradeState | null
): void {
  fs.mkdirSync(getBotsDir(), { recursive: true });
  const path = stuckStatePath(botId);
  if (!state) {
    if (fs.existsSync(path)) fs.unlinkSync(path);
    return;
  }
  fs.writeFileSync(path, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

/** Advance stuck-cycle counter for an outstanding trade; returns updated state. */
export function bumpStuckCycle(
  botId: string,
  tradeId: number
): StuckTradeState {
  const prev = loadStuckTradeState(botId);
  const next: StuckTradeState =
    prev?.tradeId === tradeId
      ? {
          tradeId,
          cyclesSeen: prev.cyclesSeen + 1,
          updatedAt: new Date().toISOString(),
        }
      : {
          tradeId,
          cyclesSeen: 1,
          updatedAt: new Date().toISOString(),
        };
  saveStuckTradeState(botId, next);
  return next;
}

export function clearStuckTradeState(botId: string): void {
  saveStuckTradeState(botId, null);
}

export interface StuckTradeGuardResult {
  cancelled: boolean;
  tradeId?: number;
  cyclesSeen?: number;
  txHash?: string;
  dryRun?: boolean;
}

/**
 * If a Core trade stays open for `stuckCancelAfterCycles` bot scan cycles,
 * cancel it so the runner can resume placing new trades.
 */
export async function maybeCancelStuckTrade(
  bot: BotConfig,
  core: Contract,
  provider: Provider
): Promise<StuckTradeGuardResult> {
  const threshold = bot.trade.stuckCancelAfterCycles;
  if (threshold <= 0) {
    return { cancelled: false };
  }

  const outstanding = await listOutstandingTradesForOwner(
    core,
    bot.address
  );
  if (outstanding.length === 0) {
    clearStuckTradeState(bot.id);
    return { cancelled: false };
  }

  const trade = pickStuckTrade(outstanding);
  const tradeId = Number(trade.tradeId);
  const state = bumpStuckCycle(bot.id, tradeId);

  if (state.cyclesSeen < threshold) {
    console.log(
      `[${bot.id}] outstanding trade #${tradeId} — cycle ${state.cyclesSeen}/${threshold} before auto-cancel`
    );
    return { cancelled: false, tradeId, cyclesSeen: state.cyclesSeen };
  }

  const ledger = new TradeLedger(bot.id);
  const openRow = ledger.openTrades().find((r) => r.tradeId === tradeId);
  const pairLabel = openRow?.pair ?? `${trade.tokenIn}→${trade.tokenOut}`;

  console.warn(
    `[${bot.id}] trade #${tradeId} stuck ${state.cyclesSeen} cycles (≥${threshold}) — auto-cancel`
  );

  if (isDryRun()) {
    console.warn(
      `[${bot.id}] DRY_RUN=1 — would cancelTrade(${tradeId}) for ${pairLabel}`
    );
    return {
      cancelled: false,
      dryRun: true,
      tradeId,
      cyclesSeen: state.cyclesSeen,
    };
  }

  const wallet = createBotWallet(bot, provider);
  const coreWithSigner = core.connect(wallet) as Contract;
  const live = await fetchTrade(coreWithSigner, tradeId);
  if (!live || live.amountRemaining === 0n) {
    clearStuckTradeState(bot.id);
    ledger.updateOpen({ tradeId }, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
      error: 'already settled before auto-cancel',
    });
    return { cancelled: false, tradeId };
  }

  const { txHash } = await cancelTradeOnCore(coreWithSigner, tradeId);
  ledger.updateOpen({ tradeId }, {
    status: 'cancelled',
    completedAt: new Date().toISOString(),
    error: `auto-cancel after ${state.cyclesSeen} stuck bot cycles`,
  });

  const target = targetNameFromPairLabel(pairLabel);
  if (target) {
    recordTokenIssue(bot.id, {
      targetName: target,
      tradeId,
      pair: pairLabel,
      reason: `auto-cancel after ${state.cyclesSeen} scan cycles without Core completion`,
      recordedAt: new Date().toISOString(),
      action: 'auto_cancel_stuck',
    });
    console.warn(
      `[${bot.id}] logged token issue for "${target}" → review bots/${bot.id}.token-issues.jsonl and consider scan.excludedTargets`
    );
  }

  clearStuckTradeState(bot.id);
  console.log(`[${bot.id}] cancelTrade #${tradeId} confirmed: ${txHash}`);

  return {
    cancelled: true,
    tradeId,
    cyclesSeen: state.cyclesSeen,
    txHash,
  };
}

function pickStuckTrade(outstanding: CoreTradeView[]): CoreTradeView {
  return outstanding.reduce((a, b) =>
    a.tradeId > b.tradeId ? a : b
  );
}
