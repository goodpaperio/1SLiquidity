import { AbiCoder, Interface, keccak256, toUtf8Bytes } from 'ethers';
import { describe, expect, it, vi } from 'vitest';
import {
  MULTICALL3_ABI,
  MulticallClient,
  type Call3,
} from '../../src/chain/multicall3.js';
import { ERC20_ABI } from '../../src/chain/contracts.js';

const erc20Iface = new Interface(ERC20_ABI);
const multicallIface = new Interface(MULTICALL3_ABI);
const coder = AbiCoder.defaultAbiCoder();

function encodeAggregate3Return(
  results: Array<{ success: boolean; returnData: string }>
): string {
  return multicallIface.encodeFunctionResult('aggregate3', [results]);
}

describe('phase A — Multicall3 client', () => {
  it('encodeCall matches ethers Interface', () => {
    const holder = '0x1111111111111111111111111111111111111111';
    const client = new MulticallClient({} as never);
    const encoded = client.encodeCall(erc20Iface, 'balanceOf', [holder]);
    expect(encoded).toBe(erc20Iface.encodeFunctionData('balanceOf', [holder]));
  });

  it('decodeResult round-trips balanceOf', () => {
    const client = new MulticallClient({} as never);
    const returnData = erc20Iface.encodeFunctionResult('balanceOf', [42_000n]);
    const decoded = client.decodeResult(
      erc20Iface,
      'balanceOf',
      returnData
    ) as [bigint];
    expect(decoded[0]).toBe(42_000n);
  });

  it('decodeResult returns null for empty return data', () => {
    const client = new MulticallClient({} as never);
    expect(client.decodeResult(erc20Iface, 'balanceOf', '0x')).toBeNull();
  });

  it('aggregate3 decodes success results from provider', async () => {
    const balance = 1_000_000n;
    const returnData = erc20Iface.encodeFunctionResult('balanceOf', [balance]);
    const provider = {
      call: vi.fn(async () =>
        encodeAggregate3Return([{ success: true, returnData }])
      ),
    };

    const client = new MulticallClient(provider as never);
    const holder = '0x2222222222222222222222222222222222222222';
    const token = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const calls: Call3[] = [
      {
        target: token,
        allowFailure: true,
        callData: client.encodeCall(erc20Iface, 'balanceOf', [holder]),
      },
    ];

    const results = await client.aggregate3(calls);
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    const decoded = client.decodeResult(
      erc20Iface,
      'balanceOf',
      results[0].returnData
    ) as [bigint];
    expect(decoded[0]).toBe(balance);
    expect(provider.call).toHaveBeenCalledTimes(1);
  });

  it('aggregate3 preserves allowFailure results', async () => {
    const provider = {
      call: vi.fn(async () =>
        encodeAggregate3Return([{ success: false, returnData: '0x' }])
      ),
    };
    const client = new MulticallClient(provider as never);
    const results = await client.aggregate3([
      {
        target: '0x0000000000000000000000000000000000000001',
        allowFailure: true,
        callData: keccak256(toUtf8Bytes('fail')).slice(0, 10),
      },
    ]);
    expect(results[0].success).toBe(false);
  });

  it('aggregate3Chunked splits large batches', async () => {
    const provider = {
      call: vi.fn(async (tx: { data: string }) => {
        const decoded = multicallIface.decodeFunctionData(
          'aggregate3',
          tx.data
        ) as [Array<[string, boolean, string]>];
        const chunkLen = decoded[0].length;
        const results = Array.from({ length: chunkLen }, () => ({
          success: true,
          returnData: erc20Iface.encodeFunctionResult('balanceOf', [1n]),
        }));
        return encodeAggregate3Return(results);
      }),
    };

    const client = new MulticallClient(provider as never, { chunkSize: 50 });
    const holder = '0x3333333333333333333333333333333333333333';
    const token = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const calls: Call3[] = Array.from({ length: 120 }, () => ({
      target: token,
      allowFailure: true,
      callData: client.encodeCall(erc20Iface, 'balanceOf', [holder]),
    }));

    const results = await client.aggregate3Chunked(calls);
    expect(results).toHaveLength(120);
    expect(provider.call).toHaveBeenCalledTimes(3);
  });

  it('aggregate3 returns empty array for no calls', async () => {
    const provider = { call: vi.fn() };
    const client = new MulticallClient(provider as never);
    await expect(client.aggregate3([])).resolves.toEqual([]);
    expect(provider.call).not.toHaveBeenCalled();
  });
});
