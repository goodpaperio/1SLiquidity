/**
 * Price Fetcher - Get token prices from DefiLlama
 */
export declare function getTokenPrice(address: string): Promise<number>;
export declare function getTokenPrices(addresses: string[]): Promise<Map<string, number>>;
export declare function convertToUSD(tokenAddress: string, amount: bigint, decimals?: number): Promise<number>;
export declare function getTokenDecimals(address: string): number;
export declare function clearPriceCache(): void;
//# sourceMappingURL=price-fetcher.d.ts.map