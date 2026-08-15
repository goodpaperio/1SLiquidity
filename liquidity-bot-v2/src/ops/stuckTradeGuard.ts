import fs from 'node:fs';
import type { Contract, Provider } from 'ethers';
import type { BotConfig } from '../config/schema.js';
import {
  cancelTradeOnCore,
  executeTradesOnCore,
  fetchTrade,
  listOutstandingTradesForOwner,
  pairIdFromTokens,
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
  /** Whether we already tried executeTrades(pairId) once for this stuck spell. */
  settlementAttempted: boolean;
  updatedAt: string;
}

function stuckStatePath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${getBotsDir()}/${safe}.stuck-trade.json`;
}

export function loadStuckTradeState(botId: string): StuckTradeState | null {
  const path = stuckStatePath(botId);
  if (!fs.existsSync(path)) return null;
  const raw = JSON.parse(fs.readFileSync(path, 'utf8')) as Partial<StuckTradeState>;
  return {
    tradeId: raw.tradeId!,
    cyclesSeen: raw.cyclesSeen ?? 0,
    settlementAttempted: raw.settlementAttempted ?? false,
    updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
  };
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

/**
 * Scan cycle (counting toward auto-cancel) at which the bot tries one
 * executeTrades(pairId) settlement before giving up.
 */
export function stuckSettlementAttemptCycle(threshold: number): number | null {
  if (threshold <= 1) return null;
  const attemptCycle = Math.ceil(threshold / 2);
  return attemptCycle < threshold ? attemptCycle : null;
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
          settlementAttempted: prev.settlementAttempted,
          updatedAt: new Date().toISOString(),
        }
      : {
          tradeId,
          cyclesSeen: 1,
          settlementAttempted: false,
          updatedAt: new Date().toISOString(),
        };
  saveStuckTradeState(botId, next);
  return next;
}

export function markSettlementAttempted(
  botId: string,
  tradeId: number
): StuckTradeState {
  const prev = loadStuckTradeState(botId);
  const next: StuckTradeState = {
    tradeId,
    cyclesSeen: prev?.tradeId === tradeId ? prev.cyclesSeen : 1,
    settlementAttempted: true,
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
  settlementAttempted?: boolean;
  settlementTxHash?: string;
}

async function tradeStillOpen(
  core: Contract,
  tradeId: number
): Promise<CoreTradeView | null> {
  const live = await fetchTrade(core, tradeId);
  if (!live || live.amountRemaining === 0n) return null;
  return live;
}

async function maybeAttemptStuckSettlement(
  bot: BotConfig,
  core: Contract,
  provider: Provider,
  trade: CoreTradeView,
  state: StuckTradeState,
  attemptCycle: number
): Promise<StuckTradeGuardResult | null> {
  if (state.cyclesSeen !== attemptCycle || state.settlementAttempted) {
    return null;
  }

  const tradeId = Number(trade.tradeId);
  const pairId = pairIdFromTokens(trade.tokenIn, trade.tokenOut);
  const pairShort = `${pairId.slice(0, 10)}…`;

  console.warn(
    `[${bot.id}] trade #${tradeId} still open at cycle ${state.cyclesSeen} — attempting executeTrades(${pairShort})`
  );

  markSettlementAttempted(bot.id, tradeId);

  if (isDryRun()) {
    console.warn(
      `[${bot.id}] DRY_RUN=1 — would executeTrades(${pairShort}) for trade #${tradeId}`
    );
    return {
      cancelled: false,
      dryRun: true,
      tradeId,
      cyclesSeen: state.cyclesSeen,
      settlementAttempted: true,
    };
  }

  const wallet = createBotWallet(bot, provider);
  const coreWithSigner = core.connect(wallet) as Contract;

  const live = await tradeStillOpen(coreWithSigner, tradeId);
  if (!live) {
    clearStuckTradeState(bot.id);
    return { cancelled: false, tradeId };
  }

  try {
    const { txHash } = await executeTradesOnCore(coreWithSigner, pairId);
    console.log(
      `[${bot.id}] executeTrades settlement for #${tradeId} confirmed: ${txHash}`
    );

    const after = await tradeStillOpen(coreWithSigner, tradeId);
    if (!after) {
      clearStuckTradeState(bot.id);
    }

    return {
      cancelled: false,
      tradeId,
      cyclesSeen: state.cyclesSeen,
      settlementAttempted: true,
      settlementTxHash: txHash,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(
      `[${bot.id}] executeTrades settlement attempt failed for #${tradeId}: ${reason}`
    );
    return {
      cancelled: false,
      tradeId,
      cyclesSeen: state.cyclesSeen,
      settlementAttempted: true,
    };
  }
}

/**
 * If a Core trade stays open for `stuckCancelAfterCycles` bot scan cycles,
 * cancel it so the runner can resume placing new trades.
 *
 * At half that threshold (ceil), the bot makes one executeTrades(pairId) attempt
 * to stream/settle before auto-cancel — a backstop when local-monitor is down.
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

  const attemptCycle = stuckSettlementAttemptCycle(threshold);
  if (attemptCycle !== null) {
    const settlement = await maybeAttemptStuckSettlement(
      bot,
      core,
      provider,
      trade,
      state,
      attemptCycle
    );
    if (settlement) {
      return settlement;
    }
  }

  if (state.cyclesSeen < threshold) {
    const attemptNote =
      attemptCycle !== null
        ? `, settle attempt at cycle ${attemptCycle}`
        : '';
    console.log(
      `[${bot.id}] outstanding trade #${tradeId} — cycle ${state.cyclesSeen}/${threshold} before auto-cancel${attemptNote}`
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
  const live = await tradeStillOpen(coreWithSigner, tradeId);
  if (!live) {
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
