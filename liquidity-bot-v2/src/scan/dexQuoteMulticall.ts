import { Interface } from 'ethers';
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
import type { MulticallClient, Call3 } from '../chain/multicall3.js';
import type { DexQuote, StreamDexId } from './types.js';
import {
  STREAM_DEX_IDS,
  liquidityScoreFromReserves,
  v3DexId,
} from './dexQuoteUtils.js';

let v2FactoryIface: Interface | undefined;
let v2PairIface: Interface | undefined;
let v2RouterIface: Interface | undefined;
let v3FactoryIface: Interface | undefined;
let v3PoolIface: Interface | undefined;
let v3QuoterIface: Interface | undefined;

function v2FactoryIf(): Interface {
  return (v2FactoryIface ??= new Interface(UNISWAP_V2_FACTORY_ABI));
}
function v2PairIf(): Interface {
  return (v2PairIface ??= new Interface(UNISWAP_V2_PAIR_ABI));
}
function v2RouterIf(): Interface {
  return (v2RouterIface ??= new Interface(UNISWAP_V2_ROUTER_ABI));
}
function v3FactoryIf(): Interface {
  return (v3FactoryIface ??= new Interface(UNISWAP_V3_FACTORY_ABI));
}
function v3PoolIf(): Interface {
  return (v3PoolIface ??= new Interface(UNISWAP_V3_POOL_ABI));
}
function v3QuoterIf(): Interface {
  return (v3QuoterIface ??= new Interface(UNISWAP_V3_QUOTER_V2_ABI));
}

type V2Dex = 'uniswap-v2' | 'sushiswap';

interface V2PoolRef {
  dex: V2Dex;
  pairAddress: string;
}

interface V3PoolRef {
  fee: number;
  poolAddress: string;
}

