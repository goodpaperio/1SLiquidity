import { getAddress, Interface } from 'ethers';
import { describe, expect, it, vi } from 'vitest';
import {
  UNISWAP_V2_PAIR_ABI,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V2_FACTORY_ABI,
  UNISWAP_V3_FACTORY_ABI,
  V3_FEE_TIERS,
  ZERO_ADDRESS,
} from '../../src/chain/contracts.js';
import { MulticallClient } from '../../src/chain/multicall3.js';
import { quotePairMulticall } from '../../src/scan/dexQuoteMulticall.js';
import { DexQuoteService } from '../../src/scan/DexQuoteService.js';

const v2FactoryIface = new Interface(UNISWAP_V2_FACTORY_ABI);
const v2PairIface = new Interface(UNISWAP_V2_PAIR_ABI);
const v2RouterIface = new Interface(UNISWAP_V2_ROUTER_ABI);
const v3FactoryIface = new Interface(UNISWAP_V3_FACTORY_ABI);

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const PAIR = getAddress('0xb4e16d0168e52d35caac2b6185b44281ec28c9dc');

function emptyV3Pools(): Array<{ success: boolean; returnData: string }> {
  return V3_FEE_TIERS.map(() => ({
    success: true,
    returnData: v3FactoryIface.encodeFunctionResult('getPool', [ZERO_ADDRESS]),
  }));
}

describe('phase C — DexQuoteService multicall', () => {
  it('quotePairMulticall returns V2 quote from three aggregate rounds', async () => {
    const tokenIn = WETH;
    const tokenOut = USDC;
    const amountIn = 1_000_000_000_000_000_000n;
    const reserve0 = 1_000_000_000_000_000_000_000n;
    const reserve1 = 2_000_000_000_000n;
    const amountOut = 1_800_000_000n;

    let round = 0;
    const aggregate3 = vi.fn(async () => {
      round += 1;
      if (round === 1) {
        return [
          {
            success: true,
            returnData: v2FactoryIface.encodeFunctionResult('getPair', [PAIR]),
          },
          {
            success: true,
            returnData: v2FactoryIface.encodeFunctionResult('getPair', [
              ZERO_ADDRESS,
            ]),
          },
          ...emptyV3Pools(),
        ];
      }
      if (round === 2) {
        return [
          {
            success: true,
            returnData: v2PairIface.encodeFunctionResult('getReserves', [
              reserve0,
              reserve1,
              1,
            ]),
          },
          {
            success: true,
            returnData: v2PairIface.encodeFunctionResult('token0', [WETH]),
          },
        ];
      }
      return [
        {
          success: true,
          returnData: v2RouterIface.encodeFunctionResult('getAmountsOut', [
            [amountIn, amountOut],
          ]),
        },
      ];
    });

    const client = {
      aggregate3,
      encodeCall: new MulticallClient({} as never).encodeCall.bind(
        new MulticallClient({} as never)
      ),
      decodeResult: new MulticallClient({} as never).decodeResult.bind(
        new MulticallClient({} as never)
      ),
      chunkSize: 50,
    } as unknown as MulticallClient;

    const quotes = await quotePairMulticall(
      client,
      tokenIn,
      tokenOut,
      amountIn
    );

    expect(aggregate3).toHaveBeenCalledTimes(3);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].dex).toBe('uniswap-v2');
    expect(quotes[0].amountOut).toBe(amountOut);
    expect(quotes[0].pairOrPoolAddress).toBe(PAIR);
    expect(quotes[0].liquidityScore).toBeGreaterThan(0n);
  });

  it('DexQuoteService.quotePair delegates to multicall path', async () => {
    const tokenIn = WETH;
    const tokenOut = USDC;
    const amountIn = 1_000_000n;
    const amountOut = 2_000_000n;

    let round = 0;
    const aggregate3 = vi.fn(async () => {
      round += 1;
      if (round === 1) {
        return [
          {
            success: true,
            returnData: v2FactoryIface.encodeFunctionResult('getPair', [PAIR]),
          },
          {
            success: true,
            returnData: v2FactoryIface.encodeFunctionResult('getPair', [
              ZERO_ADDRESS,
            ]),
          },
          ...emptyV3Pools(),
        ];
      }
      if (round === 2) {
        return [
          {
            success: true,
            returnData: v2PairIface.encodeFunctionResult('getReserves', [
              1n,
              2n,
              1,
            ]),
          },
          {
            success: true,
            returnData: v2PairIface.encodeFunctionResult('token0', [WETH]),
          },
        ];
      }
      return [
        {
          success: true,
          returnData: v2RouterIface.encodeFunctionResult('getAmountsOut', [
            [amountIn, amountOut],
          ]),
        },
      ];
    });

    const multicall = {
      aggregate3,
      encodeCall: new MulticallClient({} as never).encodeCall.bind(
        new MulticallClient({} as never)
      ),
      decodeResult: new MulticallClient({} as never).decodeResult.bind(
        new MulticallClient({} as never)
      ),
      chunkSize: 50,
    } as unknown as MulticallClient;

    const service = new DexQuoteService({} as never, {
      multicall,
      useMulticall: true,
    });

    const quotes = await service.quotePair(tokenIn, tokenOut, amountIn);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].amountOut).toBe(amountOut);
    expect(aggregate3).toHaveBeenCalledTimes(3);
  });

  it('quotePairMulticall tolerates V3 quoter failures', async () => {
    const v3Pool = '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640';
    const fee = 500;
    const v3PoolIface = new Interface([
      'function liquidity() view returns (uint128)',
      'function token0() view returns (address)',
    ]);

    let round = 0;
    const aggregate3 = vi.fn(async () => {
      round += 1;
      if (round === 1) {
        return [
          {
            success: true,
            returnData: v2FactoryIface.encodeFunctionResult('getPair', [
              ZERO_ADDRESS,
            ]),
          },
          {
            success: true,
            returnData: v2FactoryIface.encodeFunctionResult('getPair', [
              ZERO_ADDRESS,
            ]),
          },
          ...V3_FEE_TIERS.map((tier) => ({
            success: true,
            returnData: v3FactoryIface.encodeFunctionResult('getPool', [
              tier === fee ? v3Pool : ZERO_ADDRESS,
            ]),
          })),
        ];
      }
      if (round === 2) {
        return [
          {
            success: true,
            returnData: v3PoolIface.encodeFunctionResult('liquidity', [
              1_000_000n,
            ]),
          },
          {
            success: true,
            returnData: v3PoolIface.encodeFunctionResult('token0', [USDC]),
          },
        ];
      }
      return [{ success: false, returnData: '0x' }];
    });

    const client = {
      aggregate3,
      encodeCall: new MulticallClient({} as never).encodeCall.bind(
        new MulticallClient({} as never)
      ),
      decodeResult: new MulticallClient({} as never).decodeResult.bind(
        new MulticallClient({} as never)
      ),
      chunkSize: 50,
    } as unknown as MulticallClient;

    const quotes = await quotePairMulticall(
      client,
      USDC,
      WETH,
      1_000_000n
    );
    expect(quotes).toHaveLength(0);
    expect(aggregate3).toHaveBeenCalledTimes(3);
  });
});
