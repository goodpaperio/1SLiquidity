/**
 * Price Fetcher - Get token prices from CoinGecko
 */
/**
 * Get price for a single token
 */
export declare function getTokenPrice(address: string): Promise<number>;
/**
 * Get prices for multiple tokens (more efficient)
 */
export declare function getTokenPrices(addresses: string[]): Promise<Map<string, number>>;
/**
 * Convert token amount to USD
 */
export declare function convertToUSD(tokenAddress: string, amount: bigint, decimals?: number): Promise<number>;
/**
 * Get token decimals (common ones hardcoded, can extend)
 */
export declare function getTokenDecimals(address: string): number;
/**
 * Clear price cache (useful for testing)
 */
export declare function clearPriceCache(): void;
//# sourceMappingURL=price-fetcher.d.ts.map