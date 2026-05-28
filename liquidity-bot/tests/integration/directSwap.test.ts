import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSwapExactTokensForTokens = vi.fn();
const mockExactInputSingle = vi.fn();
const mockWait = vi.fn();
const mockEnsureAllowance = vi.fn();

vi.mock('../../src/chain/erc20.js', () => ({
  ensureAllowance: (...args: unknown[]) => mockEnsureAllowance(...args),
}));

vi.mock('ethers', () => ({
  Contract: vi.fn().mockImplementation((_addr: string) => ({
    swapExactTokensForTokens: mockSwapExactTokensForTokens,
    exactInputSingle: mockExactInputSingle,
  })),
}));

describe('integration — leg 1 direct swap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWait.mockResolvedValue({ hash: '0xabc' });
    mockSwapExactTokensForTokens.mockResolvedValue({ wait: mockWait });
    mockExactInputSingle.mockResolvedValue({ wait: mockWait });
    mockEnsureAllowance.mockResolvedValue(undefined);
  });

  it('routes v2/sushiswap through swapExactTokensForTokens', async () => {
    const { swapExactOnCandidateDex } = await import(
      '../../src/execution/directSwap.js'
    );
    const signer = {} as import('ethers').Signer;
    const recipient = '0x1111111111111111111111111111111111111111';
    const tokenIn = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const tokenOut = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

    const res = await swapExactOnCandidateDex(
      'uniswap-v2',
      tokenIn,
      tokenOut,
      1_000_000n,
      900_000n,
      recipient,
      signer
    );

    expect(res.txHash).toBe('0xabc');
    expect(mockEnsureAllowance).toHaveBeenCalledOnce();
    expect(mockSwapExactTokensForTokens).toHaveBeenCalledOnce();
    expect(mockExactInputSingle).not.toHaveBeenCalled();
  });

  it('routes v3 through exactInputSingle', async () => {
    const { swapExactOnCandidateDex } = await import(
      '../../src/execution/directSwap.js'
    );
    const signer = {} as import('ethers').Signer;
    const recipient = '0x1111111111111111111111111111111111111111';
    const tokenIn = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const tokenOut = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

    const res = await swapExactOnCandidateDex(
      'uniswap-v3-500',
      tokenIn,
      tokenOut,
      1_000_000n,
      900_000n,
      recipient,
      signer
    );

    expect(res.txHash).toBe('0xabc');
    expect(mockEnsureAllowance).toHaveBeenCalledOnce();
    expect(mockExactInputSingle).toHaveBeenCalledOnce();
  });
});
