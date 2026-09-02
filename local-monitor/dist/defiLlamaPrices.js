"use strict";
/** DefiLlama coins API — free, no key, aggregated CEX+DEX prices. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchEthereumTokenPrices = fetchEthereumTokenPrices;
exports.fetchEthBtcUsd = fetchEthBtcUsd;
const DEFILLAMA_PRICES_URL = 'https://coins.llama.fi/prices/current';
const ETHEREUM_CHAIN = 'ethereum';
const BATCH_SIZE = 100;
function ethereumCoinId(address) {
    return `${ETHEREUM_CHAIN}:${address.toLowerCase()}`;
}
function addressFromCoinId(coinId) {
    const prefix = `${ETHEREUM_CHAIN}:`;
    if (!coinId.startsWith(prefix))
        return null;
    return coinId.slice(prefix.length);
}
async function fetchPriceBatch(coinIds) {
    const prices = new Map();
    if (coinIds.length === 0)
        return prices;
    const url = `${DEFILLAMA_PRICES_URL}/${coinIds.join(',')}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`DefiLlama price fetch failed: HTTP ${response.status}`);
    }
    const data = (await response.json());
    for (const [coinId, entry] of Object.entries(data.coins ?? {})) {
        const price = entry.price;
        if (typeof price !== 'number' || price <= 0)
            continue;
        const address = addressFromCoinId(coinId);
        if (address) {
            prices.set(address, price);
        }
        else if (coinId === 'coingecko:ethereum') {
            prices.set('coingecko:ethereum', price);
        }
        else if (coinId === 'coingecko:bitcoin') {
            prices.set('coingecko:bitcoin', price);
        }
    }
    return prices;
}
async function fetchEthereumTokenPrices(addresses) {
    const unique = [...new Set(addresses.map((a) => a.toLowerCase()).filter(Boolean))];
    const prices = new Map();
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
        const batch = unique.slice(i, i + BATCH_SIZE);
        const coinIds = batch.map(ethereumCoinId);
        const batchPrices = await fetchPriceBatch(coinIds);
        for (const [addr, price] of batchPrices) {
            prices.set(addr, price);
        }
    }
    return prices;
}
async function fetchEthBtcUsd() {
    const prices = await fetchPriceBatch(['coingecko:ethereum', 'coingecko:bitcoin']);
    const ethUsd = prices.get('coingecko:ethereum') ?? 0;
    const btcUsd = prices.get('coingecko:bitcoin') ?? 0;
    if (ethUsd <= 0 || btcUsd <= 0) {
        throw new Error('DefiLlama returned invalid ETH/BTC prices');
    }
    return { ethUsd, btcUsd };
}
//# sourceMappingURL=defiLlamaPrices.js.map