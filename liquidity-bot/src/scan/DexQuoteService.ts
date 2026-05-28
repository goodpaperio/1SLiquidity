import { Contract, type Provider } from 'ethers';
import {
  SUSHISWAP_FACTORY,
  SUSHISWAP_ROUTER,
  UNISWAP_V2_FACTORY,
  UNISWAP_V2_PAIR_ABI,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V3_FACTORY,
  UNISWAP_V3_FACTORY_ABI,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_QUOTER_V2,
  UNISWAP_V3_QUOTER_V2_ABI,
  V3_FEE_TIERS,
  ZERO_ADDRESS,
} from '../chain/contracts.js';
import type { StreamDexId, DexQuote } from './types.js';

const SUSHISWAP_FACTORY_ABI = UNISWAP_V2_FACTORY_ABI;
const SUSHISWAP_PAIR_ABI = UNISWAP_V2_PAIR_ABI;
const SUSHISWAP_ROUTER_ABI = UNISWAP_V2_ROUTER_ABI;

export const STREAM_DEX_IDS: StreamDexId[] = [
  'uniswap-v2',
  'uniswap-v3-100',
  'uniswap-v3-500',
  'uniswap-v3-3000',
  'uniswap-v3-10000',
  'sushiswap',
];

function liquidityScoreFromReserves(
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (reserveIn <= 0n || reserveOut <= 0n) return 0n;
  return sqrtBigInt(reserveIn * reserveOut);
}

