/** LiquifierV1 on Ethereum mainnet — dust batch swap via Permit2. */
export const LIQUIFIER_V1 = '0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95';

export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';

export const UNISWAP_V3_QUOTER_V1 = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

export const LIQUIFIER_ABI = [
  {
    type: 'function',
    name: 'liquify',
    inputs: [
      {
        name: 'inputs',
        type: 'tuple[]',
        components: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
          { name: 'v3Path', type: 'bytes' },
          { name: 'v2Path', type: 'address[]' },
        ],
      },
      { name: 'outputToken', type: 'address' },
      { name: 'omitTokens', type: 'address[]' },
      { name: 'minTotalOut', type: 'uint256' },
      { name: 'permitNonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'sig', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const PERMIT2_NONCE_ABI = [
  'function nonceBitmap(address owner, uint256 wordPos) view returns (uint256)',
] as const;

export const UNISWAP_V3_QUOTER_V1_ABI = [
  'function quoteExactInput(bytes path, uint256 amountIn) external returns (uint256 amountOut)',
] as const;

export const WETH_WITHDRAW_ABI = [
  'function withdraw(uint256 wad) external',
] as const;

export interface TokenInput {
  token: string;
  amount: bigint;
  v3Path: string;
  v2Path: string[];
}
