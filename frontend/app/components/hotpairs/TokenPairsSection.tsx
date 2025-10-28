'use client'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Button from '../button'
import { useRouter } from 'next/navigation'
import { tokensList } from './pairs-data'
import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  fetchSpecificPair,
  USDT_ADDRESS,
  useEnhancedSpecificPair,
  useTokenEnhancer,
} from '@/app/lib/hooks/hotpairs/useEnhancedTokens'
import { useQueryClient } from '@tanstack/react-query'
import ImageFallback from '@/app/shared/ImageFallback'
import tokensListData from '@/app/lib/utils/tokens-list-04-09-2025.json'

// Types for JSON data
type TokenResult = {
  tokenName: string
  tokenAddress: string
  success: boolean
  failureReason: string
}

type BaseTokenData = {
  baseToken: string
  totalTests: number
  successCount: number
  failureCount: number
  results: TokenResult[]
}

// Helper function to get all unique tokens from JSON results (only successful ones)
const getAllTokensFromJson = (): {
  tokenName: string
  tokenAddress: string
}[] => {
  const allTokens: { tokenName: string; tokenAddress: string }[] = []
  const seenAddresses = new Set<string>()

  tokensListData.testResults.forEach((baseTokenData: BaseTokenData) => {
    baseTokenData.results.forEach((token: TokenResult) => {
      // Only include tokens where success is true
      if (token.success) {
        const lowerAddress = token.tokenAddress.toLowerCase()
        if (!seenAddresses.has(lowerAddress)) {
          seenAddresses.add(lowerAddress)
          allTokens.push({
            tokenName: token.tokenName,
            tokenAddress: token.tokenAddress,
          })
        }
      }
    })
  })

  return allTokens
}

// Helper function to get tokens for a specific base token (only successful ones)
const getTokensForBaseToken = (
  baseToken: string
): { tokenName: string; tokenAddress: string }[] => {
  const baseTokenData = tokensListData.testResults.find(
    (data: BaseTokenData) => data.baseToken === baseToken
  )

  if (!baseTokenData) return []

  // Only return tokens where success is true
  return baseTokenData.results
    .filter((token: TokenResult) => token.success)
    .map((token: TokenResult) => ({
      tokenName: token.tokenName,
      tokenAddress: token.tokenAddress,
    }))
}

