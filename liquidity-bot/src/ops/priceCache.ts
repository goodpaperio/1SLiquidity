import fs from 'node:fs';
import path from 'node:path';
import { getPackageRoot } from '../config/paths.js';
import type { PriceHints } from '../config/sizing.js';
import { fetchEthBtcUsd } from './defiLlamaPrices.js';

const CACHE_PATH = path.join(getPackageRoot(), 'data', 'price-cache.json');
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface PriceCacheFile {
  ethUsd: number;
  btcUsd: number;
  fetchedAt: string;
}

function readCacheFile(): PriceCacheFile | null {
  if (!fs.existsSync(CACHE_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as PriceCacheFile;
  } catch {
    return null;
  }
}

function writeCacheFile(data: PriceCacheFile): void {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2) + '\n');
}

function isStale(fetchedAt: string): boolean {
  const t = Date.parse(fetchedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > MAX_AGE_MS;
}

async function fetchSpotPrices(): Promise<{ ethUsd: number; btcUsd: number }> {
  return fetchEthBtcUsd();
}

/** Sync read — returns null if missing or invalid. */
export function readPriceHints(): PriceHints | null {
  const cached = readCacheFile();
  if (!cached) return null;
  if (cached.ethUsd <= 0 || cached.btcUsd <= 0) return null;
  return { ethUsd: cached.ethUsd, btcUsd: cached.btcUsd };
}

/**
 * Return cached prices; refresh from DefiLlama when stale or missing.
 * Throws if fetch fails and no usable cache exists.
 */
export async function ensurePriceCache(): Promise<PriceHints> {
  const cached = readCacheFile();
  if (cached && !isStale(cached.fetchedAt)) {
    return { ethUsd: cached.ethUsd, btcUsd: cached.btcUsd };
  }

  try {
    const fresh = await fetchSpotPrices();
    writeCacheFile({
      ...fresh,
      fetchedAt: new Date().toISOString(),
    });
    return fresh;
  } catch (err) {
    if (cached && cached.ethUsd > 0 && cached.btcUsd > 0) {
      console.warn(
        '[price-cache] refresh failed; using stale cache:',
        err instanceof Error ? err.message : err
      );
      return { ethUsd: cached.ethUsd, btcUsd: cached.btcUsd };
    }
    throw err;
  }
}
