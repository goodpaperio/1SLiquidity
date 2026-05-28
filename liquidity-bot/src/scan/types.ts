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

export type TradeDirection = 'forward' | 'reverse';

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
  direction: TradeDirection;
  amountIn: bigint;
  /** Thin pool on leg 1 (forward: base→alt buy; reverse: alt→base sell). */
  candidateDex: StreamDexId;
  /** Deepest base→alt buy book. */
  deepBuyDex: StreamDexId;
  /** Deepest alt→base reserveIn (forward leg-2 / reverse leg-1 ref). */
  referenceSellDex: StreamDexId;
  amountOutCandidate: bigint;
  /** Quoted base back from full alt on referenceSellDex. */
  predictedBaseOut: bigint;
  /** Round-trip edge bps: (predictedBaseOut − amountIn) / amountIn. */
  roundTripBps: number;
  /** Expected profit in base wei if quotes hold (before gas). */
  predictedWinWei: bigint;
  /** Buy-only spread vs deepBuyDex (diagnostic). */
  buySpreadBps: number;
  /** reserveIn on alt→base for referenceSellDex. */
  sellReserveIn: bigint;
  liquidityRatio: number;
  detectedAt: number;
}

export interface PairScanContext {
  tradePair: TradePair;
  amountIn: bigint;
  quotes: DexQuote[];
}