export default function TokenPairsSection({
  selectedBaseToken,
  selectedOtherToken,
  setSelectedBaseToken,
  setSelectedOtherToken,
  clearAllSelectedTokens,
  handleActiveHotPair,
  clearBaseAndOtherTokens,
}: {
  selectedBaseToken: any
  selectedOtherToken: any
  setSelectedBaseToken: any
  setSelectedOtherToken: any
  clearAllSelectedTokens: () => void
  handleActiveHotPair: (pair: any) => void
  clearBaseAndOtherTokens: () => void
}) {
  const baseTokensSymbol = ['USDT', 'USDC', 'WBTC', 'WETH', 'DAI']
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tokenRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const queryClient = useQueryClient()
  const { enhanceTokenPair, isLoadingTokenList, coinGeckoTokens } =
    useTokenEnhancer()

  // Get filtered base tokens based on selected other token
  const getFilteredBaseTokens = () => {
    let jsonTokenAddresses: string[] = []

    if (selectedOtherToken) {
      // If an other token is selected, show only its result tokens
      const otherTokenResults = getTokensForBaseToken(
        selectedOtherToken.symbol.toUpperCase()
      )
      jsonTokenAddresses = otherTokenResults.map((token) =>
        token.tokenAddress.toLowerCase()
      )
    } else {
      // Default: show all tokens from JSON results
      const allJsonTokens = getAllTokensFromJson()
      jsonTokenAddresses = allJsonTokens.map((token) =>
        token.tokenAddress.toLowerCase()
      )
    }

    // Filter CoinGecko tokens that match JSON token addresses
    const filteredCoinGeckoTokens = coinGeckoTokens.filter((cgToken) =>
      jsonTokenAddresses.includes(cgToken.token_address?.toLowerCase())
    )

    // Map to the format expected by TokenIcon component
    return filteredCoinGeckoTokens.map((cgToken) => ({
      id: cgToken.token_address,
      symbol: cgToken.symbol.toUpperCase(),
      tokenAddress: cgToken.token_address,
      icon:
        cgToken.token_address.toLowerCase() === USDT_ADDRESS.toLowerCase()
          ? '/tokens/usdt.svg'
          : cgToken.icon,
      name: cgToken.name,
      // Add other properties from CoinGecko as needed
    }))
  }

  const refetchSpecificPair = async (
    baseTokenAddress: any,
    otherTokenAddress: any
  ) => {
    if (baseTokenAddress && otherTokenAddress) {
      try {
        const result = await queryClient.fetchQuery({
          queryKey: ['specificPair', baseTokenAddress, otherTokenAddress],
          queryFn: () =>
            fetchSpecificPair({
              tokenA: baseTokenAddress,
              tokenB: otherTokenAddress,
            }),
        })

        if (result.data) {
          const data = enhanceTokenPair(result.data)

          const pairWithSlippageSavingsUsd = {
            ...data,
            slippageSavingsUsd:
              data.slippageSavings * (data.tokenBUsdPrice || 1),
          }
          handleActiveHotPair(pairWithSlippageSavingsUsd)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
  }

  const filteredBaseTokens = getFilteredBaseTokens()

  // Auto-scroll to center the selected base token when it changes
  useEffect(() => {
    if (
      selectedBaseToken &&
      scrollContainerRef.current &&
      filteredBaseTokens.length > 0
    ) {
      // Small delay to ensure DOM is updated and refs are set
      setTimeout(() => {
        const selectedTokenAddress =
          selectedBaseToken.tokenAddress?.toLowerCase()
        const tokenElement = tokenRefs.current.get(selectedTokenAddress)

        if (tokenElement && scrollContainerRef.current) {
          const container = scrollContainerRef.current

          // Use getBoundingClientRect to get actual visual positions
          const containerRect = container.getBoundingClientRect()
          const tokenRect = tokenElement.getBoundingClientRect()

          // Calculate the token's center position relative to the container's left edge
          const tokenCenterRelativeToContainer =
            tokenRect.left - containerRect.left + container.scrollLeft

          // Calculate how much to scroll to center the token
          // Token's center position minus half of the visible container width
          const scrollPosition =
            tokenCenterRelativeToContainer +
            tokenRect.width / 2 -
            containerRect.width / 2

          // Smooth scroll to center the token
          container.scrollTo({
            left: Math.max(0, scrollPosition),
            behavior: 'smooth',
          })
        }
      }, 150)
    }
  }, [selectedBaseToken, filteredBaseTokens])

  return (
    <div className="flex flex-col items-center w-full justify-center gap-8">
      <div className="flex flex-col md:flex-row items-center w-full justify-center gap-8 max-w-[50rem]">
        {/* Left Section -> Other Tokens: 2x2 Grid */}
        <div className="flex flex-wrap justify-center md:grid md:grid-cols-3 gap-4 md:min-w-[13rem]">
          {tokensList
            .filter((token) =>
              baseTokensSymbol.includes(token.symbol.toUpperCase())
            )
            .map((token) => (
              <TokenIcon
                key={token.id}
                token={token}
                isBaseToken={false}
                selectedBaseToken={selectedBaseToken}
                selectedOtherToken={selectedOtherToken}
                setSelectedBaseToken={setSelectedBaseToken}
                setSelectedOtherToken={setSelectedOtherToken}
                refetchSpecificPair={refetchSpecificPair}
                clearBaseAndOtherTokens={clearBaseAndOtherTokens}
              />
            ))}
        </div>

        {/* Vertical Divider */}
        <div className="w-[60%] h-[1px] md:w-[1px] md:h-28 bg-green-500 rounded-full"></div>

        {/* Right Section -> Base Tokens: 4x2 Grid */}
        {filteredBaseTokens.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto py-2 px-2 auto-cols-max w-full md:max-w-[90%] md:min-w-[30rem]"
          >
            {filteredBaseTokens.map((token) => (
              <TokenIcon
                key={token.id}
                token={token}
                isBaseToken={true}
                selectedBaseToken={selectedBaseToken}
                selectedOtherToken={selectedOtherToken}
                setSelectedBaseToken={setSelectedBaseToken}
                setSelectedOtherToken={setSelectedOtherToken}
                refetchSpecificPair={refetchSpecificPair}
                disabled={!selectedOtherToken} // Disable if no other token selected
                clearBaseAndOtherTokens={clearBaseAndOtherTokens}
                tokenRefs={tokenRefs}
              />
            ))}
          </div>
        ) : (
          <div className="text-white text-xl font-semibold min-w-[8rem] text-center">
            No tokens found
          </div>
        )}
      </div>

      {selectedBaseToken && selectedOtherToken && (
        <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex items-center">
          <div className="flex gap-[6px] items-center py-[6px] sm:py-[10px] px-[6px] sm:px-[9px] rounded-[8px]">
            <div className="flex items-center gap-4 justify-start">
              <div
                className={cn('flex items-center transition-all duration-300')}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10 overflow-hidden">
                  <ImageFallback
                    src={selectedBaseToken.icon}
                    alt="eth"
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300 overflow-hidden'
                  )}
                >
                  <ImageFallback
                    src={selectedOtherToken.icon}
                    alt="dai"
                    width={100}
                    height={100}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <h2 className="text-white text-xl font-semibold min-w-[8rem] text-left">
                {selectedBaseToken.symbol.toUpperCase()} /{' '}
                {selectedOtherToken.symbol.toUpperCase()}
              </h2>
            </div>
            <button
              className="hover:text-primary transition-colors"
              onClick={clearAllSelectedTokens}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TokenIcon({
  token,
  isBaseToken,
  selectedBaseToken,
  selectedOtherToken,
  setSelectedBaseToken,
  setSelectedOtherToken,
  refetchSpecificPair,
  disabled = false,
  clearBaseAndOtherTokens,
  tokenRefs,
}: {
  token: any
  isBaseToken?: boolean
  selectedBaseToken?: any
  selectedOtherToken?: any
  setSelectedBaseToken?: any
  setSelectedOtherToken?: any
  refetchSpecificPair: (baseToken: any, otherToken: any) => void
  disabled?: boolean
  clearBaseAndOtherTokens: () => void
  tokenRefs?: React.MutableRefObject<Map<string, HTMLDivElement>>
}) {
  return (
    <div
      ref={(el) => {
        if (el && isBaseToken && tokenRefs && token.tokenAddress) {
          tokenRefs.current.set(token.tokenAddress.toLowerCase(), el)
        }
      }}
      className={cn(
        'md:w-16 md:h-16 w-12 h-12 rounded-full flex items-center justify-center border-4 border-neutral-700 transition-all duration-300 group hover:scale-110 overflow-hidden',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        (selectedBaseToken?.symbol.toUpperCase() ===
          token.symbol.toUpperCase() &&
          isBaseToken) ||
          (selectedOtherToken?.symbol.toUpperCase() ===
            token.symbol.toUpperCase() &&
            !isBaseToken)
          ? 'border-[#40f798] scale-110 border-2'
          : ''
      )}
      onClick={() => {
        if (disabled) return

        if (isBaseToken) {
          if (
            selectedBaseToken &&
            selectedBaseToken.symbol.toUpperCase() ===
              token.symbol.toUpperCase()
          ) {
            // Unselect base token if clicked again
            setSelectedBaseToken(null)
          } else {
            setSelectedBaseToken(token)
            if (selectedOtherToken) {
              refetchSpecificPair(
                token?.tokenAddress,
                selectedOtherToken?.tokenAddress
              )
            }
          }
        } else {
          if (
            selectedOtherToken &&
            selectedOtherToken.symbol.toUpperCase() ===
              token.symbol.toUpperCase()
          ) {
            // Unselect other token if clicked again
            clearBaseAndOtherTokens()
            // setSelectedOtherToken(null)
          } else {
            if (selectedBaseToken && selectedOtherToken) {
              setSelectedBaseToken(null)
              setSelectedOtherToken(token)
              return
            }

            setSelectedOtherToken(token)
            if (selectedBaseToken) {
              refetchSpecificPair(
                selectedBaseToken?.tokenAddress,
                token?.tokenAddress
              )
            }
          }
        }
      }}

      // onClick={() => {
      //   if (disabled) return

      //   if (isBaseToken) {
      //     if (
      //       (selectedOtherToken &&
      //         selectedOtherToken.symbol.toUpperCase() !==
      //           token.symbol.toUpperCase()) ||
      //       !selectedOtherToken
      //     ) {
      //       setSelectedBaseToken(token)
      //       refetchSpecificPair(
      //         token?.tokenAddress,
      //         selectedOtherToken?.tokenAddress
      //       )
      //     }
      //   } else {
      //     if (
      //       selectedBaseToken &&
      //       selectedBaseToken.symbol.toUpperCase() !==
      //         token.symbol.toUpperCase()
      //     ) {
      //       setSelectedOtherToken(token)
      //       refetchSpecificPair(
      //         selectedBaseToken?.tokenAddress,
      //         token?.tokenAddress
      //       )
      //     }
      //   }
      // }}
    >
      <Image
        src={token.icon}
        alt={token.symbol}
        width={20}
        height={20}
        className={cn(
          'w-full h-full filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100',
          disabled ? 'grayscale opacity-30' : '',
          (selectedBaseToken?.symbol.toUpperCase() ===
            token.symbol.toUpperCase() &&
            isBaseToken) ||
            (selectedOtherToken?.symbol.toUpperCase() ===
              token.symbol.toUpperCase() &&
              !isBaseToken)
            ? 'grayscale-0 opacity-100'
            : ''
        )}
      />
    </div>
  )
}
