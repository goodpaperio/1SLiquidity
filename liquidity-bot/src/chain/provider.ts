import { FallbackProvider, JsonRpcProvider, type Provider } from 'ethers';

function rpcUrlsFromEnv(): string[] {
  const urls = [
    process.env.MAINNET_RPC_URL,
    process.env.MAINNET_RPC_URL_FALLBACK,
    process.env.RPC_URL,
    process.env.RPC_URL_FALLBACK,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));
  return [...new Set(urls)];
}

export function createProvider(rpcUrl?: string): Provider {
  const urls = rpcUrl?.trim()
    ? [rpcUrl.trim()]
    : rpcUrlsFromEnv();
  if (urls.length === 0) {
    throw new Error(
      'Set MAINNET_RPC_URL in liquidity-bot/.env for on-chain quotes'
    );
  }
  if (urls.length === 1) {
    return new JsonRpcProvider(urls[0], 1, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
  }

  const configs = urls.map((url, index) => ({
    provider: new JsonRpcProvider(url, 1, {
      staticNetwork: true,
      batchMaxCount: 1,
    }),
    priority: index + 1,
    stallTimeout: 750,
    weight: index === 0 ? 2 : 1,
  }));
  return new FallbackProvider(configs, undefined, { quorum: 1 });
}
