import fs from 'node:fs';
import { getBotsDir } from '../config/paths.js';

export interface TokenIssueRecord {
  targetName: string;
  tradeId: number;
  pair: string;
  reason: string;
  recordedAt: string;
  action: 'auto_cancel_stuck' | 'leg2_failed' | 'manual';
}

export function getTokenIssuesPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return `${getBotsDir()}/${safe}.token-issues.jsonl`;
}

/** Append a suspected DecaStream/token issue for later review (e.g. add to excludedTargets). */
export function recordTokenIssue(
  botId: string,
  record: TokenIssueRecord
): void {
  fs.mkdirSync(getBotsDir(), { recursive: true });
  fs.appendFileSync(
    getTokenIssuesPath(botId),
    JSON.stringify(record) + '\n',
    'utf8'
  );
}

/** Extract alt token name from ledger pair label (e.g. WETH→cbeth → cbeth). */
export function targetNameFromPairLabel(pair: string): string | null {
  const parts = pair.split('→').map((s) => s.trim().toLowerCase());
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (a === 'weth') return b;
  if (b === 'weth') return a;
  return b;
}
