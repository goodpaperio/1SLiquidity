import fs from 'node:fs';
import {
  BASE_PAIR_FILES,
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
  baseTokenFromAddress,
  isBaseTokenSymbol,
} from './baseTokens.js';
import { assertRepoLayout, resolveFromRepo } from './paths.js';
import { pairFileSchema } from './schema.js';
import type { BotConfig } from './schema.js';

export interface PairTarget {
  name: string;
  address: string;
}

export interface TradePair {
  /** Base token symbol (inventory side for leg 1). */
  baseSymbol: BaseTokenSymbol;
  baseAddress: string;
  /** Alt / target token. */
  targetName: string;
  targetAddress: string;
  /** Same as targetAddress; explicit for direction base → alt. */
  tokenOut: string;
  tokenIn: string;
}

function loadPairFile(relativePath: string): PairTarget[] {
  const absolute = resolveFromRepo(relativePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Pair file not found: ${absolute}`);
  }
  const raw = JSON.parse(fs.readFileSync(absolute, 'utf8')) as unknown;
  const parsed = pairFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid pair file ${absolute}: ${parsed.error.message}`);
  }
  return parsed.data.pairs;
}

/** Load all targets for one base from repo config. */
export function loadPairsForBase(baseSymbol: BaseTokenSymbol): PairTarget[] {
  assertRepoLayout();
  return loadPairFile(BASE_PAIR_FILES[baseSymbol]);
}

/**
 * Build trade pairs (base → alt) for a bot's configured bases.
 * Skips targets whose address equals the base (e.g. WETH in weth list).
 */
export function buildTradePairsForBot(bot: BotConfig): TradePair[] {
  return buildTradePairsForBaseSymbols(bot.baseTokens);
}

/**
 * Build trade pairs (base → alt) for explicit base symbols.
 * Skips targets whose address equals the base (e.g. WETH in weth list).
 */
export function buildTradePairsForBaseSymbols(
  baseSymbols: readonly string[]
): TradePair[] {
  const pairs: TradePair[] = [];
  const seen = new Set<string>();

  for (const baseSymbol of baseSymbols) {
    if (!isBaseTokenSymbol(baseSymbol)) {
      throw new Error(`Unknown base token in bot config: ${baseSymbol}`);
    }
    const baseAddress = BASE_TOKEN_ADDRESSES[baseSymbol];
    const targets = loadPairsForBase(baseSymbol);

    for (const t of targets) {
      if (t.address.toLowerCase() === baseAddress.toLowerCase()) {
        continue;
      }
      if (baseTokenFromAddress(t.address)) {
        continue;
      }
      const key = `${baseAddress.toLowerCase()}:${t.address.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      pairs.push({
        baseSymbol,
        baseAddress,
        targetName: t.name,
        targetAddress: t.address,
        tokenIn: baseAddress,
        tokenOut: t.address,
      });
    }
  }

  return pairs;
}

export function countTradePairsForBot(bot: BotConfig): number {
  return buildTradePairsForBot(bot).length;
}
