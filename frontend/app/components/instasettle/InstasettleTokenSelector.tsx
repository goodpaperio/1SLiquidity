'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import InstasettleSelectTokenModal from './InstasettleSelectTokenModal'
import { useInstasettleTrades } from '@/app/lib/hooks/useInstasettleTrades'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import tokensListData from '@/app/lib/utils/tokens-list-04-09-2025.json'

// Types for JSON data
type TokenResult = {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
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
  tokenDecimals: number
  tokenSymbol: string
}[] => {
  const allTokens: {
    tokenName: string
    tokenAddress: string
    tokenDecimals: number
    tokenSymbol: string
  }[] = []
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
            tokenDecimals: token.tokenDecimals,
            tokenSymbol: token.tokenSymbol,
          })
        }
      }
    })
  })

  return allTokens
}

// Helper function to merge JSON tokens with CoinGecko data
const mergeTokenData = (
  jsonTokens: {
    tokenName: string
    tokenAddress: string
    tokenDecimals: number
    tokenSymbol: string
  }[],
  coingeckoTokens: TOKENS_TYPE[]
): TOKENS_TYPE[] => {
  const ethWethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

  return jsonTokens.map((jsonToken) => {
    const tokenAddress = jsonToken.tokenAddress.toLowerCase()

    // Special handling for ETH/WETH: prefer WETH over ETH
    let coingeckoToken: TOKENS_TYPE | undefined
    if (tokenAddress === ethWethAddress.toLowerCase()) {
      // Prefer WETH when address matches ETH/WETH
      coingeckoToken =
        coingeckoTokens.find(
          (cgToken) =>
            cgToken.token_address.toLowerCase() === tokenAddress &&
            cgToken.symbol.toLowerCase() === 'weth'
        ) ||
        coingeckoTokens.find(
          (cgToken) => cgToken.token_address.toLowerCase() === tokenAddress
        )
    } else {
      // Find matching CoinGecko token by address
      coingeckoToken = coingeckoTokens.find(
        (cgToken) => cgToken.token_address.toLowerCase() === tokenAddress
      )
    }

    if (coingeckoToken) {
      // Use CoinGecko data if available
      return coingeckoToken
    } else {
      // Create fallback token data for missing CoinGecko tokens
      return {
        name:
          jsonToken.tokenName.charAt(0).toUpperCase() +
          jsonToken.tokenName.slice(1),
        symbol: jsonToken.tokenSymbol,
        icon: `/tokens/${jsonToken.tokenName.toLowerCase()}.svg`,
        popular: false,
        value: 0,
        status: 'increase' as const,
        statusAmount: 0,
        token_address: jsonToken.tokenAddress,
        decimals: jsonToken.tokenDecimals,
        balance: '0',
        possible_spam: false,
        usd_price: 0,
        market_cap_rank: 999999,
        usd_value: 0,
      } as TOKENS_TYPE
    }
  })
}

const defaultBoltConfig = {
  height: '8.5rem',
  color: '#020408',
  outerBorderStrokeWidth: '5',
  outerBorderStrokeColor: '#262626',
  innerBorderStrokeWidth: '1',
  innerBorderStrokeColor: '#020408',
  innerBorderFillColor: '#020408',
}

interface InstasettleTokenSelectorProps {
  onTokenFromChange: (token: TOKENS_TYPE | null) => void
  onTokenToChange: (token: TOKENS_TYPE | null) => void
}

// Clear button component for token selectors
const ClearTokenButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
    className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors"
    title="Clear selection"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  </button>
)

