#!/usr/bin/env node
/**
 * Cancel an outstanding Core trade owned by the bot wallet.
 *
 * Returns remaining tokenIn + any realised tokenOut to the bot address.
 *
 * Examples:
 *   npm run cancel:trade -- --bot alpha --list
 *   npm run cancel:trade -- --bot alpha --trade-id 10
 *   DRY_RUN=1 npm run cancel:trade -- --bot alpha --trade-id 10
 */
import 'dotenv/config';
import { formatUnits } from 'ethers';
import { createProvider } from '../chain/provider.js';
import {
  cancelTradeOnCore,
  fetchTrade,
  getCoreContract,
  listOutstandingTradesForOwner,
} from '../chain/core.js';
import { createBotWallet, isDryRun } from '../chain/wallet.js';
import { BASE_TOKEN_ADDRESSES } from '../config/baseTokens.js';
import { loadBotConfig } from '../config/loadBot.js';
import { parseCliArgs, requireBotId } from './parse-args.js';

const PYUSD = '0x6c3ea9036406852006290770bedfcaba0e23a0e8';

const SYMBOLS: Record<string, string> = {
  [BASE_TOKEN_ADDRESSES.WETH.toLowerCase()]: 'WETH',
  [PYUSD.toLowerCase()]: 'pyusd',
};

function symbol(addr: string): string {
  return SYMBOLS[addr.toLowerCase()] ?? addr.slice(0, 10) + '…';
}

function fmt(amount: bigint, token: string): string {
  const dec =
    token.toLowerCase() === BASE_TOKEN_ADDRESSES.WETH.toLowerCase() ? 18 : 6;
  return `${formatUnits(amount, dec)} ${symbol(token)}`;
}

function printTrade(trade: Awaited<ReturnType<typeof fetchTrade>>): void {
  if (!trade) return;
  console.log(`  tradeId:          ${trade.tradeId}`);
  console.log(`  pair:             ${symbol(trade.tokenIn)} → ${symbol(trade.tokenOut)}`);
  console.log(`  amountIn:         ${fmt(trade.amountIn, trade.tokenIn)}`);
  console.log(
    `  amountRemaining:  ${fmt(trade.amountRemaining, trade.tokenIn)}`
  );
  console.log(
    `  targetAmountOut:  ${fmt(trade.targetAmountOut, trade.tokenOut)}`
  );
  console.log(
    `  realisedAmountOut:${fmt(trade.realisedAmountOut, trade.tokenOut)}`
  );
  console.log(`  attempts:         ${trade.attempts}`);
  console.log(`  lastSweetSpot:    ${trade.lastSweetSpot}`);
}

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const wallet = createBotWallet(bot, provider);
  const core = getCoreContract(bot, wallet);
  const signerAddr = await wallet.getAddress();

  console.log(`\n[cancel-trade] bot=${botId} signer=${signerAddr}`);
  console.log(`  core=${bot.contracts.core}`);
  console.log(`  DRY_RUN=${isDryRun() ? '1 (preview only)' : '0 (LIVE cancel)'}\n`);

  if (flags.list === true) {
    const outstanding = await listOutstandingTradesForOwner(core, signerAddr);
    if (outstanding.length === 0) {
      console.log('No outstanding trades for this owner on Core.\n');
      return;
    }
    console.log(`Outstanding trades (${outstanding.length}):\n`);
    for (const t of outstanding) {
      printTrade(t);
      console.log('');
    }
    console.log(
      'Cancel one: npm run cancel:trade -- --bot alpha --trade-id <id>\n'
    );
    return;
  }

  const tradeIdRaw =
    typeof flags['trade-id'] === 'string'
      ? flags['trade-id']
      : positional.find((a) => /^\d+$/.test(a));
  if (!tradeIdRaw) {
    throw new Error(
      'Pass --trade-id <id> or use --list. Example: npm run cancel:trade -- --bot alpha --trade-id 10'
    );
  }
  const tradeId = BigInt(tradeIdRaw);

  const trade = await fetchTrade(core, tradeId);
  if (!trade) {
    throw new Error(`Trade ${tradeId} not found on Core`);
  }
  if (trade.owner.toLowerCase() !== signerAddr.toLowerCase()) {
    throw new Error(
      `Trade ${tradeId} owner is ${trade.owner}, not bot ${signerAddr}`
    );
  }
  if (trade.amountRemaining === 0n) {
    console.log('Trade has no amountRemaining — may already be completed.\n');
    printTrade(trade);
    return;
  }

  console.log('Trade to cancel:\n');
  printTrade(trade);
  console.log('');

  if (isDryRun()) {
    console.log(
      '[cancel-trade] DRY_RUN=1 — would call core.cancelTrade(' +
        tradeId +
        '). Unset DRY_RUN to send.\n'
    );
    return;
  }

  const { txHash } = await cancelTradeOnCore(core, tradeId);
  console.log(`[cancel-trade] cancelTrade confirmed: ${txHash}\n`);
  console.log(
    'Remaining tokenIn + realised tokenOut are returned to the bot wallet.\n'
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