function isZeroAddress(addr: string): boolean {
  return !addr || addr.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

function decodeAddress(
  client: MulticallClient,
  iface: Interface,
  fragment: string,
  result: { success: boolean; returnData: string }
): string | null {
  if (!result.success) return null;
  const decoded = client.decodeResult(iface, fragment, result.returnData) as
    | [string]
    | null;
  if (!decoded) return null;
  const addr = String(decoded[0]);
  return isZeroAddress(addr) ? null : addr;
}

function reserveInFromV2Reserves(
  tokenIn: string,
  token0: string,
  reserve0: bigint,
  reserve1: bigint
): bigint {
  const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
  return isToken0In ? reserve0 : reserve1;
}

function reserveInFromV3Liquidity(
  tokenIn: string,
  token0: string,
  liquidity: bigint,
  sqrtPriceX96: bigint
): bigint {
  if (liquidity === 0n || sqrtPriceX96 === 0n) return 0n;
  const res0 = (liquidity << 96n) / sqrtPriceX96;
  const res1 = (liquidity * sqrtPriceX96) >> 96n;
  const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
  return isToken0In ? res0 : res1;
}

async function resolvePoolAddresses(
  client: MulticallClient,
  tokenIn: string,
  tokenOut: string
): Promise<{ v2: V2PoolRef[]; v3: V3PoolRef[] }> {
  const roundA: Call3[] = [
    {
      target: UNISWAP_V2_FACTORY,
      allowFailure: true,
      callData: client.encodeCall(v2FactoryIf(), 'getPair', [tokenIn, tokenOut]),
    },
    {
      target: SUSHISWAP_FACTORY,
      allowFailure: true,
      callData: client.encodeCall(v2FactoryIf(), 'getPair', [tokenIn, tokenOut]),
    },
    ...V3_FEE_TIERS.map((fee) => ({
      target: UNISWAP_V3_FACTORY,
      allowFailure: true,
      callData: client.encodeCall(v3FactoryIf(), 'getPool', [
        tokenIn,
        tokenOut,
        fee,
      ]),
    })),
  ];

  const results = await client.aggregate3(roundA);
  const v2: V2PoolRef[] = [];
  const uniPair = decodeAddress(client, v2FactoryIf(), 'getPair', results[0]);
  if (uniPair) v2.push({ dex: 'uniswap-v2', pairAddress: uniPair });
  const sushiPair = decodeAddress(
    client,
    v2FactoryIf(),
    'getPair',
    results[1]
  );
  if (sushiPair) v2.push({ dex: 'sushiswap', pairAddress: sushiPair });

  const v3: V3PoolRef[] = [];
  V3_FEE_TIERS.forEach((fee, index) => {
    const pool = decodeAddress(
      client,
      v3FactoryIf(),
      'getPool',
      results[2 + index]
    );
    if (pool) v3.push({ fee, poolAddress: pool });
  });

  return { v2, v3 };
}

/** Batched sell-side reserveIn lookup across all stream DEXes. */
export async function getSellReserveInByDexMulticall(
  client: MulticallClient,
  tokenIn: string,
  tokenOut: string
): Promise<Map<StreamDexId, bigint>> {
  const map = new Map<StreamDexId, bigint>();
  const { v2, v3 } = await resolvePoolAddresses(client, tokenIn, tokenOut);

  const roundB: Call3[] = [];
  for (const pool of v2) {
    roundB.push(
      {
        target: pool.pairAddress,
        allowFailure: true,
        callData: client.encodeCall(v2PairIf(), 'getReserves', []),
      },
      {
        target: pool.pairAddress,
        allowFailure: true,
        callData: client.encodeCall(v2PairIf(), 'token0', []),
      }
    );
  }
  for (const pool of v3) {
    roundB.push(
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'liquidity', []),
      },
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'slot0', []),
      },
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'token0', []),
      }
    );
  }

  if (roundB.length === 0) return map;

  const roundBResults = await client.aggregate3(roundB);
  let offset = 0;

  for (const pool of v2) {
    const reservesResult = roundBResults[offset++];
    const token0Result = roundBResults[offset++];
    if (!reservesResult.success || !token0Result.success) continue;
    const reserves = client.decodeResult(
      v2PairIf(),
      'getReserves',
      reservesResult.returnData
    ) as [bigint, bigint, number] | null;
    const token0Decoded = client.decodeResult(
      v2PairIf(),
      'token0',
      token0Result.returnData
    ) as [string] | null;
    if (!reserves || !token0Decoded) continue;
    const reserveIn = reserveInFromV2Reserves(
      tokenIn,
      String(token0Decoded[0]),
      BigInt(reserves[0].toString()),
      BigInt(reserves[1].toString())
    );
    if (reserveIn > 0n) map.set(pool.dex, reserveIn);
  }

  for (const pool of v3) {
    const liqResult = roundBResults[offset++];
    const slot0Result = roundBResults[offset++];
    const token0Result = roundBResults[offset++];
    if (!liqResult.success || !slot0Result.success || !token0Result.success) {
      continue;
    }
    const liqDecoded = client.decodeResult(
      v3PoolIf(),
      'liquidity',
      liqResult.returnData
    ) as [bigint] | null;
    const slot0Decoded = client.decodeResult(
      v3PoolIf(),
      'slot0',
      slot0Result.returnData
    ) as [bigint, number, number, number, number, number, boolean] | null;
    const token0Decoded = client.decodeResult(
      v3PoolIf(),
      'token0',
      token0Result.returnData
    ) as [string] | null;
    if (!liqDecoded || !slot0Decoded || !token0Decoded) continue;
    const reserveIn = reserveInFromV3Liquidity(
      tokenIn,
      String(token0Decoded[0]),
      BigInt(liqDecoded[0].toString()),
      BigInt(slot0Decoded[0].toString())
    );
    if (reserveIn > 0n) map.set(v3DexId(pool.fee), reserveIn);
  }

  return map;
}

