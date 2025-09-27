// hooks/useTopTokens.ts
import { useQuery } from '@tanstack/react-query'

// Define the token data structure based on your API response
export interface TopToken {
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

export interface TopTokensResponse {
  success: boolean
  data: TopToken[]
  metric: string
  limit: number
}

export interface UseTopTokensParams {
  limit?: number
  metric?:
    | 'reserveAtotaldepth'
    | 'reserveBtotaldepth'
    | 'marketCap'
    | 'slippageSavings'
  enabled?: boolean
}

const fetchTopTokens = async ({
  limit = 1000,
  metric = 'reserveAtotaldepth',
}: UseTopTokensParams = {}): Promise<TopTokensResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    metric,
  })

  const response = await fetch(`/api/tokens/top?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch top tokens: ${response.statusText}`)
  }

  return response.json()
}

export const useTopTokens = (params: UseTopTokensParams = {}) => {
  const { limit = 50, metric = 'slippageSavings', enabled = true } = params

  return useQuery({
    queryKey: ['topTokens', { limit, metric }],
    queryFn: () => fetchTopTokens({ limit, metric }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    refetchOnWindowFocus: false,
  })
}
