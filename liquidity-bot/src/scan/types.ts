import type { BaseTokenSymbol } from '../config/baseTokens.js';
import type { TradePair } from '../config/loadPairs.js';

/** StreamDaemon-aligned DEX identifiers. */
export type StreamDexId =
  | 'uniswap-v2'
  | 'uniswap-v3-100'
  | 'uniswap-v3-500'
  | 'uniswap-v3-3000'
  | 'uniswap-v3-10000'
  | 'sushiswap';

export interface DexQuote {
  dex: StreamDexId;
  amountOut: bigint;
  /** Higher = deeper book (sqrt-like product of side reserves / liquidity). */
  liquidityScore: bigint;
  pairOrPoolAddress?: string;
}

export interface ScanOpportunity {
  pairKey: string;
  baseSymbol: BaseTokenSymbol;
  targetName: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  candidateDex: StreamDexId;
  referenceDex: StreamDexId;
  amountOutCandidate: bigint;
  amountOutReference: bigint;
  spreadBps: number;
  liquidityRatio: number;
  detectedAt: number;
}

export interface PairScanContext {
  tradePair: TradePair;
  amountIn: bigint;
  quotes: DexQuote[];
}
