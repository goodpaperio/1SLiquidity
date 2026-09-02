/** DefiLlama coins API — free, no key, aggregated CEX+DEX prices. */

const DEFILLAMA_PRICES_URL = 'https://coins.llama.fi/prices/current';

async function fetchEthBtcUsd(): Promise<{ ethUsd: number; btcUsd: number }> {
  const url = `${DEFILLAMA_PRICES_URL}/coingecko:ethereum,coingecko:bitcoin`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DefiLlama price fetch failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    coins?: Record<string, { price?: number }>;
  };
  const ethUsd = data.coins?.['coingecko:ethereum']?.price ?? 0;
  const btcUsd = data.coins?.['coingecko:bitcoin']?.price ?? 0;
  if (ethUsd <= 0 || btcUsd <= 0) {
    throw new Error('DefiLlama returned invalid ETH/BTC prices');
  }
  return { ethUsd, btcUsd };
}

export { fetchEthBtcUsd };