function sqrtBigInt(value: bigint): bigint {
  if (value <= 0n) return 0n;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

function v3DexId(fee: number): StreamDexId {
  return `uniswap-v3-${fee}` as StreamDexId;
}

export class DexQuoteService {
  private readonly uniV2Factory: Contract;
  private readonly uniV2Router: Contract;
  private readonly uniV3Factory: Contract;
  private readonly uniV3Quoter: Contract;
  private readonly sushiFactory: Contract;
  private readonly sushiRouter: Contract;

  constructor(private readonly provider: Provider) {
    this.uniV2Factory = new Contract(
      UNISWAP_V2_FACTORY,
      UNISWAP_V2_FACTORY_ABI,
      provider
    );
    this.uniV2Router = new Contract(
      UNISWAP_V2_ROUTER,
      UNISWAP_V2_ROUTER_ABI,
      provider
    );
    this.uniV3Factory = new Contract(
      UNISWAP_V3_FACTORY,
      UNISWAP_V3_FACTORY_ABI,
      provider
    );
    this.uniV3Quoter = new Contract(
      UNISWAP_V3_QUOTER_V2,
      UNISWAP_V3_QUOTER_V2_ABI,
      provider
    );
    this.sushiFactory = new Contract(
      SUSHISWAP_FACTORY,
      SUSHISWAP_FACTORY_ABI,
      provider
    );
    this.sushiRouter = new Contract(
      SUSHISWAP_ROUTER,
      SUSHISWAP_ROUTER_ABI,
      provider
    );
  }

  /**
   * reserveIn for tokenIn on each DEX (alt→base for leg-2 depth).
   * Matches StreamDaemon scoring when usePriceBased=false.
   */
  async getSellReserveInByDex(
    tokenIn: string,
    tokenOut: string
  ): Promise<Map<StreamDexId, bigint>> {
    const map = new Map<StreamDexId, bigint>();
    for (const dex of STREAM_DEX_IDS) {
      const r = await this.getReserveIn(dex, tokenIn, tokenOut);
      if (r > 0n) map.set(dex, r);
    }
    return map;
  }

  async getReserveIn(
    dex: StreamDexId,
    tokenIn: string,
    tokenOut: string
  ): Promise<bigint> {
    try {
      if (dex === 'uniswap-v2') {
        return this.reserveInV2Like(
          this.uniV2Factory,
          tokenIn,
          tokenOut
        );
      }
      if (dex === 'sushiswap') {
        return this.reserveInV2Like(
          this.sushiFactory,
          tokenIn,
          tokenOut
        );
      }
      if (dex.startsWith('uniswap-v3-')) {
        const fee = Number(dex.replace('uniswap-v3-', ''));
        return this.reserveInV3(tokenIn, tokenOut, fee);
      }
      return 0n;
    } catch {
      return 0n;
    }
  }

  private async reserveInV2Like(
    factory: Contract,
    tokenIn: string,
    tokenOut: string
  ): Promise<bigint> {
    const pairAddress = await factory.getPair(tokenIn, tokenOut);
    if (!pairAddress || pairAddress === ZERO_ADDRESS) return 0n;

    const pair = new Contract(pairAddress, UNISWAP_V2_PAIR_ABI, this.provider);
    const [reserves, token0] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
    ]);
    const isToken0In = tokenIn.toLowerCase() === String(token0).toLowerCase();
    return BigInt(
      (isToken0In ? reserves[0] : reserves[1]).toString()
    );
  }

  private async reserveInV3(
    tokenIn: string,
    tokenOut: string,
    fee: number
  ): Promise<bigint> {
    const poolAddress = await this.uniV3Factory.getPool(tokenIn, tokenOut, fee);
    if (!poolAddress || poolAddress === ZERO_ADDRESS) return 0n;

    const pool = new Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
    const [liquidity, slot0, token0] = await Promise.all([
      pool.liquidity(),
      pool.slot0(),
      pool.token0(),
    ]);
    const liq = BigInt(liquidity.toString());
    const sqrtP = BigInt(slot0.sqrtPriceX96.toString());
    if (liq === 0n || sqrtP === 0n) return 0n;

    const res0 = (liq << 96n) / sqrtP;
    const res1 = (liq * sqrtP) >> 96n;
    const isToken0In = tokenIn.toLowerCase() === String(token0).toLowerCase();
    return isToken0In ? res0 : res1;
  }

  async quotePair(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<DexQuote[]> {
    const quotes: DexQuote[] = [];
    for (const dex of STREAM_DEX_IDS) {
      const q = await this.quoteDex(dex, tokenIn, tokenOut, amountIn);
      if (q) quotes.push(q);
    }
    return quotes;
  }

  async quoteDex(
    dex: StreamDexId,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<DexQuote | null> {
    if (amountIn <= 0n) return null;
    try {
      if (dex === 'uniswap-v2') {
        return await this.quoteV2Like(
          'uniswap-v2',
          this.uniV2Factory,
          this.uniV2Router,
          tokenIn,
          tokenOut,
          amountIn
        );
      }
      if (dex === 'sushiswap') {
        return await this.quoteV2Like(
          'sushiswap',
          this.sushiFactory,
          this.sushiRouter,
          tokenIn,
          tokenOut,
          amountIn
        );
      }
      if (dex.startsWith('uniswap-v3-')) {
        const fee = Number(dex.replace('uniswap-v3-', ''));
        return await this.quoteV3(tokenIn, tokenOut, amountIn, fee);
      }
      return null;
    } catch {
      return null;
    }
  }

  private async quoteV2Like(
    dex: 'uniswap-v2' | 'sushiswap',
    factory: Contract,
    router: Contract,
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint
  ): Promise<DexQuote | null> {
    const pairAddress = await factory.getPair(tokenIn, tokenOut);
    if (!pairAddress || pairAddress === ZERO_ADDRESS) return null;

    const pair = new Contract(
      pairAddress,
      dex === 'sushiswap' ? SUSHISWAP_PAIR_ABI : UNISWAP_V2_PAIR_ABI,
      this.provider
    );
    const [reserves, token0] = await Promise.all([
      pair.getReserves(),
      pair.token0(),
    ]);
    const isToken0In = tokenIn.toLowerCase() === String(token0).toLowerCase();
    const reserveIn = isToken0In ? reserves[0] : reserves[1];
    const reserveOut = isToken0In ? reserves[1] : reserves[0];

    const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
    const amountOut = BigInt(amounts[1].toString());

    return {
      dex,
      amountOut,
      liquidityScore: liquidityScoreFromReserves(
        BigInt(reserveIn.toString()),
        BigInt(reserveOut.toString())
      ),
      pairOrPoolAddress: pairAddress,
    };
  }

  private async quoteV3(
    tokenIn: string,
    tokenOut: string,
    amountIn: bigint,
    fee: number
  ): Promise<DexQuote | null> {
    const poolAddress = await this.uniV3Factory.getPool(tokenIn, tokenOut, fee);
    if (!poolAddress || poolAddress === ZERO_ADDRESS) return null;

    const pool = new Contract(poolAddress, UNISWAP_V3_POOL_ABI, this.provider);
    const [liquidity, token0] = await Promise.all([
      pool.liquidity(),
      pool.token0(),
    ]);
    const liq = BigInt(liquidity.toString());
    if (liq === 0n) return null;

    const result = await this.uniV3Quoter.quoteExactInputSingle.staticCall({
      tokenIn,
      tokenOut,
      amountIn,
      fee,
      sqrtPriceLimitX96: 0,
    });
    const amountOut = BigInt(result[0].toString());

    const isToken0In = tokenIn.toLowerCase() === String(token0).toLowerCase();
    const liquidityScore = isToken0In ? liq : liq;

    return {
      dex: v3DexId(fee),
      amountOut,
      liquidityScore,
      pairOrPoolAddress: poolAddress,
    };
  }
}

export function feeTierFromDexId(dex: StreamDexId): number | null {
  if (!dex.startsWith('uniswap-v3-')) return null;
  return Number(dex.replace('uniswap-v3-', ''));
}

export function isV3FeeTier(fee: number): boolean {
  return (V3_FEE_TIERS as readonly number[]).includes(fee);
}
