export type BaseTokenSymbol = 'WETH' | 'USDC' | 'USDT' | 'DAI' | 'WBTC';

export const BASE_TOKEN_SYMBOLS: readonly BaseTokenSymbol[] = [
  'WETH',
  'USDC',
  'USDT',
  'DAI',
  'WBTC',
] as const;

/** Mainnet addresses for base tokens. */
export const BASE_TOKEN_ADDRESSES: Record<BaseTokenSymbol, string> = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
};

export const BASE_TOKEN_DECIMALS: Record<BaseTokenSymbol, number> = {
  WETH: 18,
  USDC: 6,
  USDT: 6,
  DAI: 18,
  WBTC: 8,
};

/** Pair list filename per base (under repo config/). */
export const BASE_PAIR_FILES: Record<BaseTokenSymbol, string> = {
  WETH: 'config/weth_pairs_clean.json',
  USDC: 'config/usdc_pairs_clean.json',
  USDT: 'config/usdt_pairs_clean.json',
  DAI: 'config/dai_pairs_clean.json',
  WBTC: 'config/wbtc_pairs_clean.json',
};

export function isBaseTokenSymbol(value: string): value is BaseTokenSymbol {
  return (BASE_TOKEN_SYMBOLS as readonly string[]).includes(value);
}

export function baseTokenFromAddress(
  address: string
): BaseTokenSymbol | undefined {
  const lower = address.toLowerCase();
  for (const sym of BASE_TOKEN_SYMBOLS) {
    if (BASE_TOKEN_ADDRESSES[sym].toLowerCase() === lower) {
      return sym;
    }
  }
  return undefined;
}
