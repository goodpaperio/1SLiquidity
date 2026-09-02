/**
 * Price Fetcher - Get token prices from DefiLlama
 */

import { fetchEthereumTokenPrices } from './defiLlamaPrices.js';

interface TokenPrice {
  address: string;
  priceUSD: number;
  timestamp: number;
}

// Cache prices for 5 minutes
const PRICE_CACHE_TTL = 5 * 60 * 1000;
const priceCache = new Map<string, TokenPrice>();

const STABLECOINS = new Set([
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x853d955acef822db058eb8505911ed77f175b99e', // FRAX
  '0x4fabb145d64652a948d72533023f6e7a623c7c53', // BUSD
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1', // PAXG
]);

function isStablecoin(address: string): boolean {
  return STABLECOINS.has(address.toLowerCase());
}

function getCachedPrice(address: string): number | null {
  const cached = priceCache.get(address.toLowerCase());
  if (!cached) return null;

  if (Date.now() - cached.timestamp > PRICE_CACHE_TTL) {
    priceCache.delete(address.toLowerCase());
    return null;
  }

  return cached.priceUSD;
}

function cachePrice(address: string, priceUSD: number): void {
  priceCache.set(address.toLowerCase(), {
    address: address.toLowerCase(),
    priceUSD,
    timestamp: Date.now(),
  });
}

async function fetchPrices(addresses: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  const addressesToFetch: string[] = [];

  for (const address of addresses) {
    const lowerAddress = address.toLowerCase();

    if (isStablecoin(lowerAddress)) {
      prices.set(lowerAddress, 1.0);
      cachePrice(lowerAddress, 1.0);
      continue;
    }

    const cached = getCachedPrice(lowerAddress);
    if (cached !== null) {
      prices.set(lowerAddress, cached);
      continue;
    }

    addressesToFetch.push(lowerAddress);
  }

  if (addressesToFetch.length === 0) {
    return prices;
  }

  try {
    const fetched = await fetchEthereumTokenPrices(addressesToFetch);
    for (const address of addressesToFetch) {
      const priceUSD = fetched.get(address) ?? 0;
      if (priceUSD > 0) {
        prices.set(address, priceUSD);
        cachePrice(address, priceUSD);
      } else {
        console.warn(`⚠️  No DefiLlama price found for ${address}`);
        prices.set(address, 0);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to fetch prices from DefiLlama:`, error);
  }

  return prices;
}

export async function getTokenPrice(address: string): Promise<number> {
  const prices = await fetchPrices([address]);
  return prices.get(address.toLowerCase()) || 0;
}

export async function getTokenPrices(addresses: string[]): Promise<Map<string, number>> {
  return fetchPrices(addresses);
}

export async function convertToUSD(
  tokenAddress: string,
  amount: bigint,
  decimals: number = 18
): Promise<number> {
  const price = await getTokenPrice(tokenAddress);
  if (price === 0) return 0;

  const amountInToken = Number(amount) / Math.pow(10, decimals);
  return amountInToken * price;
}

export function getTokenDecimals(address: string): number {
  const lowerAddress = address.toLowerCase();

  if (
    lowerAddress === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' ||
    lowerAddress === '0xdac17f958d2ee523a2206206994597c13d831ec7'
  ) {
    return 6;
  }

  if (lowerAddress === '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599') {
    return 8;
  }

  return 18;
}

export function clearPriceCache(): void {
  priceCache.clear();
}
