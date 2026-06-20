import tokensListData from './tokens-list-04-09-2025.json'
import wethPairsData from '../../../../config/weth_pairs_clean.json'

export type KnownTradeTokenMeta = {
  symbol: string
  decimals: number
  name: string
}

export const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

/** Non-18-decimal tokens in the bot universe. */
const DECIMAL_OVERRIDES: Record<string, number> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // USDC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8, // WBTC
  '0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf': 8, // cbBTC
  '0x8236a87084f8b84306f72007f36f2618a5634494': 8, // LBTC
  '0x00f3c42833c3170159af4e92dbb451fb3f708917': 8, // ICP
  '0x467bccd9d29f223bce8043b84e8c8b282827790f': 2, // TEL
  '0xd1d2eb1b1e90b638588728b4130137d262c87cae': 8, // GALA
}

/** Display symbols for weth-pair names when tokens-list has no entry. */
const SYMBOL_FROM_PAIR_NAME: Record<string, string> = {
  cbeth: 'cbETH',
  reth: 'rETH',
  weeth: 'weETH',
  wsteth: 'wstETH',
  steth: 'stETH',
  lseth: 'lsETH',
  oseth: 'osETH',
  ethx: 'ETHx',
  frxeth: 'frxETH',
  sfrxeth: 'sfrxETH',
  cbbtc: 'cbBTC',
  lbtc: 'LBTC',
  ethplus: 'ETH+',
  'eth+': 'ETH+',
  wbtc: 'WBTC',
  shib: 'SHIB',
  link: 'LINK',
  aave: 'AAVE',
  ldo: 'LDO',
  inj: 'INJ',
  beam: 'BEAM',
  rsr: 'RSR',
  gala: 'GALA',
  bonk: 'BONK',
  morpho: 'MORPHO',
  eigen: 'EIGEN',
  syrup: 'SYRUP',
  pengu: 'PENGU',
  xaut: 'XAUT',
}

function symbolFromPairName(name: string): string {
  const key = name.toLowerCase()
  if (SYMBOL_FROM_PAIR_NAME[key]) return SYMBOL_FROM_PAIR_NAME[key]
  return name.toUpperCase()
}

function buildKnownTradeTokens(): Record<string, KnownTradeTokenMeta> {
  const map: Record<string, KnownTradeTokenMeta> = {
    [WETH_ADDRESS]: {
      symbol: 'WETH',
      decimals: 18,
      name: 'Wrapped Ether',
    },
  }

  for (const base of tokensListData.testResults) {
    for (const r of base.results) {
      const addr = r.tokenAddress.toLowerCase()
      if (map[addr]) continue
      map[addr] = {
        symbol: r.tokenSymbol,
        decimals: DECIMAL_OVERRIDES[addr] ?? r.tokenDecimals,
        name: r.tokenSymbol,
      }
    }
  }

  for (const pair of wethPairsData.pairs) {
    const addr = pair.address.toLowerCase()
    if (map[addr]) continue
    const symbol = symbolFromPairName(pair.name)
    map[addr] = {
      symbol,
      decimals: DECIMAL_OVERRIDES[addr] ?? 18,
      name: symbol,
    }
  }

  for (const [addr, decimals] of Object.entries(DECIMAL_OVERRIDES)) {
    const entry = map[addr]
    if (entry) entry.decimals = decimals
  }

  return map
}

export const KNOWN_TRADE_TOKENS: Record<string, KnownTradeTokenMeta> =
  buildKnownTradeTokens()

export function getKnownTradeToken(
  address: string | undefined
): KnownTradeTokenMeta | undefined {
  if (!address) return undefined
  return KNOWN_TRADE_TOKENS[address.toLowerCase()]
}