/** Batched DEX quotes for one token pair and amountIn. */
export async function quotePairMulticall(
  client: MulticallClient,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint
): Promise<DexQuote[]> {
  if (amountIn <= 0n) return [];

  const { v2, v3 } = await resolvePoolAddresses(client, tokenIn, tokenOut);
  if (v2.length === 0 && v3.length === 0) return [];

  const roundB: Call3[] = [];
  for (const pool of v2) {
    roundB.push(
      {
        target: pool.pairAddress,
        allowFailure: true,
        callData: client.encodeCall(v2PairIf(), 'getReserves', []),
      },
      {
        target: pool.pairAddress,
        allowFailure: true,
        callData: client.encodeCall(v2PairIf(), 'token0', []),
      }
    );
  }
  for (const pool of v3) {
    roundB.push(
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'liquidity', []),
      },
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'token0', []),
      }
    );
  }

  const roundBResults =
    roundB.length > 0 ? await client.aggregate3(roundB) : [];

  const v2State: Array<{
    ref: V2PoolRef;
    reserveIn: bigint;
    reserveOut: bigint;
  }> = [];
  let offset = 0;
  for (const pool of v2) {
    const reservesResult = roundBResults[offset++];
    const token0Result = roundBResults[offset++];
    if (!reservesResult.success || !token0Result.success) continue;
    const reserves = client.decodeResult(
      v2PairIf(),
      'getReserves',
      reservesResult.returnData
    ) as [bigint, bigint, number] | null;
    const token0Decoded = client.decodeResult(
      v2PairIf(),
      'token0',
      token0Result.returnData
    ) as [string] | null;
    if (!reserves || !token0Decoded) continue;
    const token0 = String(token0Decoded[0]);
    const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
    const reserveIn = BigInt(
      (isToken0In ? reserves[0] : reserves[1]).toString()
    );
    const reserveOut = BigInt(
      (isToken0In ? reserves[1] : reserves[0]).toString()
    );
    v2State.push({ ref: pool, reserveIn, reserveOut });
  }

  const v3State: Array<{ ref: V3PoolRef; liquidity: bigint }> = [];
  for (const pool of v3) {
    const liqResult = roundBResults[offset++];
    const token0Result = roundBResults[offset++];
    if (!liqResult.success || !token0Result.success) continue;
    const liqDecoded = client.decodeResult(
      v3PoolIf(),
      'liquidity',
      liqResult.returnData
    ) as [bigint] | null;
    if (!liqDecoded) continue;
    const liq = BigInt(liqDecoded[0].toString());
    if (liq === 0n) continue;
    v3State.push({ ref: pool, liquidity: liq });
  }

  const roundC: Call3[] = [];
  for (const state of v2State) {
    const router =
      state.ref.dex === 'uniswap-v2' ? UNISWAP_V2_ROUTER : SUSHISWAP_ROUTER;
    roundC.push({
      target: router,
      allowFailure: true,
      callData: client.encodeCall(v2RouterIf(), 'getAmountsOut', [
        amountIn,
        [tokenIn, tokenOut],
      ]),
    });
  }
  for (const state of v3State) {
    roundC.push({
      target: UNISWAP_V3_QUOTER_V2,
      allowFailure: true,
      callData: client.encodeCall(v3QuoterIf(), 'quoteExactInputSingle', [
        {
          tokenIn,
          tokenOut,
          amountIn,
          fee: state.ref.fee,
          sqrtPriceLimitX96: 0,
        },
      ]),
    });
  }

  if (roundC.length === 0) return [];

  const roundCResults = await client.aggregate3(roundC);
  const quotes: DexQuote[] = [];
  let quoteOffset = 0;

  for (const state of v2State) {
    const result = roundCResults[quoteOffset++];
    if (!result.success) continue;
    const amounts = client.decodeResult(
      v2RouterIf(),
      'getAmountsOut',
      result.returnData
    ) as [bigint[]] | null;
    if (!amounts || amounts[0].length < 2) continue;
    const amountOut = BigInt(amounts[0][1].toString());
    quotes.push({
      dex: state.ref.dex,
      amountOut,
      liquidityScore: liquidityScoreFromReserves(
        state.reserveIn,
        state.reserveOut
      ),
      pairOrPoolAddress: state.ref.pairAddress,
    });
  }

  for (const state of v3State) {
    const result = roundCResults[quoteOffset++];
    if (!result.success) continue;
    const quoted = client.decodeResult(
      v3QuoterIf(),
      'quoteExactInputSingle',
      result.returnData
    ) as [bigint, bigint, number, bigint] | null;
    if (!quoted) continue;
    const amountOut = BigInt(quoted[0].toString());
    quotes.push({
      dex: v3DexId(state.ref.fee),
      amountOut,
      liquidityScore: state.liquidity,
      pairOrPoolAddress: state.ref.poolAddress,
    });
  }

  return quotes.sort(
    (a, b) =>
      STREAM_DEX_IDS.indexOf(a.dex) - STREAM_DEX_IDS.indexOf(b.dex)
  );
}

/**
 * Quote many amountIns on a single DEX in one multicall (shared pool lookup).
 * Returns one result per input amount (null when that quote fails).
 */
