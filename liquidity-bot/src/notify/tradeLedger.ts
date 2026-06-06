import fs from 'node:fs';
import { getBotTradeLedgerPath, getBotsDir } from '../config/paths.js';

export type LedgerStatus =
  | 'open'
  | 'completed'
  | 'leg2_failed'
  | 'cancelled';

export interface TradeLedgerEntry {
  tradeId?: number;
  direction: 'forward' | 'reverse';
  pair: string;
  leg1TokenIn: string;
  leg1AmountIn: string;
  leg2TokenIn: string;
  leg2AmountIn: string;
  leg2MinOut: string;
  settlementToken: string;
  leg1TxHash: string;
  leg2TxHash?: string;
  placedAt: string;
  status: LedgerStatus;
  finalSettlementOut?: string;
  pnlAmount?: string;
  completedAt?: string;
  error?: string;
}

export class TradeLedger {
  private readonly filePath: string;

  constructor(botId: string, filePath?: string) {
    this.filePath = filePath ?? getBotTradeLedgerPath(botId);
  }

  append(entry: TradeLedgerEntry): void {
    fs.mkdirSync(getBotsDir(), { recursive: true });
    fs.appendFileSync(this.filePath, JSON.stringify(entry) + '\n', 'utf8');
  }

  readAll(): TradeLedgerEntry[] {
    if (!fs.existsSync(this.filePath)) return [];
    const lines = fs.readFileSync(this.filePath, 'utf8').split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line) as TradeLedgerEntry);
  }

  /** Replace one open row (matched by tradeId or leg1TxHash) with an updated row. */
  updateOpen(
    match: { tradeId?: number; leg1TxHash?: string },
    patch: Partial<TradeLedgerEntry>
  ): boolean {
    const rows = this.readAll();
    const idx = rows.findIndex((r) => {
      if (r.status !== 'open') return false;
      if (match.tradeId != null && r.tradeId === match.tradeId) return true;
      if (match.leg1TxHash && r.leg1TxHash === match.leg1TxHash) return true;
      return false;
    });
    if (idx === -1) return false;
    rows[idx] = { ...rows[idx], ...patch };
    fs.writeFileSync(
      this.filePath,
      rows.map((r) => JSON.stringify(r)).join('\n') + (rows.length ? '\n' : ''),
      'utf8'
    );
    return true;
  }

  openTrades(): TradeLedgerEntry[] {
    return this.readAll().filter((r) => r.status === 'open' && r.tradeId != null);
  }

  entriesSince(sinceMs: number): TradeLedgerEntry[] {
    return this.readAll().filter(
      (r) => new Date(r.placedAt).getTime() >= sinceMs
    );
  }
}
