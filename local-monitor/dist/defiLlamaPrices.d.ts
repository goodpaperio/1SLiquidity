/** DefiLlama coins API — free, no key, aggregated CEX+DEX prices. */
export declare function fetchEthereumTokenPrices(addresses: string[]): Promise<Map<string, number>>;
export declare function fetchEthBtcUsd(): Promise<{
    ethUsd: number;
    btcUsd: number;
}>;
//# sourceMappingURL=defiLlamaPrices.d.ts.map