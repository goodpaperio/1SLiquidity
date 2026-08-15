/**
 * In-memory CEX book (WS + REST). Watch plane only — no RPC.
 */
import type { CexBookTicker } from './cexBook.js';

export interface LiveCexTicker extends CexBookTicker {
  fetchedAtMs: number;
}

const live = new Map<string, LiveCexTicker>();

export function upsertLiveTicker(
  t: CexBookTicker,
  fetchedAtMs = Date.now()
): void {
  live.set(t.symbol.toUpperCase(), { ...t, fetchedAtMs });
}

export function upsertLiveTickers(
  tickers: Iterable<CexBookTicker>,
  fetchedAtMs = Date.now()
): void {
  for (const t of tickers) upsertLiveTicker(t, fetchedAtMs);
}

export function getLiveTicker(symbol: string): LiveCexTicker | undefined {
  return live.get(symbol.toUpperCase());
}

export function getLiveTickers(): Map<string, LiveCexTicker> {
  return live;
}

export function clearLiveTickers(): void {
  live.clear();
}
