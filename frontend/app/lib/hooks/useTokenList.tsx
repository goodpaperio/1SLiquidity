import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_TYPE } from './useWalletTokens'
import { useAppKitState } from '@reown/appkit/react'
import tokensListData from '../utils/tokens-list-04-09-2025.json'
import { applyLiveReferencePrices } from '../utils/referencePrices'
import { fetchEthereumTokenPrices } from '../utils/defiLlamaPrices'
import { useLiveReferencePrices } from './useLiveReferencePrices'

interface CatalogToken {
  symbol: string
  name: string
  token_address: string
  decimals: number
  icon: string
  popular: boolean
  market_cap_rank: number
}

interface JsonTokenResult {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
  success: boolean
  failureReason: string
}

interface JsonBaseTokenData {
  baseToken: string
  totalTests: number
  successCount: number
  failureCount: number
  results: JsonTokenResult[]
}

const CHAIN_ID_TO_PLATFORM: Record<string, string> = {
  '1': 'ethereum',
}

const TOKEN_LIST_STALE_MS = 30 * 60 * 1000 // 30 minutes

const POPULAR_SYMBOLS = new Set([
  'eth',
  'weth',
  'wbtc',
  'usdt',
  'usdc',
  'dai',
])

const ETH_PEGGED_SYMBOLS = new Set([
  'wsteth',
  'steth',
  'reth',
  'cbeth',
  'sweth',
  'ethx',
  'sfrxeth',
  'weeth',
])

const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6,
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8,
  '0x00f3c42833c3170159af4e92dbb451fb3f708917': 8,
  '0x467bccd9d29f223bce8043b84e8c8b282827790f': 2,
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18,
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18,
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 18,
  '0x514910771af9ca656af840dff83e8264ecf986ca': 18,
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 18,
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 18,
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': 18,
}

const WETH_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

/** Curated base tokens with icons — prices filled from DefiLlama at runtime. */
const CATALOG_TOKENS: CatalogToken[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    token_address: WETH_ADDRESS,
    decimals: 18,
    icon: '/tokens/eth-blue.png',
    popular: true,
    market_cap_rank: 1,
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    token_address: WETH_ADDRESS,
    decimals: 18,
    icon: '/tokens/weth.svg',
    popular: true,
    market_cap_rank: 1,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    token_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    icon: '/tokens/usdt.svg',
    popular: true,
    market_cap_rank: 2,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    token_address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    icon: '/tokens/usdc.svg',
    popular: true,
    market_cap_rank: 3,
  },
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    token_address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
    icon: '/tokens/wbtc.svg',
    popular: true,
    market_cap_rank: 4,
  },
]


function getAllTokensFromJson(): {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
}[] {
  const allTokens: {
    tokenName: string
    tokenAddress: string
    tokenDecimals: number
    tokenSymbol: string
  }[] = []
  const seenAddresses = new Set<string>()

  tokensListData.testResults.forEach((baseTokenData: JsonBaseTokenData) => {
    baseTokenData.results.forEach((token: JsonTokenResult) => {
      if (!token.success) return
      const lowerAddress = token.tokenAddress.toLowerCase()
      if (seenAddresses.has(lowerAddress)) return
      seenAddresses.add(lowerAddress)
      allTokens.push({
        tokenName: token.tokenName,
        tokenAddress: token.tokenAddress,
        tokenDecimals: token.tokenDecimals,
        tokenSymbol: token.tokenSymbol,
      })
    })
  })

  return allTokens
}

function catalogToTokenEntry(catalog: CatalogToken): TOKENS_TYPE {
  return {
    name: catalog.name,
    symbol: catalog.symbol,
    icon: catalog.icon,
    popular: catalog.popular,
    value: 0,
    status: 'increase',
    statusAmount: 0,
    token_address: catalog.token_address.toLowerCase(),
    decimals: catalog.decimals,
    balance: '0',
    possible_spam: false,
    usd_price: 0,
    market_cap_rank: catalog.market_cap_rank,
    usd_value: 0,
  }
}

function jsonToTokenEntry(jsonToken: {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
}): TOKENS_TYPE {
  const address = jsonToken.tokenAddress.toLowerCase()
  const symbol = jsonToken.tokenSymbol.toUpperCase()
  return {
    name:
      jsonToken.tokenName.charAt(0).toUpperCase() + jsonToken.tokenName.slice(1),
    symbol,
    icon: `/tokens/${jsonToken.tokenName.toLowerCase()}.svg`,
    popular: POPULAR_SYMBOLS.has(jsonToken.tokenSymbol.toLowerCase()),
    value: 0,
    status: 'increase',
    statusAmount: 0,
    token_address: address,
    decimals: jsonToken.tokenDecimals,
    balance: '0',
    possible_spam: false,
    usd_price: 0,
    market_cap_rank: 999999,
    usd_value: 0,
  }
}

function buildStaticTokenList(): TOKENS_TYPE[] {
  const byAddress = new Map<string, TOKENS_TYPE>()

  for (const catalog of CATALOG_TOKENS) {
    byAddress.set(catalog.token_address.toLowerCase(), catalogToTokenEntry(catalog))
  }

  for (const jsonToken of getAllTokensFromJson()) {
    const address = jsonToken.tokenAddress.toLowerCase()
    if (!byAddress.has(address)) {
      byAddress.set(address, jsonToTokenEntry(jsonToken))
    }
  }

  return [...byAddress.values()]
}

async function attachDefiLlamaPrices(tokens: TOKENS_TYPE[]): Promise<TOKENS_TYPE[]> {
  const addresses = tokens.map((t) => t.token_address)
  let prices: Map<string, number>
  try {
    prices = await fetchEthereumTokenPrices(addresses)
  } catch (error) {
    console.warn('DefiLlama token price fetch failed:', error)
    return tokens
  }

  const wethUsd = prices.get(WETH_ADDRESS) ?? 0

  return tokens.map((token) => {
    const addr = token.token_address.toLowerCase()
    let usdPrice = prices.get(addr) ?? 0

    if (usdPrice <= 0 && wethUsd > 0) {
      const sym = token.symbol.toLowerCase()
      if (ETH_PEGGED_SYMBOLS.has(sym)) {
        usdPrice = wethUsd
      }
    }

    if (usdPrice <= 0) return token
    return { ...token, usd_price: usdPrice }
  })
}

export const useTokenList = () => {
  const stateData = useAppKitState()
  const chainId = stateData?.selectedNetworkId?.split(':')[1] || '1'
  const targetPlatform = CHAIN_ID_TO_PLATFORM[chainId] || 'ethereum'

  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['token-list', chainId, 'static-defillama'],
    queryFn: async () => {
      if (targetPlatform !== 'ethereum') {
        return buildStaticTokenList()
      }
      const staticTokens = buildStaticTokenList()
      return attachDefiLlamaPrices(staticTokens)
    },
    staleTime: TOKEN_LIST_STALE_MS,
    gcTime: TOKEN_LIST_STALE_MS * 2,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  const { prices: livePrices, ethUsd, btcUsd } = useLiveReferencePrices()

  const tokensWithLivePrices = useMemo(() => {
    if (!tokens.length || Object.keys(livePrices).length === 0) return tokens
    return applyLiveReferencePrices(tokens, livePrices)
  }, [tokens, livePrices])

  return {
    tokens: tokensWithLivePrices,
    ethUsd,
    btcUsd,
    livePrices,
    isLoading,
    error,
    refetch,
    chainId,
    platform: targetPlatform,
  }
}
