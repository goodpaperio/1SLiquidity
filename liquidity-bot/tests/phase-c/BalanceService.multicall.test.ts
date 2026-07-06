import { Interface } from 'ethers';
import { describe, expect, it, vi } from 'vitest';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../../src/config/baseTokens.js';
import { ERC20_ABI } from '../../src/chain/contracts.js';
import { MULTICALL3_ABI } from '../../src/chain/multicall3.js';
import { BalanceService } from '../../src/scan/BalanceService.js';

const erc20Iface = new Interface(ERC20_ABI);
const multicallIface = new Interface(MULTICALL3_ABI);

function mockMulticallBalances(
  holder: string,
  balances: Partial<Record<BaseTokenSymbol, bigint>>
) {
  const aggregate3 = vi.fn(
    async (calls: Array<[string, boolean, string]>) =>
      calls.map(([target]) => {
        const sym = (
          Object.entries(BASE_TOKEN_ADDRESSES) as [BaseTokenSymbol, string][]
        ).find(([, addr]) => addr.toLowerCase() === target.toLowerCase())?.[0];
        const balance = sym ? (balances[sym] ?? 0n) : 0n;
        return {
          success: true,
          returnData: erc20Iface.encodeFunctionResult('balanceOf', [balance]),
        };
      })
  );

  const provider = {
    call: vi.fn(async (tx: { to?: string; data: string }) => {
      const decoded = multicallIface.decodeFunctionData(
        'aggregate3',
        tx.data
      ) as [Array<[string, boolean, string]>];
      const results = await aggregate3(decoded[0]);
      return multicallIface.encodeFunctionResult('aggregate3', [results]);
    }),
  };

  return { provider, aggregate3, holder };
}

describe('phase C — BalanceService multicall', () => {
  it('getBaseBalances uses one aggregate3 for all base tokens', async () => {
    const holder = '0x1111111111111111111111111111111111111111';
    const { provider, aggregate3 } = mockMulticallBalances(holder, {
      WETH: 5_000_000_000_000_000n,
      USDC: 2_000_000n,
      USDT: 0n,
      DAI: 0n,
      WBTC: 0n,
    });

    const service = new BalanceService(provider as never);
    const balances = await service.getBaseBalances(holder, [
      'WETH',
      'USDC',
      'USDT',
      'DAI',
      'WBTC',
    ]);

    expect(balances.WETH).toBe(5_000_000_000_000_000n);
    expect(balances.USDC).toBe(2_000_000n);
    expect(balances.USDT).toBe(0n);
    expect(provider.call).toHaveBeenCalledTimes(1);
    expect(aggregate3).toHaveBeenCalledTimes(1);
    expect(aggregate3.mock.calls[0][0]).toHaveLength(5);
  });

  it('getTokenBalance uses aggregate3 for a single token', async () => {
    const holder = '0x2222222222222222222222222222222222222222';
    const { provider } = mockMulticallBalances(holder, {
      USDC: 99n,
    });

    const service = new BalanceService(provider as never);
    const balance = await service.getTokenBalance(
      holder,
      BASE_TOKEN_ADDRESSES.USDC
    );
    expect(balance).toBe(99n);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it('falls back to sequential reads when multicall fails', async () => {
    const holder = '0x3333333333333333333333333333333333333333';
    const iface = new Interface(ERC20_ABI);
    const failingMulticall = {
      aggregate3: vi.fn(async () => {
        throw new Error('rate limited');
      }),
      encodeCall: (
        abiIface: Interface,
        fragment: string,
        args: readonly unknown[]
      ) => abiIface.encodeFunctionData(fragment, args),
      decodeResult: () => null,
      chunkSize: 50,
    };

    const provider = {
      call: vi.fn(async (tx: { data: string }) => {
        if (tx.data.startsWith('0x70a08231')) {
          return iface.encodeFunctionResult('balanceOf', [7n]);
        }
        throw new Error('unexpected call');
      }),
    };

    const service = new BalanceService(provider as never, {
      multicall: failingMulticall as never,
      useMulticall: true,
    });

    const balance = await service.getBaseBalances(holder, ['WETH']);
    expect(balance.WETH).toBe(7n);
    expect(failingMulticall.aggregate3).toHaveBeenCalledTimes(1);
    expect(provider.call).toHaveBeenCalled();
  });
});
