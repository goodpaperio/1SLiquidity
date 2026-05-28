import { JsonRpcProvider } from 'ethers';

export function createProvider(rpcUrl?: string): JsonRpcProvider {
  const url =
    rpcUrl?.trim() ||
    process.env.MAINNET_RPC_URL?.trim() ||
    process.env.RPC_URL?.trim();
  if (!url) {
    throw new Error(
      'Set MAINNET_RPC_URL in liquidity-bot/.env for on-chain quotes'
    );
  }
  return new JsonRpcProvider(url, 1, {
    staticNetwork: true,
    batchMaxCount: 1,
  });
}
