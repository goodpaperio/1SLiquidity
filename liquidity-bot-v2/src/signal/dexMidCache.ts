import fs from 'node:fs';
import path from 'node:path';
import { getBotsDir } from '../config/paths.js';
import type { DexMidCacheFile, DexMidRow } from './cexDexRank.js';

export function getBotDexMidsPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return path.join(getBotsDir(), `${safe}.dex-mids.json`);
}

export function readDexMidCache(botId: string): DexMidCacheFile | null {
  const p = getBotDexMidsPath(botId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as DexMidCacheFile;
  } catch {
    return null;
  }
}

export function writeDexMidCache(botId: string, rows: DexMidRow[]): void {
  const p = getBotDexMidsPath(botId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const file: DexMidCacheFile = {
    fetchedAt: new Date().toISOString(),
    rows,
  };
  fs.writeFileSync(p, JSON.stringify(file, null, 2) + '\n');
}
