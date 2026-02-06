// hooks/useTokenPairs.ts
import { useQuery } from '@tanstack/react-query'

// Define the token pair data structure based on your API response
export interface TokenPair {
  tokenAAddress: string
  tokenASymbol: string
  tokenAName: string
  tokenBAddress: string
  tokenBSymbol: string
  reserveAtotaldepth: number
  reserveBtotaldepth: number
  reserveAtotaldepthWei: string
  reserveBtotaldepthWei: string
  marketCap: string | null
  timestamp: string
  slippageSavings: number
}

export interface TokenPairsResponse {
  success: boolean
  data: TokenPair[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface UseTokenPairsParams {
  address: string | null | undefined
  page?: number
  limit?: number
  enabled?: boolean
}

const fetchTokenPairs = async ({
  address,
  page = 1,
  limit = 20,
}: {
  address: string
  page?: number
  limit?: number
}): Promise<TokenPairsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await fetch(`/api/tokens/${address}/pairs?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch token pairs: ${response.statusText}`)
  }

  return response.json()
}

export const useTokenPairs = (params: UseTokenPairsParams) => {
  const { address, page = 1, limit = 20, enabled = true } = params

  return useQuery({
    queryKey: ['tokenPairs', address, { page, limit }],
    queryFn: () => fetchTokenPairs({ address: address!, page, limit }),
    enabled: enabled && !!address, // Only run query if address is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    refetchOnWindowFocus: false,
  })
}
