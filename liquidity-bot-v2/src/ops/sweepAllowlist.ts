import fs from 'node:fs';
import type { BotConfig } from '../config/schema.js';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import { loadPairsForBase } from '../config/loadPairs.js';
import {
  getBotTradeHistoryPath,
  getBotTradeLedgerPath,
} from '../config/paths.js';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function addAddress(set: Set<string>, address: string | undefined): void {
  if (!address || !ADDRESS_RE.test(address)) return;
  set.add(address.toLowerCase());
}

/** Tokens the bot may send through Liquifier (pairs + trade history only). */
export function buildSweepAllowlist(bot: BotConfig): Set<string> {
  const allowed = new Set<string>();

  for (const base of bot.baseTokens) {
    addAddress(allowed, BASE_TOKEN_ADDRESSES[base as BaseTokenSymbol]);
    try {
      for (const pair of loadPairsForBase(base as BaseTokenSymbol)) {
        addAddress(allowed, pair.address);
      }
    } catch {
      // pair file missing in tests — skip
    }
  }

  const historyPath = getBotTradeHistoryPath(bot.id);
  if (fs.existsSync(historyPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(historyPath, 'utf8')) as {
        trades?: Array<{ tokenIn?: string; tokenOut?: string }>;
      };
      for (const t of raw.trades ?? []) {
        addAddress(allowed, t.tokenIn);
        addAddress(allowed, t.tokenOut);
      }
    } catch {
      /* ignore corrupt history */
    }
  }

  const ledgerPath = getBotTradeLedgerPath(bot.id);
  if (fs.existsSync(ledgerPath)) {
    for (const line of fs.readFileSync(ledgerPath, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line) as Record<string, string | undefined>;
        for (const key of [
          'leg1TokenIn',
          'leg2TokenIn',
          'settlementToken',
        ] as const) {
          const val = row[key];
          if (val && val.startsWith('0x')) addAddress(allowed, val);
        }
      } catch {
        /* skip bad line */
      }
    }
  }

  // Never sweep base inventory tokens via liquify inputs.
  for (const base of bot.baseTokens) {
    allowed.delete(
      BASE_TOKEN_ADDRESSES[base as BaseTokenSymbol].toLowerCase()
    );
  }

  return allowed;
}
