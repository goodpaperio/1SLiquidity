import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computeGasRefuel } from '../../src/execution/gasRefuel.js';

const mockProviderGetBalance = vi.fn();
const mockSignerGetAddress = vi.fn();
const mockBalanceOf = vi.fn();
const mockWithdraw = vi.fn();
const mockWithdrawWait = vi.fn();
const mockQuoteExactInputSingle = vi.fn();
const mockSwapExactOnCandidateDex = vi.fn();

vi.mock('../../src/execution/directSwap.js', () => ({
  swapExactOnCandidateDex: (...args: unknown[]) => mockSwapExactOnCandidateDex(...args),
}));

vi.mock('../../src/chain/wallet.js', () => ({
  isDryRun: () => false,
}));

vi.mock('ethers', () => ({
  NonceManager: class {
    constructor(readonly signer: unknown) {
      return signer;
    }
  },
  Contract: vi.fn().mockImplementation((address: string) => {
    const lower = address.toLowerCase();
    if (lower === '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') {
      return {
        balanceOf: mockBalanceOf,
        withdraw: mockWithdraw,
      };
    }
    if (lower === '0x61ffe014ba17989e743c5f6cb21bf9697530b21e') {
      return {
        quoteExactInputSingle: {
          staticCall: mockQuoteExactInputSingle,
        },
      };
    }
    return {
      balanceOf: mockBalanceOf,
    };
  }),
  formatEther: (value: bigint) => (Number(value) / 1e18).toString(),
}));

describe('integration — gas refuel decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithdraw.mockResolvedValue({ wait: mockWithdrawWait });
    mockWithdrawWait.mockResolvedValue({ hash: '0xunwrap' });
    mockSwapExactOnCandidateDex.mockResolvedValue({ txHash: '0xswap' });
    mockSignerGetAddress.mockResolvedValue('0x1111111111111111111111111111111111111111');
  });

  it('requests top-up when current ETH is below minimum', () => {
    const d = computeGasRefuel(
      500_000_000_000_000n,
      1_500_000_000_000_000n,
      3_000_000_000_000_000n
    );
    expect(d.shouldRefuel).toBe(true);
    expect(d.topUpWei).toBe(2_500_000_000_000_000n);
  });

  it('does not refuel when current ETH is at or above minimum', () => {
    const d = computeGasRefuel(
      2_000_000_000_000_000n,
      1_500_000_000_000_000n,
      3_000_000_000_000_000n
    );
    expect(d.shouldRefuel).toBe(false);
    expect(d.topUpWei).toBe(0n);
  });

  it('falls back to configured base token swap when there is no WETH', async () => {
    const { runGasSelfSustain } = await import('../../src/ops/gasSelfSustain.js');

    mockProviderGetBalance
      .mockResolvedValueOnce(500_000_000_000_000n)
      .mockResolvedValueOnce(3_000_000_000_000_000n);
    mockBalanceOf
      .mockResolvedValueOnce(0n)
      .mockResolvedValueOnce(100_000_000n)
      .mockResolvedValueOnce(2_500_000_000_000_000n);
    mockQuoteExactInputSingle.mockResolvedValue([3_000_000_000_000_000n]);

    const bot = {
      id: 'test-bot',
      address: '0x1111111111111111111111111111111111111111',
      baseTokens: ['USDT'],
      gas: {
        minEthWei: '1500000000000000',
        targetEthWei: '3000000000000000',
        refuelDex: 'uniswap-v3-3000',
      },
    } as unknown as import('../../src/config/schema.js').BotConfig;

    const provider = {
      getBalance: (...args: unknown[]) => mockProviderGetBalance(...args),
    } as unknown as import('ethers').Provider;
    const signer = {
      getAddress: (...args: unknown[]) => mockSignerGetAddress(...args),
    } as unknown as import('ethers').Signer;

    const result = await runGasSelfSustain(bot, provider, signer);

    expect(mockSwapExactOnCandidateDex).toHaveBeenCalledOnce();
    const swapArgs = mockSwapExactOnCandidateDex.mock.calls[0];
    expect(swapArgs[0]).toBe('uniswap-v3-3000');
    expect(swapArgs[1]).toBe('0xdAC17F958D2ee523a2206206994597C13D831ec7');
    expect(swapArgs[2]).toBe('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
    expect(swapArgs[3]).toBe(85_000_001n);
    expect(swapArgs[4]).toBe(2_422_500_028_500_000n);
    expect(swapArgs[5]).toBe('0x1111111111111111111111111111111111111111');
    expect(swapArgs[6]).toBe(signer);
    expect(mockWithdraw).toHaveBeenCalledWith(2_500_000_000_000_000n);
    expect(result.needsOperator).toBe(false);
    expect(result.unwrappedWei).toBe(2_500_000_000_000_000n);
    expect(result.message).toContain('Swapped USDT');
  });
});
