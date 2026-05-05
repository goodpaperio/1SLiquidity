/**
 * Price Fetcher - Get token prices from CoinGecko
 */

interface TokenPrice {
  address: string;
  priceUSD: number;
  timestamp: number;
}

interface CoinGeckoPriceResponse {
  [address: string]: {
    usd: number;
  };
}

// Cache prices for 5 minutes to avoid rate limits
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const priceCache = new Map<string, TokenPrice>();

// Known stablecoins - assume $1.00 to save API calls
const STABLECOINS = new Set([
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x853d955acef822db058eb8505911ed77f175b99e', // FRAX
  '0x4fabb145d64652a948d72533023f6e7a623c7c53', // BUSD
  '0x8e870d67f660d95d5be530380d0ec0bd388289e1', // PAXG
]);

/**
 * Check if token is a known stablecoin
 */
function isStablecoin(address: string): boolean {
  return STABLECOINS.has(address.toLowerCase());
}

/**
 * Get cached price if available and not expired
 */
function getCachedPrice(address: string): number | null {
  const cached = priceCache.get(address.toLowerCase());
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > PRICE_CACHE_TTL) {
    priceCache.delete(address.toLowerCase());
    return null;
  }
  
  return cached.priceUSD;
}

/**
 * Cache price
 */
function cachePrice(address: string, priceUSD: number): void {
  priceCache.set(address.toLowerCase(), {
    address: address.toLowerCase(),
    priceUSD,
    timestamp: Date.now(),
  });
}

/**
 * Fetch prices from CoinGecko for multiple tokens
 */
async function fetchPricesFromCoinGecko(
  addresses: string[]
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();
  
  // Filter out cached and stablecoins
  const addressesToFetch: string[] = [];
  
  for (const address of addresses) {
    const lowerAddress = address.toLowerCase();
    
    // Check if stablecoin
    if (isStablecoin(lowerAddress)) {
      prices.set(lowerAddress, 1.0);
      cachePrice(lowerAddress, 1.0);
      continue;
    }
    
    // Check cache
    const cached = getCachedPrice(lowerAddress);
    if (cached !== null) {
      prices.set(lowerAddress, cached);
      continue;
    }
    
    addressesToFetch.push(lowerAddress);
  }
  
  // If all prices cached or stablecoins, return
  if (addressesToFetch.length === 0) {
    return prices;
  }
  
  // Fetch from CoinGecko (batch up to 10 addresses at once)
  const BATCH_SIZE = 10;
  for (let i = 0; i < addressesToFetch.length; i += BATCH_SIZE) {
    const batch = addressesToFetch.slice(i, i + BATCH_SIZE);
    const addressesParam = batch.join(',');
    
    try {
      const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressesParam}&vs_currencies=usd`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`⚠️  CoinGecko API error: ${response.status} ${response.statusText}`);
        
        // If rate limited, wait and retry once
        if (response.status === 429) {
          console.log('⏳ Rate limited, waiting 60 seconds...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          return fetchPricesFromCoinGecko(addresses); // Retry
        }
        
        continue;
      }
      
      const data = await response.json() as CoinGeckoPriceResponse;
      
      // Parse response
      for (const [address, priceData] of Object.entries(data)) {
        const lowerAddress = address.toLowerCase();
        const priceUSD = priceData.usd || 0;
        
        if (priceUSD > 0) {
          prices.set(lowerAddress, priceUSD);
          cachePrice(lowerAddress, priceUSD);
        } else {
          console.warn(`⚠️  No price found for ${address}`);
          prices.set(lowerAddress, 0);
        }
      }
      
      // Rate limit: Wait 1 second between batches
      if (i + BATCH_SIZE < addressesToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch prices from CoinGecko:`, error);
      // Return whatever we have so far
      break;
    }
  }
  
  return prices;
}

/**
 * Get price for a single token
 */
export async function getTokenPrice(address: string): Promise<number> {
  const prices = await fetchPricesFromCoinGecko([address]);
  return prices.get(address.toLowerCase()) || 0;
}

/**
 * Get prices for multiple tokens (more efficient)
 */
export async function getTokenPrices(addresses: string[]): Promise<Map<string, number>> {
  return fetchPricesFromCoinGecko(addresses);
}

/**
 * Convert token amount to USD
 */
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

/**
 * Get token decimals (common ones hardcoded, can extend)
 */
export function getTokenDecimals(address: string): number {
  const lowerAddress = address.toLowerCase();
  
  // USDC, USDT = 6 decimals
  if (
    lowerAddress === '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' || // USDC
    lowerAddress === '0xdac17f958d2ee523a2206206994597c13d831ec7'    // USDT
  ) {
    return 6;
  }
  
  // WBTC = 8 decimals
  if (lowerAddress === '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599') {
    return 8;
  }
  
  // Most ERC20s = 18 decimals (WETH, DAI, etc.)
  return 18;
}

/**
 * Clear price cache (useful for testing)
 */
export function clearPriceCache(): void {
  priceCache.clear();
}
