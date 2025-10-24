import Image from 'next/image'
import Modal from '.'
import { useState, useEffect, useRef } from 'react'
import SearchbarWithIcon from '../searchbarWithIcon'
import { TOKENS } from '@/app/lib/constants'
import useDebounce from '@/app/lib/hooks/useDebounce'
import { useModal } from '@/app/lib/context/modalContext'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useToast } from '@/app/lib/context/toastProvider'
import { formatWalletAddress } from '@/app/lib/helper'
import { useWalletTokens } from '@/app/lib/hooks/useWalletTokens'
import { CheckIcon, ChevronDown, CopyIcon } from 'lucide-react'
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

// Chain name mapping for display purposes
const CHAIN_NAMES: { [key: string]: string } = {
  '1': 'Ethereum',
  // '42161': 'Arbitrum One',
  // '137': 'Polygon',
  // '56': 'BNB Chain',
}

// Mapping from chain IDs to Moralis chain identifiers
const CHAIN_ID_TO_MORALIS: { [key: string]: string } = {
  '1': 'eth',
  // '42161': 'arbitrum',
  // '137': 'polygon',
  // '56': 'bsc',
}

// Base tokens that will be shown as popular tokens
const BASE_TOKENS = ['ETH', 'USDC', 'USDT', 'WBTC', 'WETH', 'DAI']

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

// Helper function to merge JSON tokens with CoinGecko data
const mergeTokenData = (
  jsonTokens: { tokenName: string; tokenAddress: string }[],
  coingeckoTokens: TOKENS_TYPE[]
): TOKENS_TYPE[] => {
  return jsonTokens.map((jsonToken) => {
    // Find matching CoinGecko token by address
    const coingeckoToken = coingeckoTokens.find(
      (cgToken) =>
        cgToken.token_address.toLowerCase() ===
        jsonToken.tokenAddress.toLowerCase()
    )

    if (coingeckoToken) {
      // Use CoinGecko data if available
      return coingeckoToken
    } else {
      // Create fallback token data for missing CoinGecko tokens
      return {
        name:
          jsonToken.tokenName.charAt(0).toUpperCase() +
          jsonToken.tokenName.slice(1),
        symbol: jsonToken.tokenName.toUpperCase(),
        icon: `/tokens/${jsonToken.tokenName.toLowerCase()}.svg`,
        popular: false,
        value: 0,
        status: 'increase' as const,
        statusAmount: 0,
        token_address: jsonToken.tokenAddress,
        decimals: 18, // Default decimals
        balance: '0',
        possible_spam: false,
        usd_price: 0,
        market_cap_rank: 999999,
        usd_value: 0,
      } as TOKENS_TYPE
    }
  })
}

// Token Skeleton component for loading state
const TokenSkeleton = () => {
  return (
    <div className="w-full flex items-center min-h-[62px] px-[10px] gap-[12px] rounded-[15px] animate-pulse">
      <div className="w-[40px] h-[40px] rounded-full bg-neutral-800" />
      <div className="flex-1">
        <div className="h-[18px] w-24 bg-neutral-800 rounded mb-2" />
        <div className="h-[14px] w-16 bg-neutral-800 rounded" />
      </div>
      <div className="text-right">
        <div className="h-[14px] w-16 bg-neutral-800 rounded mb-2" />
        <div className="h-[12px] w-12 bg-neutral-800 rounded" />
      </div>
    </div>
  )
}

// Popular Token Skeleton component
const PopularTokenSkeleton = () => {
  return (
    <div className="min-w-[64px] flex flex-col justify-center items-center w-fit h-[72px] bg-white005 px-[10px] gap-[6px] border-[2px] border-primary rounded-[15px] animate-pulse">
      <div className="w-[24px] h-[24px] rounded-full bg-neutral-800 mt-1" />
      <div className="h-[14px] w-12 bg-neutral-800 rounded" />
    </div>
  )
}

type SelectTokenModalProps = {
  isOpen: boolean
  onClose: () => void
}

