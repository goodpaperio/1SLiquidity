import fs from 'node:fs';
import path from 'node:path';
import { getBotsDir } from '../config/paths.js';
import type { BotConfig } from '../config/schema.js';
import {
  fetchBinanceBookTickers,
  selectWarmPairs,
  type WarmPairRef,
  binanceSpotSymbol,
} from './cexBook.js';
import { upsertLiveTickers } from './cexLive.js';
import { readHotPairsCache } from '../scan/hotPairs.js';

export interface WarmSetFile {
  fetchedAt: string;
  source: 'binance_rest' | 'binance_ws';
  maxCexSpreadBps: number;
  pairs: WarmPairRef[];
}

export function getBotWarmSetPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return path.join(getBotsDir(), `${safe}.warm-set.json`);
}

export function readWarmSet(botId: string): WarmSetFile | null {
  const p = getBotWarmSetPath(botId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as WarmSetFile;
  } catch {
    return null;
  }
}

export function writeWarmSet(botId: string, data: WarmSetFile): void {
  const p = getBotWarmSetPath(botId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

/**
 * Build warm-set from hot-pairs cache + Binance REST book tickers.
 * Zero Quoter RPC — signal plane only.
 */
export async function refreshWarmSetFromCex(
  bot: BotConfig,
  options?: { fetchTickers?: typeof fetchBinanceBookTickers }
): Promise<WarmSetFile> {
  const hot =
    readHotPairsCache(bot.id)?.pairs.map((p) => ({
      targetName: p.tokenASymbol,
      baseSymbol: p.tokenBSymbol,
      targetAddress: p.tokenAAddress,
    })) ?? [];

  const symbols = hot.map((h) => binanceSpotSymbol(h.targetName));
  const fetchTickers = options?.fetchTickers ?? fetchBinanceBookTickers;
  const tickers =
    symbols.length > 0 ? await fetchTickers(symbols) : new Map();
  upsertLiveTickers(tickers.values());
  const pairs = selectWarmPairs({
    candidates: hot.map((h) => ({
      targetName: h.targetName,
      baseSymbol: h.baseSymbol.toUpperCase(),
      targetAddress: h.targetAddress,
    })),
    tickers,
    limit: bot.scan.warmSetLimit,
    maxCexSpreadBps: bot.scan.warmMaxCexSpreadBps,
  });

  const file: WarmSetFile = {
    fetchedAt: new Date().toISOString(),
    source: 'binance_rest',
    maxCexSpreadBps: bot.scan.warmMaxCexSpreadBps,
    pairs,
  };
  writeWarmSet(bot.id, file);
  return file;
}

export function warmTargetAddressSet(botId: string): Set<string> | null {
  const w = readWarmSet(botId);
  if (!w?.pairs?.length) return null;
  return new Set(w.pairs.map((p) => p.targetAddress.toLowerCase()));
}
