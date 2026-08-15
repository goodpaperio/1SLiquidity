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

/** How leg2 is routed after a price-based leg1. */
export type ExitMode = 'both_price' | 'price_then_depth';

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
  /** Thin / best-price pool on leg 1 (forward: base→alt buy). */
  candidateDex: StreamDexId;
  /** Deepest base→alt buy book. */
  deepBuyDex: StreamDexId;
  /** Exit venue used for predictedBaseOut / leg2 sizing quotes. */
  referenceSellDex: StreamDexId;
  amountOutCandidate: bigint;
  /** Quoted base back from full alt on the chosen exit. */
  predictedBaseOut: bigint;
  /** Round-trip edge bps: (predictedBaseOut − amountIn) / amountIn. */
  roundTripBps: number;
  /** Expected profit in base wei if quotes hold (before gas). */
  predictedWinWei: bigint;
  /** Buy-only spread vs deepBuyDex (diagnostic dislocation). */
  buySpreadBps: number;
  /** reserveIn on alt→base for the exit / deep sell venue. */
  sellReserveIn: bigint;
  liquidityRatio: number;
  detectedAt: number;
  /**
   * Estimated sell impact on the price venue (probe vs full size), bps.
   * 0 when not computed (e.g. reverse stubs).
   */
  sellImpactBps: number;
  /** Chosen exit strategy for this opportunity. */
  exitMode: ExitMode;
  /** Core placeTrade usePriceBased for leg 2. */
  leg2UsePriceBased: boolean;
  /**
   * Net bps after Deca protocol fee (gross coupled already includes DEX fees
   * via quoter amounts). Primary PnL gate.
   */
  netBps: number;
  /** Published buy/sell pool fees (diagnostic; already in quote). */
  dexFeesInQuoteBps: number;
  decaFeeBps: number;
  /** |CEX mid − DEX implied USD| in bps when a CEX book exists. */
  cexDexGapBps?: number;
}

export interface PairScanContext {
  tradePair: TradePair;
  amountIn: bigint;
  quotes: DexQuote[];
}