const SelectTokenModal: React.FC<SelectTokenModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [tokenFilter, setTokenFilter] = useState<'all' | 'my'>('all')
  const [selectedBaseToken, setSelectedBaseToken] = useState<string | null>(
    null
  )
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debouncedSearchValue = useDebounce(searchValue, 300)
  const {
    currentInputField,
    setSelectedTokenFrom,
    setSelectedTokenTo,
    selectedTokenFrom,
    selectedTokenTo,
  } = useModal()

  const { address } = useAppKitAccount()
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]
  const chainName = CHAIN_NAMES[chainId] || 'Unknown Chain'
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const { addToast } = useToast()

  const handleCopy = (
    e: React.MouseEvent<HTMLDivElement | SVGSVGElement>,
    address: string
  ) => {
    e.stopPropagation()
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 1000) // show check for 2s
  }

  // Get wallet tokens for the current chain
  const { tokens: walletTokens, isLoading: isLoadingWalletTokens } =
    useWalletTokens(address, CHAIN_ID_TO_MORALIS[chainId] || 'eth')

  // Use token list from our enhanced hook that fetches from CoinGecko API with caching
  const { tokens: availableTokens, isLoading, error, refetch } = useTokenList()

  // console.log('Modal - Available Tokens:', availableTokens)
  // console.log('Modal - Wallet Tokens:', walletTokens)

  // Determine which base token to filter by
  useEffect(() => {
    // Check if the other field has a base token selected
    const otherFieldToken =
      currentInputField === 'from' ? selectedTokenTo : selectedTokenFrom

    if (
      otherFieldToken &&
      BASE_TOKENS.includes(otherFieldToken.symbol.toUpperCase())
    ) {
      // setSelectedBaseToken(otherFieldToken.symbol.toUpperCase())
      // Normalize ETH/WETH to use WETH for filtering since they have the same address
      let baseTokenSymbol = otherFieldToken.symbol.toUpperCase()
      if (baseTokenSymbol === 'ETH') {
        baseTokenSymbol = 'WETH'
      }
      setSelectedBaseToken(baseTokenSymbol)
    } else {
      // Check if any token from results is selected in the other field
      if (otherFieldToken) {
        const allJsonTokens = getAllTokensFromJson()
        const isJsonToken = allJsonTokens.some(
          (jsonToken) =>
            jsonToken.tokenAddress.toLowerCase() ===
            otherFieldToken.token_address.toLowerCase()
        )

        if (isJsonToken) {
          // Show all tokens if a non-base token from results is selected
          setSelectedBaseToken(null)
        }
      }
    }
  }, [currentInputField, selectedTokenFrom, selectedTokenTo])

  // Get filtered JSON tokens based on selected base token
  const getFilteredJsonTokens = () => {
    if (selectedBaseToken) {
      return getTokensForBaseToken(selectedBaseToken)
    }
    return getAllTokensFromJson()
  }

  // Create display tokens by merging JSON tokens with CoinGecko data
  const createDisplayTokens = () => {
    const jsonTokens = getFilteredJsonTokens()
    const mergedTokens = mergeTokenData(jsonTokens, availableTokens)

    return mergedTokens.map((token: TOKENS_TYPE) => {
      // Find matching wallet token to get balance
      const walletToken = walletTokens.find(
        (wt) =>
          wt.token_address.toLowerCase() === token.token_address.toLowerCase()
      )

      // Convert balance to proper decimal value
      const rawBalance = walletToken ? walletToken.balance : '0'
      const balance = walletToken
        ? (parseFloat(rawBalance) / Math.pow(10, token.decimals)).toString()
        : '0'

      // Calculate USD value using the converted balance
      const usd_value = walletToken ? parseFloat(balance) * token.usd_price : 0

      return {
        ...token,
        balance,
        usd_value,
      } as TOKENS_TYPE
    })
  }

  const displayTokens = createDisplayTokens()

  // console.log('Modal - Display Tokens:', displayTokens)
  // console.log('Number of Display Tokens:', displayTokens.length)
  // console.log('Selected Base Token:', selectedBaseToken)
  // Log available tokens to check WETH price
  // console.log(
  //   'Available Tokens:',
  //   availableTokens.filter(
  //     (t: TOKENS_TYPE) => t.symbol.toLowerCase() === 'weth'
  //   )
  // )
  // console.log(
  //   'Wallet Tokens:',
  //   walletTokens.filter((t: TOKENS_TYPE) => t.symbol.toLowerCase() === 'weth')
  // )
  // console.log(
  //   'Display Tokens:',
  //   displayTokens.filter((t: TOKENS_TYPE) => t.symbol.toLowerCase() === 'weth')
  // )

  // Function to format balance based on decimals
  const formatTokenBalance = (balance: string, decimals: number) => {
    const parsedBalance = parseFloat(balance)
    if (isNaN(parsedBalance)) return '0'

    // For small numbers (less than 0.00001), use scientific notation
    if (parsedBalance > 0 && parsedBalance < 0.00001) {
      return parsedBalance.toExponential(2)
    }

    // For normal numbers, use standard formatting
    return parsedBalance.toLocaleString(undefined, {
      minimumFractionDigits: Math.min(decimals, 5),
      maximumFractionDigits: Math.min(decimals, 5),
    })
  }

  // Function to format USD value
  const formatUsdValue = (value: number) => {
    if (value === 0) return '$0.00'
    if (value < 0.01) return '<$0.01'
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  // Function to handle token selection
  const handleSelectToken = (token: TOKENS_TYPE) => {
    // Check if this token is already selected in the other field
    if (
      currentInputField === 'from' &&
      selectedTokenTo &&
      token.token_address === selectedTokenTo.token_address
    ) {
      addToast(
        <div className="flex items-center">
          <div className="mr-2 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>Cannot select the same token in both fields</div>
        </div>
      )
      return
    } else if (
      currentInputField === 'to' &&
      selectedTokenFrom &&
      token.token_address === selectedTokenFrom.token_address
    ) {
      addToast(
        <div className="flex items-center">
          <div className="mr-2 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>Cannot select the same token in both fields</div>
        </div>
      )
      return
    }

    // Proceed with normal token selection
    if (currentInputField === 'from') {
      setSelectedTokenFrom(token)
    } else if (currentInputField === 'to') {
      setSelectedTokenTo(token)
    }
    onClose()
  }

  // Filter tokens based on search and make sure we don't show the already selected token in the other field
  const getFilteredTokens = () => {
    let filteredTokens = displayTokens

    // Remove duplicate tokens (keep the one with higher balance)
    filteredTokens = Object.values(
      filteredTokens.reduce(
        (acc: { [key: string]: TOKENS_TYPE }, token: TOKENS_TYPE) => {
          const lowerAddress = token.token_address?.toLowerCase() || ''
          if (!lowerAddress) {
            return acc
          }
          if (
            !acc[lowerAddress] ||
            parseFloat(token.balance) > parseFloat(acc[lowerAddress].balance)
          ) {
            acc[lowerAddress] = token
          }
          return acc
        },
        {}
      )
    )

    // Apply search filter if search value exists
    if (debouncedSearchValue) {
      const searchLower = debouncedSearchValue.toLowerCase()
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) =>
          token.name.toLowerCase().includes(searchLower) ||
          token.symbol.toLowerCase().includes(searchLower) ||
          token.token_address.toLowerCase() === searchLower
      )
    }

    // Filter by "My tokens" if selected and wallet is connected
    if (tokenFilter === 'my' && address) {
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) => parseFloat(token.balance) > 0
      )
    }

    // Don't show the token already selected in the other input
    if (currentInputField === 'from' && selectedTokenTo) {
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) =>
          token.token_address !== selectedTokenTo.token_address
      )
    } else if (currentInputField === 'to' && selectedTokenFrom) {
      filteredTokens = filteredTokens.filter(
        (token: TOKENS_TYPE) =>
          token.token_address !== selectedTokenFrom.token_address
      )
    }

    // Sort tokens by market value (usd_price * balance) and popularity
    return filteredTokens.sort((a: TOKENS_TYPE, b: TOKENS_TYPE) => {
      // First, prioritize user's holdings
      const aValue = parseFloat(a.balance) * (a.usd_price || 0)
      const bValue = parseFloat(b.balance) * (b.usd_price || 0)

      // If user has balance of both tokens, prioritize higher value holdings
      if (aValue > 0 && bValue > 0) {
        return bValue - aValue
      }

      // If one token has balance, prioritize it
      if (aValue > 0) return -1
      if (bValue > 0) return 1

      // For tokens without balance, first check if they're major stablecoins or WBTC
      const isAMajorToken = ['USDT', 'USDC', 'DAI', 'WBTC'].includes(a.symbol)
      const isBMajorToken = ['USDT', 'USDC', 'DAI', 'WBTC'].includes(b.symbol)

      if (isAMajorToken && !isBMajorToken) return -1
      if (!isAMajorToken && isBMajorToken) return 1

      // If both or neither are major tokens, use market cap rank
      const aRank = a.market_cap_rank || 999999
      const bRank = b.market_cap_rank || 999999

      // If market cap ranks are significantly different, use them
      if (Math.abs(aRank - bRank) > 5) {
        return aRank - bRank
      }

      // For similar market cap ranks, factor in price and popularity
      const aMarketScore = (a.usd_price || 0) + (a.popular ? 1000000 : 0)
      const bMarketScore = (b.usd_price || 0) + (b.popular ? 1000000 : 0)

      return bMarketScore - aMarketScore
    })
  }

  // Get base tokens as popular tokens
  const getPopularTokens = () => {
    const baseTokens: TOKENS_TYPE[] = []

    // Create base tokens with CoinGecko data if available
    BASE_TOKENS.forEach((baseTokenSymbol) => {
      // Try to find the base token in our available tokens
      const foundToken = availableTokens.find(
        (token: TOKENS_TYPE) => token.symbol.toUpperCase() === baseTokenSymbol
      )

      if (foundToken) {
        // Find matching wallet token to get balance
        const walletToken = walletTokens.find(
          (wt) =>
            wt.token_address.toLowerCase() ===
            foundToken.token_address.toLowerCase()
        )

        const rawBalance = walletToken ? walletToken.balance : '0'
        const balance = walletToken
          ? (
              parseFloat(rawBalance) / Math.pow(10, foundToken.decimals)
            ).toString()
          : '0'

        const usd_value = walletToken
          ? parseFloat(balance) * foundToken.usd_price
          : 0

        baseTokens.push({
          ...foundToken,
          balance,
          usd_value,
        } as TOKENS_TYPE)
      } else {
        // Create fallback base token if not found in CoinGecko
        baseTokens.push({
          name: baseTokenSymbol,
          symbol: baseTokenSymbol,
          icon: `/tokens/${baseTokenSymbol.toLowerCase()}.svg`,
          popular: true,
          value: 0,
          status: 'increase' as const,
          statusAmount: 0,
          token_address: '', // Will be filled from JSON if available
          decimals:
            baseTokenSymbol === 'USDT' || baseTokenSymbol === 'USDC' ? 6 : 18,
          balance: '0',
          possible_spam: false,
          usd_price: 0,
          market_cap_rank: 999999,
          usd_value: 0,
        } as TOKENS_TYPE)
      }
    })

    return baseTokens
  }

  // Handle base token selection from popular tokens
  const handleBaseTokenSelect = (baseToken: TOKENS_TYPE) => {
    if (BASE_TOKENS.includes(baseToken.symbol.toUpperCase())) {
      // If it's a base token, just select it normally
      handleSelectToken(baseToken)
    }
  }

  // Handle image loading errors
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement, Event>
  ) => {
    e.currentTarget.src = '/icons/default-token.svg'
  }

  // Get the correct token icon
  const getTokenIcon = (token: TOKENS_TYPE) => {
    if (token.symbol.toLowerCase() === 'usdt') {
      return '/tokens/usdt.png'
    }
    return token.icon
  }

  // Check if a token should be disabled (already selected in the other field)
  const isTokenDisabled = (token: TOKENS_TYPE) => {
    if (currentInputField === 'from' && selectedTokenTo) {
      return token.token_address === selectedTokenTo.token_address
    } else if (currentInputField === 'to' && selectedTokenFrom) {
      return token.token_address === selectedTokenFrom.token_address
    }
    return false
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 pb-0 h-full">
        <div className="flex justify-between gap-2 h-full">
          <div className="text-xl font-medium">Select a Token</div>
          <Image
            src={'/icons/close.svg'}
            alt="close"
            className="w-3 cursor-pointer"
            width={1000}
            height={1000}
            onClick={onClose}
          />
        </div>

        {/* Network information */}
        {/* <div className="mt-2 mb-4 flex items-center">
          <div className="text-sm text-white px-2 py-1 bg-neutral-800 rounded-full flex items-center">
            <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
            {chainName}
          </div>
        </div> */}

        {/* searchbar */}
        <div className="my-4 flex gap-2 items-center">
          <SearchbarWithIcon
            onChange={(e) => setSearchValue(e.target.value)}
            value={searchValue}
            setValue={(e: any) => setSearchValue(e)}
            placeholder="Search tokens"
          />
          <div className="flex items-center h-[40px] hover:bg-neutral-800 border-[2px] border-primary rounded-[10px] px-2 py-2 transition-colors">
            <Image
              src="/tokens/ether.png"
              alt="Ethereum"
              width={28}
              height={28}
              className="rounded-md"
            />
          </div>
        </div>

        {/* Error message and retry button */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 rounded-lg border border-red-600/30">
            <p className="text-red-400 text-sm mb-2">
              There was an error loading the token list for {chainName}
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm bg-red-600/30 hover:bg-red-600/50 px-3 py-1 rounded-md text-white"
            >
              Retry
            </button>
          </div>
        )}

        {searchValue && <p className="text-[20px] text-gray">Search Results</p>}
        {debouncedSearchValue.length > 0 ? (
          <>
            <div className="flex flex-col gap-1 my-[13px] h-[55vh] overflow-y-auto scrollbar-hide">
              {isLoading ? (
                <>
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                </>
              ) : getFilteredTokens().length === 0 ? (
                <div className="text-center p-4 text-white">
                  No tokens found matching "{debouncedSearchValue}" on{' '}
                  {chainName}
                </div>
              ) : (
                getFilteredTokens().map((token: TOKENS_TYPE, ind: number) => {
                  const disabled = isTokenDisabled(token)
                  return (
                    <div
                      key={ind}
                      onClick={() => !disabled && handleSelectToken(token)}
                      className={`w-full flex items-center min-h-[62px] ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                          : 'hover:bg-neutral-800 cursor-pointer'
                      } px-[10px] gap-[12px] rounded-[15px] transition-colors`}
                    >
                      <div className="relative h-fit">
                        <Image
                          src={getTokenIcon(token)}
                          alt={token.name}
                          className={`w-[40px] h-[40px] rounded-full ${
                            disabled ? 'grayscale' : ''
                          }`}
                          width={40}
                          height={40}
                          onError={handleImageError}
                        />
                        {disabled && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                            <span className="text-xs text-white">Selected</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[18px] p-0 leading-tight">
                          {token.name}
                        </p>
                        <div className="flex items-center gap-1">
                          <p className="text-[14px] uppercase text-[#adadad] p-0 leading-tight">
                            {token.symbol}
                          </p>
                          {token.token_address && (
                            <div className="flex items-center gap-1">
                              <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                                {formatWalletAddress(token.token_address)}
                              </p>
                              {copiedAddress === token.token_address ? (
                                <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <CopyIcon
                                  className="w-3.5 h-3.5 cursor-pointer hover:text-gray-400"
                                  onClick={(e) =>
                                    handleCopy(e, token.token_address)
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {address && parseFloat(token.balance) > 0 && (
                        <div className="text-right">
                          <p className="text-[14px] text-white">
                            {formatUsdValue(token.usd_value || 0)}
                          </p>
                          <p className="text-[12px] text-gray">
                            {formatTokenBalance(token.balance, token.decimals)}{' '}
                            {token.symbol}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <></>
        )}

        {!(searchValue.length > 0) && (
          <div className="h-full">
            <div className="h-[55vh] overflow-y-auto scrollbar-hide pb-5">
              <div className="flex gap-1 my-[13px] overflow-x-auto scrollbar-hide">
                {isLoading ? (
                  <>
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                    <PopularTokenSkeleton />
                  </>
                ) : (
                  getPopularTokens().map((token: TOKENS_TYPE, ind: number) => {
                    const disabled = isTokenDisabled(token)
                    const isFilteringByThisToken =
                      selectedBaseToken === token.symbol.toUpperCase()
                    return (
                      <div
                        key={ind}
                        onClick={() =>
                          !disabled && handleBaseTokenSelect(token)
                        }
                        className={`min-w-[64px] flex flex-col justify-center items-center w-fit h-[72px] ${
                          disabled
                            ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                            : isFilteringByThisToken
                            ? 'bg-primary/20 border-primary hover:bg-primary/30 cursor-pointer'
                            : 'bg-white005 hover:bg-neutral-900 cursor-pointer'
                        } px-[10px] gap-[6px] border-[2px] ${
                          isFilteringByThisToken
                            ? 'border-primary'
                            : 'border-primary'
                        } rounded-[15px] transition-colors`}
                      >
                        <div className="relative mt-1">
                          <Image
                            src={getTokenIcon(token)}
                            alt={token.name}
                            className={`w-[24px] h-[24px] rounded-full ${
                              disabled ? 'grayscale' : ''
                            }`}
                            width={24}
                            height={24}
                            onError={handleImageError}
                          />
                          {disabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                              <span className="text-[8px] text-white">
                                Selected
                              </span>
                            </div>
                          )}
                          {isFilteringByThisToken && !disabled && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-[8px] text-white">✓</span>
                            </div>
                          )}
                        </div>
                        <p
                          className={`${
                            isFilteringByThisToken ? 'text-primary' : ''
                          }`}
                        >
                          {token.symbol}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[20px] text-white">Tokens</p>
                  {selectedBaseToken && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray">filtered by</span>
                      <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                        {/* {selectedBaseToken} */}
                        {(() => {
                          // Get the original token symbol for display
                          const otherFieldToken =
                            currentInputField === 'from'
                              ? selectedTokenTo
                              : selectedTokenFrom
                          return (
                            otherFieldToken?.symbol.toUpperCase() ||
                            selectedBaseToken
                          )
                        })()}
                      </span>
                      <button
                        onClick={() => setSelectedBaseToken(null)}
                        className="text-sm text-gray hover:text-white ml-1"
                        title="Clear filter"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                {address && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="flex items-center gap-2 px-3 py-1 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setIsDropdownOpen(!isDropdownOpen)
                      }}
                    >
                      {tokenFilter === 'all' ? 'All tokens' : 'My tokens'}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-32 py-1 bg-neutral-800 rounded-lg shadow-lg z-50 overflow-hidden">
                        <button
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-700 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setTokenFilter('all')
                            setIsDropdownOpen(false)
                          }}
                        >
                          All tokens
                        </button>
                        <button
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-700 transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setTokenFilter('my')
                            setIsDropdownOpen(false)
                          }}
                        >
                          My tokens
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1 my-[13px]">
                {isLoading ? (
                  <>
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                    <TokenSkeleton />
                  </>
                ) : getFilteredTokens().length === 0 ? (
                  <div className="text-center p-4 text-white">
                    No tokens found on {chainName}
                  </div>
                ) : (
                  getFilteredTokens().map((token: TOKENS_TYPE, ind: number) => {
                    const disabled = isTokenDisabled(token)
                    return (
                      <div
                        key={ind}
                        onClick={() => !disabled && handleSelectToken(token)}
                        className={`w-full flex items-center min-h-[62px] ${
                          disabled
                            ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                            : 'hover:bg-neutral-900 cursor-pointer'
                        } px-[10px] gap-[12px] rounded-[15px] transition-all duration-300`}
                      >
                        <div className="relative h-fit">
                          <Image
                            src={getTokenIcon(token)}
                            alt={token.name}
                            className={`w-[40px] h-[40px] rounded-full ${
                              disabled ? 'grayscale' : ''
                            }`}
                            width={40}
                            height={40}
                            onError={handleImageError}
                          />
                          <Image
                            src="/tokens/ether.png"
                            alt="Ethereum"
                            width={26}
                            height={26}
                            className="absolute -right-1.5 -bottom-1.5 rounded-md w-[1.35rem] h-[1.35rem] border-[2px] border-black"
                          />
                          {disabled && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                              <span className="text-xs text-white">
                                Selected
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-[18px] p-0 leading-tight">
                            {token.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <p className="text-[14px] uppercase text-[#adadad] p-0 leading-tight">
                              {token.symbol}
                            </p>
                            {token.token_address && (
                              <div className="flex items-center gap-2">
                                <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                                  {formatWalletAddress(token.token_address)}
                                </p>
                                {copiedAddress === token.token_address ? (
                                  <CheckIcon className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <CopyIcon
                                    className="w-3.5 h-3.5 cursor-pointer hover:text-gray"
                                    onClick={(e) =>
                                      handleCopy(e, token.token_address)
                                    }
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {address && parseFloat(token.balance) > 0 && (
                          <div className="text-right">
                            <p className="text-[14px] text-white">
                              {formatUsdValue(token.usd_value || 0)}
                            </p>
                            <p className="text-[12px] text-gray">
                              {formatTokenBalance(
                                token.balance,
                                token.decimals
                              )}{' '}
                              {token.symbol}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default SelectTokenModal
