/**
 * Long-running Binance combined stream for bookTickers.
 * Updates an in-memory map; callers periodically flush warm-set via warmSet.ts.
 *
 * Placement: signal plane only — never calls Quoter / Multicall.
 */
import {
  bookTickerFromBinancePayload,
  type CexBookTicker,
} from './cexBook.js';

export type BookTickerHandler = (ticker: CexBookTicker) => void;

export function binanceBookTickerStreamUrl(symbols: string[]): string {
  const streams = symbols
    .map((s) => `${s.toLowerCase()}@bookTicker`)
    .join('/');
  return `wss://stream.binance.com:9443/stream?streams=${streams}`;
}

type MinimalSocket = {
  onmessage: ((ev: { data: unknown }) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onclose: (() => void) | null;
  close: () => void;
};

/**
 * Node WebSocket client. Uses global WebSocket when available (Node 22+).
 */
export async function watchBinanceBookTickers(options: {
  symbols: string[];
  onTicker: BookTickerHandler;
  WebSocketImpl?: new (url: string) => MinimalSocket;
}): Promise<{ stop: () => void }> {
  const url = binanceBookTickerStreamUrl(options.symbols);
  const WS =
    options.WebSocketImpl ??
    (globalThis as unknown as { WebSocket?: new (url: string) => MinimalSocket })
      .WebSocket;
  if (!WS) {
    throw new Error(
      'WebSocket not available — use Node 22+ or pass WebSocketImpl'
    );
  }

  const socket = new WS(url);
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as {
        data?: Record<string, string>;
      };
      const raw = msg.data ?? (msg as unknown as Record<string, string>);
      const t = bookTickerFromBinancePayload(raw);
      if (t) options.onTicker(t);
    } catch {
      // ignore malformed
    }
  };
  socket.onerror = () => {
    // caller may restart
  };

  return {
    stop: () => {
      try {
        socket.close();
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Watch Binance bookTickers for the bot's cached hot-pair symbols.
 * No-op if the cache is empty or WebSocket is unavailable.
 */
export async function startCexWatchForBot(
  botId: string,
  options?: {
    onTicker?: BookTickerHandler;
    WebSocketImpl?: new (url: string) => MinimalSocket;
  }
): Promise<{ stop: () => void } | null> {
  const { readHotPairsCache } = await import('../scan/hotPairs.js');
  const { binanceSpotSymbol } = await import('./cexBook.js');
  const { upsertLiveTicker } = await import('./cexLive.js');

  const hot = readHotPairsCache(botId);
  const symbols = [
    ...new Set(
      (hot?.pairs ?? []).map((p) => binanceSpotSymbol(p.tokenASymbol))
    ),
  ];
  if (symbols.length === 0) return null;

  try {
    return await watchBinanceBookTickers({
      symbols,
      WebSocketImpl: options?.WebSocketImpl,
      onTicker: (t) => {
        upsertLiveTicker(t);
        options?.onTicker?.(t);
      },
    });
  } catch {
    return null;
  }
}