export async function quoteManyOnDexMulticall(
  client: MulticallClient,
  dex: StreamDexId,
  tokenIn: string,
  tokenOut: string,
  amountsIn: readonly bigint[]
): Promise<(DexQuote | null)[]> {
  if (amountsIn.length === 0) return [];
  const positive = amountsIn.map((a) => (a > 0n ? a : 0n));
  if (positive.every((a) => a <= 0n)) {
    return amountsIn.map(() => null);
  }

  const { v2, v3 } = await resolvePoolAddresses(client, tokenIn, tokenOut);

  if (dex === 'uniswap-v2' || dex === 'sushiswap') {
    const pool = v2.find((p) => p.dex === dex);
    if (!pool) return amountsIn.map(() => null);

    const roundB = await client.aggregate3([
      {
        target: pool.pairAddress,
        allowFailure: true,
        callData: client.encodeCall(v2PairIf(), 'getReserves', []),
      },
      {
        target: pool.pairAddress,
        allowFailure: true,
        callData: client.encodeCall(v2PairIf(), 'token0', []),
      },
    ]);
    if (!roundB[0]?.success || !roundB[1]?.success) {
      return amountsIn.map(() => null);
    }
    const reserves = client.decodeResult(
      v2PairIf(),
      'getReserves',
      roundB[0].returnData
    ) as [bigint, bigint, number] | null;
    const token0Decoded = client.decodeResult(
      v2PairIf(),
      'token0',
      roundB[1].returnData
    ) as [string] | null;
    if (!reserves || !token0Decoded) return amountsIn.map(() => null);

    const token0 = String(token0Decoded[0]);
    const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
    const reserveIn = BigInt(
      (isToken0In ? reserves[0] : reserves[1]).toString()
    );
    const reserveOut = BigInt(
      (isToken0In ? reserves[1] : reserves[0]).toString()
    );
    const liquidityScore = liquidityScoreFromReserves(reserveIn, reserveOut);
    const router =
      dex === 'uniswap-v2' ? UNISWAP_V2_ROUTER : SUSHISWAP_ROUTER;

    const roundC: Call3[] = positive.map((amountIn) => ({
      target: router,
      allowFailure: true,
      callData: client.encodeCall(v2RouterIf(), 'getAmountsOut', [
        amountIn > 0n ? amountIn : 1n,
        [tokenIn, tokenOut],
      ]),
    }));
    const roundCResults = await client.aggregate3(roundC);

    return positive.map((amountIn, i) => {
      if (amountIn <= 0n) return null;
      const result = roundCResults[i];
      if (!result?.success) return null;
      const amounts = client.decodeResult(
        v2RouterIf(),
        'getAmountsOut',
        result.returnData
      ) as [bigint[]] | null;
      if (!amounts || amounts[0].length < 2) return null;
      return {
        dex,
        amountOut: BigInt(amounts[0][1].toString()),
        liquidityScore,
        pairOrPoolAddress: pool.pairAddress,
      } satisfies DexQuote;
    });
  }

  if (dex.startsWith('uniswap-v3-')) {
    const fee = Number(dex.replace('uniswap-v3-', ''));
    const pool = v3.find((p) => p.fee === fee);
    if (!pool) return amountsIn.map(() => null);

    const roundB = await client.aggregate3([
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'liquidity', []),
      },
      {
        target: pool.poolAddress,
        allowFailure: true,
        callData: client.encodeCall(v3PoolIf(), 'token0', []),
      },
    ]);
    if (!roundB[0]?.success || !roundB[1]?.success) {
      return amountsIn.map(() => null);
    }
    const liqDecoded = client.decodeResult(
      v3PoolIf(),
      'liquidity',
      roundB[0].returnData
    ) as [bigint] | null;
    if (!liqDecoded) return amountsIn.map(() => null);
    const liquidity = BigInt(liqDecoded[0].toString());
    if (liquidity === 0n) return amountsIn.map(() => null);

    const roundC: Call3[] = positive.map((amountIn) => ({
      target: UNISWAP_V3_QUOTER_V2,
      allowFailure: true,
      callData: client.encodeCall(v3QuoterIf(), 'quoteExactInputSingle', [
        {
          tokenIn,
          tokenOut,
          amountIn: amountIn > 0n ? amountIn : 1n,
          fee,
          sqrtPriceLimitX96: 0,
        },
      ]),
    }));
    const roundCResults = await client.aggregate3(roundC);

    return positive.map((amountIn, i) => {
      if (amountIn <= 0n) return null;
      const result = roundCResults[i];
      if (!result?.success) return null;
      const quoted = client.decodeResult(
        v3QuoterIf(),
        'quoteExactInputSingle',
        result.returnData
      ) as [bigint, bigint, number, bigint] | null;
      if (!quoted) return null;
      return {
        dex: v3DexId(fee),
        amountOut: BigInt(quoted[0].toString()),
        liquidityScore: liquidity,
        pairOrPoolAddress: pool.poolAddress,
      } satisfies DexQuote;
    });
  }

  return amountsIn.map(() => null);
}
