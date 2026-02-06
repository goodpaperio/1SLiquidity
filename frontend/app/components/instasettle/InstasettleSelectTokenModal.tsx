import Image from 'next/image'
import Modal from '../modal'
import { useState, useEffect, useRef } from 'react'
import SearchbarWithIcon from '../searchbarWithIcon'
import useDebounce from '@/app/lib/hooks/useDebounce'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useToast } from '@/app/lib/context/toastProvider'
import { formatWalletAddress } from '@/app/lib/helper'
import { useWalletTokens } from '@/app/lib/hooks/useWalletTokens'
import { CheckIcon, ChevronDown, CopyIcon } from 'lucide-react'
import { useInstasettleTrades } from '@/app/lib/hooks/useInstasettleTrades'

// Chain name mapping for display purposes
const CHAIN_NAMES: { [key: string]: string } = {
  '1': 'Ethereum',
}

// Mapping from chain IDs to Moralis chain identifiers
const CHAIN_ID_TO_MORALIS: { [key: string]: string } = {
  '1': 'eth',
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

type InstasettleSelectTokenModalProps = {
  isOpen: boolean
  onClose: () => void
  onTokenSelect: (token: TOKENS_TYPE) => void
  selectedToken?: TOKENS_TYPE | null
  currentInputField: 'from' | 'to'
  otherSelectedToken?: TOKENS_TYPE | null
  availableTokens: TOKENS_TYPE[]
}

const InstasettleSelectTokenModal: React.FC<
  InstasettleSelectTokenModalProps
> = ({
  isOpen,
  onClose,
  onTokenSelect,
  selectedToken,
  currentInputField,
  otherSelectedToken,
  availableTokens,
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [tokenFilter, setTokenFilter] = useState<'all' | 'my'>('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debouncedSearchValue = useDebounce(searchValue, 300)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  const { address } = useAppKitAccount()
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]
  const chainName = CHAIN_NAMES[chainId] || 'Unknown Chain'

  const { addToast } = useToast()

  // Get instasettle trades data
  const {
    availableTokenAddresses,
    isLoading: isLoadingTrades,
    error: tradesError,
    trades,
  } = useInstasettleTrades()

  // Get wallet tokens for the current chain
  const { tokens: walletTokens, isLoading: isLoadingWalletTokens } =
    useWalletTokens(address, CHAIN_ID_TO_MORALIS[chainId] || 'eth')

  const handleCopy = (
    e: React.MouseEvent<HTMLDivElement | SVGSVGElement>,
    address: string
  ) => {
    e.stopPropagation()
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 1000)
  }

  // Get token addresses for from and to sections based on trades
  const getTokenAddressesForSection = () => {
    const tokenInAddresses = new Set<string>()
    const tokenOutAddresses = new Set<string>()

    trades.forEach((trade) => {
      if (
        trade.isInstasettlable &&
        trade.instasettlements.length === 0 &&
        trade.cancellations.length === 0
      ) {
        tokenInAddresses.add(trade.tokenIn.toLowerCase())
        tokenOutAddresses.add(trade.tokenOut.toLowerCase())
      }
    })

    return {
      tokenInAddresses: Array.from(tokenInAddresses),
      tokenOutAddresses: Array.from(tokenOutAddresses),
    }
  }

  // Filter tokens to only show those available in instasettle trades for the current section
  const getFilteredTokens = () => {
    const { tokenInAddresses, tokenOutAddresses } =
      getTokenAddressesForSection()

    // Filter tokens based on current input field
    const allowedAddresses =
      currentInputField === 'from' ? tokenInAddresses : tokenOutAddresses

    let filteredTokens = availableTokens.filter((token) =>
      allowedAddresses.includes(token.token_address.toLowerCase())
    )

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
      otherSelectedToken &&
      token.token_address === otherSelectedToken.token_address
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

    onTokenSelect(token)
    onClose()
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
    return (
      otherSelectedToken &&
      token.token_address === otherSelectedToken.token_address
    )
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

  const isLoading = isLoadingWalletTokens || isLoadingTrades
  const hasError = tradesError

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

        {/* Error message */}
        {hasError && (
          <div className="mb-4 p-3 bg-red-900/20 rounded-lg border border-red-600/30">
            <p className="text-red-400 text-sm">
              There was an error loading the instasettle trades for {chainName}
            </p>
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
                  const isSelected =
                    selectedToken?.token_address === token.token_address
                  const disabled = isTokenDisabled(token)
                  return (
                    <div
                      key={ind}
                      onClick={() => !disabled && handleSelectToken(token)}
                      className={`w-full flex items-center min-h-[62px] ${
                        disabled || isSelected
                          ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                          : 'hover:bg-neutral-800 cursor-pointer'
                      } px-[10px] gap-[12px] rounded-[15px] transition-colors`}
                    >
                      <div className="relative h-fit">
                        <Image
                          src={getTokenIcon(token)}
                          alt={token.name}
                          className={`w-[40px] h-[40px] rounded-full ${
                            disabled || isSelected ? 'grayscale' : ''
                          }`}
                          width={40}
                          height={40}
                          onError={handleImageError}
                        />
                        {(disabled || isSelected) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                            <span className="text-xs text-white">
                              {disabled ? 'Already Selected' : 'Selected'}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[20px] text-white">
                    {currentInputField === 'from' ? 'From Tokens' : 'To Tokens'}
                  </p>
                  <span className="text-sm text-gray">
                    ({getFilteredTokens().length} token
                    {getFilteredTokens().length > 1 ? 's' : ''})
                  </span>
                </div>
                {/* {address && (
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
                )} */}
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
                    No {currentInputField === 'from' ? 'from' : 'to'} tokens
                    found on {chainName}
                  </div>
                ) : (
                  getFilteredTokens().map((token: TOKENS_TYPE, ind: number) => {
                    const isSelected =
                      selectedToken?.token_address === token.token_address
                    const disabled = isTokenDisabled(token)
                    return (
                      <div
                        key={ind}
                        onClick={() => !disabled && handleSelectToken(token)}
                        className={`w-full flex items-center min-h-[62px] ${
                          disabled || isSelected
                            ? 'opacity-50 cursor-not-allowed bg-neutral-900'
                            : 'hover:bg-neutral-900 cursor-pointer'
                        } px-[10px] gap-[12px] rounded-[15px] transition-all duration-300`}
                      >
                        <div className="relative h-fit">
                          <Image
                            src={getTokenIcon(token)}
                            alt={token.name}
                            className={`w-[40px] h-[40px] rounded-full ${
                              disabled || isSelected ? 'grayscale' : ''
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
                          {(disabled || isSelected) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                              <span className="text-xs text-white">
                                {disabled ? 'Already Selected' : 'Selected'}
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

export default InstasettleSelectTokenModal
