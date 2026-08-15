import fs from 'node:fs';
import path from 'node:path';
import {
  BASE_TOKEN_ADDRESSES,
  baseTokenFromAddress,
  type BaseTokenSymbol,
  isBaseTokenSymbol,
} from '../config/baseTokens.js';
import { excludedTargetNameSet, type TradePair } from '../config/loadPairs.js';
import { getBotHotPairsPath } from '../config/paths.js';
import type { BotConfig } from '../config/schema.js';

export interface HotPairRow {
  tokenAAddress: string;
  tokenASymbol: string;
  tokenBAddress: string;
  tokenBSymbol: string;
  slippageSavings?: number;
  highestLiquidityADex?: string;
}

export interface HotPairsCacheFile {
  fetchedAt: string;
  metric: string;
  source: 'api' | 'cache';
  pairs: HotPairRow[];
}

export interface ResolveHotPairsResult {
  pairs: TradePair[];
  cacheAgeMs: number | null;
  source: 'api' | 'cache' | 'empty';
  skipReason?: string;
}

export function hotPairsApiUrl(
  baseUrl: string,
  metric: string,
  limit: number
): string {
  const base = baseUrl.replace(/\/+$/, '');
  const pathBase = base.endsWith('/api')
    ? `${base}/tokens/top`
    : `${base}/api/tokens/top`;
  const u = new URL(pathBase);
  u.searchParams.set('metric', metric);
  u.searchParams.set('limit', String(limit));
  return u.toString();
}

export function readHotPairsCache(botId: string): HotPairsCacheFile | null {
  const p = getBotHotPairsPath(botId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as HotPairsCacheFile;
  } catch {
    return null;
  }
}

export function writeHotPairsCache(
  botId: string,
  data: HotPairsCacheFile
): void {
  const p = getBotHotPairsPath(botId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

function cacheAgeMs(fetchedAt: string): number | null {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Date.now() - t);
}

/**
 * Map keeper TokenPair rows → bot TradePairs.
 * tokenB is treated as the base (WETH/USDC/…); tokenA is the alt.
 */
export function filterAndCapHotPairs(
  rows: HotPairRow[],
  options: {
    baseTokens: readonly string[];
    excludedTargets?: readonly string[];
    limit: number;
  }
): TradePair[] {
  const allowedBases = new Set(
    options.baseTokens.filter((s): s is BaseTokenSymbol =>
      isBaseTokenSymbol(s)
    )
  );
  const excluded = excludedTargetNameSet(options.excludedTargets);
  const out: TradePair[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const baseSym =
      baseTokenFromAddress(row.tokenBAddress) ??
      (isBaseTokenSymbol(row.tokenBSymbol.toUpperCase())
        ? (row.tokenBSymbol.toUpperCase() as BaseTokenSymbol)
        : null);
    if (!baseSym || !allowedBases.has(baseSym)) continue;

    const targetName = (row.tokenASymbol || 'unknown').trim();
    if (excluded.has(targetName.toLowerCase())) continue;

    const baseAddress = BASE_TOKEN_ADDRESSES[baseSym];
    const targetAddress = row.tokenAAddress;
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) continue;
    if (targetAddress.toLowerCase() === baseAddress.toLowerCase()) continue;
    if (baseTokenFromAddress(targetAddress)) continue;

    const key = `${baseAddress.toLowerCase()}:${targetAddress.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      baseSymbol: baseSym,
      baseAddress,
      targetName,
      targetAddress,
      tokenIn: baseAddress,
      tokenOut: targetAddress,
    });

    if (out.length >= options.limit) break;
  }

  return out;
}

export function parseKeeperTopResponse(json: unknown): HotPairRow[] {
  if (!json || typeof json !== 'object') return [];
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];
  const rows: HotPairRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const tokenAAddress = String(r.tokenAAddress ?? '');
    const tokenBAddress = String(r.tokenBAddress ?? '');
    if (!tokenAAddress || !tokenBAddress) continue;
    rows.push({
      tokenAAddress,
      tokenASymbol: String(r.tokenASymbol ?? ''),
      tokenBAddress,
      tokenBSymbol: String(r.tokenBSymbol ?? ''),
      slippageSavings:
        typeof r.slippageSavings === 'number' ? r.slippageSavings : undefined,
      highestLiquidityADex:
        typeof r.highestLiquidityADex === 'string'
          ? r.highestLiquidityADex
          : undefined,
    });
  }
  return rows;
}

export type FetchHotPairsFn = (url: string) => Promise<unknown>;

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Hot pairs fetch failed: HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Resolve the hot-pair trade universe for a bot.
 * Never expands to the full static JSON list.
 */
export async function resolveHotPairsForBot(
  bot: BotConfig,
  options?: {
    apiBaseUrl?: string;
    fetchJson?: FetchHotPairsFn;
    nowMs?: number;
  }
): Promise<ResolveHotPairsResult> {
  const limit = bot.scan.hotPairsLimit;
  const metric = bot.scan.hotPairsMetric;
  const ttlMs = bot.scan.hotPairsCacheTtlMs;
  const apiBase =
    options?.apiBaseUrl?.trim() ||
    process.env.HOT_PAIRS_API_BASE_URL?.trim() ||
    '';
  const fetchJson = options?.fetchJson ?? defaultFetchJson;
  const now = options?.nowMs ?? Date.now();

  if (apiBase) {
    try {
      // Over-fetch so post-filter (base / excludes) can still fill `limit`.
      const fetchLimit = Math.min(2000, Math.max(limit * 5, 50));
      const url = hotPairsApiUrl(apiBase, metric, fetchLimit);
      const json = await fetchJson(url);
      const rows = parseKeeperTopResponse(json);
      const tradePairs = filterAndCapHotPairs(rows, {
        baseTokens: bot.baseTokens,
        excludedTargets: bot.scan.excludedTargets,
        limit,
      });
      if (tradePairs.length > 0) {
        const fetchedAt = new Date(now).toISOString();
        writeHotPairsCache(bot.id, {
          fetchedAt,
          metric,
          source: 'api',
          pairs: tradePairs.map((p) => ({
            tokenAAddress: p.targetAddress,
            tokenASymbol: p.targetName,
            tokenBAddress: p.baseAddress,
            tokenBSymbol: p.baseSymbol,
          })),
        });
        return {
          pairs: tradePairs,
          cacheAgeMs: 0,
          source: 'api',
        };
      }
    } catch {
      // fall through to cache
    }
  }

  const cached = readHotPairsCache(bot.id);
  if (cached?.pairs?.length) {
    const tradePairs = filterAndCapHotPairs(cached.pairs, {
      baseTokens: bot.baseTokens,
      excludedTargets: bot.scan.excludedTargets,
      limit,
    });
    if (tradePairs.length > 0) {
      const age = cacheAgeMs(cached.fetchedAt);
      return {
        pairs: tradePairs,
        cacheAgeMs: age,
        source: 'cache',
        skipReason:
          age != null && age > ttlMs
            ? 'stale_cache_used_after_api_failure'
            : undefined,
      };
    }
  }

  return {
    pairs: [],
    cacheAgeMs: null,
    source: 'empty',
    skipReason: apiBase
      ? 'hot_pairs_unavailable'
      : 'HOT_PAIRS_API_BASE_URL_unset_and_no_cache',
  };
}