const InstasettleTokenSelector: React.FC<InstasettleTokenSelectorProps> = ({
  onTokenFromChange,
  onTokenToChange,
}) => {
  const [fromToken, setFromToken] = useState<TOKENS_TYPE | null>(null)
  const [toToken, setToToken] = useState<TOKENS_TYPE | null>(null)
  const [boltConfig, setBoltConfig] = useState(defaultBoltConfig)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentInputField, setCurrentInputField] = useState<'from' | 'to'>(
    'from'
  )
  const { isMobile } = useScreenSize()

  // Get instasettle trades data and available tokens
  const { firstTrade } = useInstasettleTrades()
  const { tokens: coingeckoTokens } = useTokenList()

  // Get tokens from JSON and merge with CoinGecko data
  const jsonTokens = getAllTokensFromJson()
  const availableTokens = mergeTokenData(jsonTokens, coingeckoTokens)

  console.log('firstTrade ===>', firstTrade)
  console.log('fromToken ===>', fromToken)
  console.log('toToken ===>', toToken)
  console.log('availableTokens ==>', availableTokens)
  console.log('jsonTokens ==>', jsonTokens)

  // No longer auto-select tokens on mount - start with no filters to show all trades

  const handleTokenSelect = (token: TOKENS_TYPE) => {
    if (currentInputField === 'from') {
      setFromToken(token)
      onTokenFromChange(token)
    } else {
      setToToken(token)
      onTokenToChange(token)
    }
  }

  const handleClearFromToken = () => {
    setFromToken(null)
    onTokenFromChange(null)
  }

  const handleClearToToken = () => {
    setToToken(null)
    onTokenToChange(null)
  }

  const showSelectTokenModal = (isOpen: boolean, field: 'from' | 'to') => {
    setIsModalOpen(isOpen)
    setCurrentInputField(field)
  }

  useEffect(() => {
    if (fromToken && toToken) {
      setBoltConfig({
        ...defaultBoltConfig,
        color: '#33F498',
        outerBorderStrokeColor: '#40f798',
        height: '7.5rem',
        innerBorderStrokeWidth: '2',
        innerBorderStrokeColor: '#020408',
        innerBorderFillColor: '#020408',
      })
    } else if (fromToken) {
      setBoltConfig({
        ...defaultBoltConfig,
        outerBorderStrokeColor: 'url(#leftGradient)',
        height: '8.5rem',
        innerBorderStrokeWidth: '1.5',
        innerBorderStrokeColor: '#020408',
        innerBorderFillColor: '#020408',
      })
    } else if (toToken) {
      setBoltConfig({
        ...defaultBoltConfig,
        outerBorderStrokeColor: 'url(#rightGradient)',
        height: '8.5rem',
        innerBorderStrokeWidth: '1.5',
        innerBorderStrokeColor: '#020408',
        innerBorderFillColor: '#020408',
      })
    } else {
      setBoltConfig(defaultBoltConfig)
    }
  }, [fromToken, toToken])

  return (
    <>
      <div className="bg-gray-900 flex items-center justify-center p-4 relative mb-10">
        <div className={cn('flex items-center gap-0 w-full max-w-xl')}>
          {fromToken && (
            <Image
              src="/assets/left-strokes.svg"
              alt="valid"
              className={`h-full md:block hidden left-[6.5rem] absolute top-0 blink-animation`}
              width={100}
              height={100}
            />
          )}
          <div
            className={cn(
              'w-full min-h-[53px] md:min-h-[51px] rounded-l-[15px] p-[2px] relative -right-[2px]',
              fromToken && toToken
                ? 'bg-primary'
                : fromToken
                ? 'bg-primary'
                : 'bg-neutral-800'
            )}
          >
            <div
              className={cn(
                'flex justify-center items-center w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-6 rounded-l-[13px]',
                fromToken
                  ? 'bg-gradient-to-r from-[#071310] to-[#062118] dotsbg'
                  : 'bg-[#0D0D0D]'
              )}
            >
              {fromToken ? (
                <div
                  className={cn(
                    'min-w-[120px] sm:min-w-[165px] max-sm:relative max-sm:right-[10px] group w-fit h-12 rounded-[25px] p-[2px]',
                    fromToken ? 'bg-borderGradient' : 'bg-[#373D3F]'
                  )}
                >
                  <div
                    className="min-w-[120px] sm:min-w-[165px] overflow-hidden w-fit h-full bg-[#0D0D0D] group-hover:bg-tabsGradient transition-colors duration-300 p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold"
                    onClick={() => showSelectTokenModal(true, 'from')}
                  >
                    <div className="flex items-center w-fit h-fit">
                      <div className="mr-2.5 relative">
                        <Image
                          src={
                            (fromToken.symbol.toLowerCase() === 'usdt'
                              ? '/tokens/usdt.svg'
                              : fromToken.icon) || '/icons/token.svg'
                          }
                          alt={fromToken.name || ''}
                          width={32}
                          height={32}
                          className="w-8 h-8 overflow-hidden object-cover rounded-full"
                          onError={(e) => {
                            // If the token image fails to load, use a fallback
                            const target = e.target as HTMLImageElement
                            target.src = '/icons/default-token.svg'
                          }}
                        />
                      </div>
                      <p>{fromToken.symbol || ''}</p>
                    </div>
                    <ClearTokenButton onClick={handleClearFromToken} />
                  </div>
                </div>
              ) : (
                <div
                  className="min-w-[120px] sm:min-w-[165px] max-sm:right-[10px] relative w-fit h-12 bg-primaryGradient hover:opacity-85 py-[13px] px-[20px] gap-[14px] flex rounded-[25px] items-center justify-between text-black cursor-pointer uppercase font-bold"
                  onClick={() => showSelectTokenModal(true, 'from')}
                >
                  <p>{isMobile ? 'Token' : 'Select Token'}</p>
                  <Image
                    src="/icons/arrow-down-black.svg"
                    alt="arrow-down"
                    className="w-fit h-fit"
                    width={20}
                    height={20}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Cover for top pin */}
          {(!fromToken || !toToken) && (
            <div
              className="absolute bg-[#020407] w-10 h-4 z-[51]"
              style={{
                left: '50.5%',
                transform: 'translateX(-50%)',
                top: '0',
              }}
            />
          )}
          {fromToken && toToken && (
            <div
              className="absolute bg-[#020407] w-10 h-4 z-[51]"
              style={{
                left: '50.5%',
                transform: 'translateX(-50%)',
                top: '0',
              }}
            />
          )}

          <svg
            width="37"
            height="114"
            viewBox="-4 -4 45 122"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-1/2 top-1/2 z-50 flex items-center justify-center"
            style={{
              transform: 'translate(-50%, -50%)',
              width: '3.3rem',
              height: boltConfig.height,
            }}
          >
            <defs>
              <linearGradient
                id="leftGradient"
                x1="0%"
                y1="50%"
                x2="100%"
                y2="50%"
              >
                <stop offset="0%" stopColor="#40f798" />
                <stop offset="50%" stopColor="#40f798" />
                <stop offset="51%" stopColor="#262626" />
                <stop offset="100%" stopColor="#262626" />
              </linearGradient>
              <linearGradient
                id="rightGradient"
                x1="100%"
                y1="50%"
                x2="0%"
                y2="50%"
              >
                <stop offset="0%" stopColor="#40f798" />
                <stop offset="50%" stopColor="#40f798" />
                <stop offset="51%" stopColor="#262626" />
                <stop offset="100%" stopColor="#262626" />
              </linearGradient>
            </defs>

            {/* Left side of bolt */}
            <path
              d="M24.5681 1.18613C24.612 0.608638 23.8031 0.430899 23.6009 0.97364L0.733023 62.3743C0.61658 62.687 0.833176 63.0238 1.16596 63.0476L13.9898 63.9636C14.2697 63.9836 14.4783 64.2299 14.452 64.5092L9.85446 113.248"
              fill="transparent"
              stroke={fromToken ? '#40f798' : '#262626'}
              strokeWidth="5"
            />

            {/* Right side of bolt */}
            <path
              d="M9.85446 113.248C9.79994 113.826 10.6086 114.017 10.8184 113.476L36.4638 47.326C36.5851 47.0133 36.3701 46.6722 36.0356 46.6467L21.6898 45.5539C21.4145 45.533 21.2083 45.2928 21.2292 45.0174L24.5681 1.18613"
              fill="transparent"
              stroke={toToken ? '#40f798' : '#262626'}
              strokeWidth="5"
            />

            {/* Middle padding path */}
            <path
              d="M24.5681 1.18613C24.612 0.608638 23.8031 0.430899 23.6009 0.97364L0.733023 62.3743C0.61658 62.687 0.833176 63.0238 1.16596 63.0476L13.9898 63.9636C14.2697 63.9836 14.4783 64.2299 14.452 64.5092L9.85446 113.248C9.79994 113.826 10.6086 114.017 10.8184 113.476L36.4638 47.326C36.5851 47.0133 36.3701 46.6722 36.0356 46.6467L21.6898 45.5539C21.4145 45.533 21.2083 45.2928 21.2292 45.0174L24.5681 1.18613Z"
              fill={boltConfig.innerBorderFillColor}
              stroke={boltConfig.innerBorderStrokeColor}
              strokeWidth={boltConfig.innerBorderStrokeWidth}
              strokeLinecap="round"
            />

            {/* Main lightning bolt */}
            <path
              d="M24.5681 1.18613C24.612 0.608638 23.8031 0.430899 23.6009 0.97364L0.733023 62.3743C0.61658 62.687 0.833176 63.0238 1.16596 63.0476L13.9898 63.9636C14.2697 63.9836 14.4783 64.2299 14.452 64.5092L9.85446 113.248C9.79994 113.826 10.6086 114.017 10.8184 113.476L36.4638 47.326C36.5851 47.0133 36.3701 46.6722 36.0356 46.6467L21.6898 45.5539C21.4145 45.533 21.2083 45.2928 21.2292 45.0174L24.5681 1.18613Z"
              fill={boltConfig.color}
            />
          </svg>

          {/* Cover for bottom pin */}
          {(!fromToken || !toToken) && (
            <div
              className="absolute bg-[#020407] w-10 h-4 z-[51]"
              style={{
                left: '49.5%',
                transform: 'translateX(-50%)',
                bottom: '0',
              }}
            />
          )}
          {fromToken && toToken && (
            <div
              className="absolute bg-[#020407] w-10 h-4 z-[51]"
              style={{
                left: '49.5%',
                transform: 'translateX(-50%)',
                bottom: '0',
              }}
            />
          )}

          <div
            className={cn(
              'w-full min-h-[53px] md:min-h-[51px] rounded-r-[15px] p-[2px] relative -left-[2px]',
              fromToken && toToken
                ? 'bg-primary'
                : toToken
                ? 'bg-primary'
                : 'bg-neutral-800'
            )}
          >
            <div
              className={cn(
                'flex justify-center items-center w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-6 rounded-r-[13px]',
                toToken
                  ? 'bg-gradient-to-r from-[#071310] to-[#062118] dotsbg'
                  : 'bg-[#0D0D0D]'
              )}
            >
              {toToken ? (
                <div
                  className={cn(
                    'min-w-[120px] sm:min-w-[165px] group w-fit h-12 rounded-[25px] p-[2px] relative max-sm:left-[10px]',
                    toToken ? 'bg-borderGradient' : 'bg-[#373D3F]'
                  )}
                >
                  <div
                    className="min-w-[120px] sm:min-w-[165px] overflow-hidden w-fit h-full bg-[#0D0D0D] group-hover:bg-tabsGradient transition-colors duration-300 p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold"
                    onClick={() => showSelectTokenModal(true, 'to')}
                  >
                    <div className="flex items-center w-fit h-fit">
                      <div className="mr-2.5 relative">
                        <Image
                          src={
                            (toToken.symbol.toLowerCase() === 'usdt'
                              ? '/tokens/usdt.svg'
                              : toToken.icon) || '/icons/token.svg'
                          }
                          alt={toToken.name || ''}
                          width={32}
                          height={32}
                          className="w-8 h-8 overflow-hidden object-cover rounded-full"
                          onError={(e) => {
                            // If the token image fails to load, use a fallback
                            const target = e.target as HTMLImageElement
                            target.src = '/icons/default-token.svg'
                          }}
                        />
                      </div>
                      <p>{toToken.symbol || ''}</p>
                    </div>
                    <ClearTokenButton onClick={handleClearToToken} />
                  </div>
                </div>
              ) : (
                <div
                  className="min-w-[120px] sm:min-w-[165px] relative max-sm:left-[10px] w-fit h-12 bg-primaryGradient hover:opacity-85 py-[13px] px-[20px] gap-[14px] flex rounded-[25px] items-center justify-between text-black cursor-pointer uppercase font-bold"
                  onClick={() => showSelectTokenModal(true, 'to')}
                >
                  <p>{isMobile ? 'Token' : 'Select Token'}</p>
                  <Image
                    src="/icons/arrow-down-black.svg"
                    alt="arrow-down"
                    className="w-fit h-fit"
                    width={20}
                    height={20}
                  />
                </div>
              )}
            </div>
          </div>
          {toToken && (
            <Image
              src="/assets/right-strokes.svg"
              alt="valid"
              className={`h-full md:block hidden right-[6.5rem] absolute top-0 blink-animation`}
              width={100}
              height={100}
            />
          )}
        </div>
      </div>

      <InstasettleSelectTokenModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTokenSelect={handleTokenSelect}
        selectedToken={currentInputField === 'from' ? fromToken : toToken}
        currentInputField={currentInputField}
        otherSelectedToken={currentInputField === 'from' ? toToken : fromToken}
        availableTokens={availableTokens}
      />
    </>
  )
}

export default InstasettleTokenSelector
