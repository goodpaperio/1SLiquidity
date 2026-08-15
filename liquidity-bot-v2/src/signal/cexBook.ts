/**
 * CEX mid / book signal plane (Binance public API).
 * Used to build a warm-set so the bot Multicalls only liquid / active names.
 * WebSocket = long-running watch; REST = dry-run / bootstrap snapshot.
 */

export interface CexBookTicker {
  symbol: string; // e.g. MANAUSDT
  bid: number;
  ask: number;
  mid: number;
  /** (ask-bid)/mid in bps */
  spreadBps: number;
}

export function binanceSpotSymbol(
  altSymbol: string,
  quote: 'USDT' | 'USDC' = 'USDT'
): string {
  const clean = altSymbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `${clean}${quote}`;
}

export function bookTickerFromBinancePayload(raw: {
  s?: string;
  symbol?: string;
  b?: string;
  bidPrice?: string;
  a?: string;
  askPrice?: string;
}): CexBookTicker | null {
  const symbol = String(raw.s ?? raw.symbol ?? '');
  const bid = Number(raw.b ?? raw.bidPrice);
  const ask = Number(raw.a ?? raw.askPrice);
  if (!symbol || !(bid > 0) || !(ask > 0) || ask < bid) return null;
  const mid = (bid + ask) / 2;
  const spreadBps = ((ask - bid) / mid) * 10_000;
  return { symbol, bid, ask, mid, spreadBps };
}

/** One-shot REST snapshot (dry-run / bootstrap). No API key. */
export async function fetchBinanceBookTickers(
  symbols: string[],
  fetchImpl: typeof fetch = fetch
): Promise<Map<string, CexBookTicker>> {
  const out = new Map<string, CexBookTicker>();
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];

  const ingest = (data: unknown) => {
    const rows = Array.isArray(data) ? data : [data];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const t = bookTickerFromBinancePayload(row as never);
      if (t) out.set(t.symbol, t);
    }
  };

  // Prefer batch; fall back to per-symbol (unknown alts must not fail the batch).
  const chunkSize = 20;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const q = encodeURIComponent(JSON.stringify(chunk));
    const url = `https://api.binance.com/api/v3/ticker/bookTicker?symbols=${q}`;
    try {
      const res = await fetchImpl(url);
      if (res.ok) {
        ingest(await res.json());
        continue;
      }
    } catch {
      // fall through to singles
    }
    for (const sym of chunk) {
      try {
        const res = await fetchImpl(
          `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${sym}`
        );
        if (!res.ok) continue;
        ingest(await res.json());
      } catch {
        // skip unlisted
      }
    }
  }
  return out;
}

export interface WarmPairRef {
  targetName: string;
  baseSymbol: string;
  targetAddress: string;
  cexSymbol?: string;
  cexSpreadBps?: number;
  cexMid?: number;
  reason: string;
}

/**
 * Prefer alts with a Binance listing and tight CEX book (low RPC, high fill quality).
 */
export function selectWarmPairs(params: {
  candidates: Array<{
    targetName: string;
    baseSymbol: string;
    targetAddress: string;
  }>;
  tickers: Map<string, CexBookTicker>;
  limit: number;
  maxCexSpreadBps: number;
}): WarmPairRef[] {
  const scored: WarmPairRef[] = [];
  for (const c of params.candidates) {
    const cexSymbol = binanceSpotSymbol(c.targetName);
    const t = params.tickers.get(cexSymbol);
    if (!t) continue;
    if (t.spreadBps > params.maxCexSpreadBps) continue;
    scored.push({
      ...c,
      cexSymbol,
      cexSpreadBps: t.spreadBps,
      cexMid: t.mid,
      reason: `cex_spread_${t.spreadBps.toFixed(1)}bps`,
    });
  }
  scored.sort(
    (a, b) => (a.cexSpreadBps ?? 1e9) - (b.cexSpreadBps ?? 1e9)
  );
  return scored.slice(0, params.limit);
}
