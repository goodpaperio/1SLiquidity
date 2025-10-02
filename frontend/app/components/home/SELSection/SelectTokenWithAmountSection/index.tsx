import InputAmount from '@/app/components/inputAmount'
import { TOKENS } from '@/app/lib/constants'
import { useModal } from '@/app/lib/context/modalContext'
import { useSidebar } from '@/app/lib/context/sidebarContext'
import Image from 'next/image'
import { useState, useEffect, useMemo, useRef } from 'react'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWalletTokens } from '@/app/lib/hooks/useWalletTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { motion, AnimatePresence } from 'framer-motion'

interface InputAmountProps {
  amount: number
  setAmount: any
  inValidAmount?: boolean
  inputRef?: any
  inputField: 'from' | 'to'
  onInputFocus?: () => void
  disabled?: boolean
  isLoading?: boolean
  isBuySection?: boolean
  isSellSection?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
}

// Get the correct token icon
const getTokenIcon = (token: TOKENS_TYPE) => {
  if (token.symbol.toLowerCase() === 'usdt') {
    return '/tokens/usdt.png'
  }
  return token.icon
}

// Top Tokens component that shows popular tokens on hover
const TopTokens = ({
  tokens,
  isVisible,
  onTokenSelect,
  selectedTokenFrom,
  selectedTokenTo,
  inputField,
}: {
  tokens: TOKENS_TYPE[]
  isVisible: boolean
  onTokenSelect: (token: TOKENS_TYPE) => void
  selectedTokenFrom: TOKENS_TYPE | null
  selectedTokenTo: TOKENS_TYPE | null
  inputField: 'from' | 'to'
}) => {
  // Get only 5 tokens, exclude STETH, and reverse the array to display from right to left
  const tokensToShow = [...tokens]
    .filter((token) => token.symbol.toLowerCase() !== 'steth')
    .slice(0, 5)
    .reverse()

  // Function to check if a token should be disabled
  const isTokenDisabled = (token: TOKENS_TYPE) => {
    if (inputField === 'from' && selectedTokenTo) {
      return token.token_address === selectedTokenTo.token_address
    }
    if (inputField === 'to' && selectedTokenFrom) {
      return token.token_address === selectedTokenFrom.token_address
    }
    return false
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute -top-[1.9rem] right-0 flex flex-row-reverse gap-1 items-center z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {tokensToShow.map((token: TOKENS_TYPE, index) => {
            const disabled = isTokenDisabled(token)
            return (
              <motion.div
                key={token.token_address || index}
                className={`cursor-pointer relative group ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  transition: {
                    delay: index * 0.1,
                    duration: 0.3,
                    ease: 'easeOut',
                  },
                }}
                exit={{
                  opacity: 0,
                  x: 20,
                  scale: 0.8,
                  transition: {
                    delay: (tokensToShow.length - index - 1) * 0.05,
                    duration: 0.2,
                    ease: 'easeIn',
                  },
                }}
                whileHover={{
                  scale: disabled ? 1 : 1.1,
                  transition: { duration: 0.2 },
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) {
                    onTokenSelect(token)
                  }
                }}
              >
                <div
                  className={`w-7 h-7 rounded-full p-[2px] bg-neutral-700 overflow-hidden border border-neutral-700 shadow-lg ${
                    disabled ? 'grayscale' : ''
                  }`}
                >
                  <Image
                    src={getTokenIcon(token) || '/icons/default-token.svg'}
                    alt={token.name || ''}
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/icons/default-token.svg'
                    }}
                  />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const SelectTokenWithAmountSection: React.FC<InputAmountProps> = ({
  amount,
  setAmount,
  inValidAmount,
  inputRef,
  inputField,
  onInputFocus,
  disabled,
  isLoading,
  isBuySection,
  isInsufficientBalance,
  setIsInsufficientBalance,
  isSellSection,
}) => {
  const {
    showSelectTokenModal,
    selectedTokenFrom,
    selectedTokenTo,
    setSelectedTokenFrom,
    setSelectedTokenTo,
  } = useModal()
  const { address, isConnected } = useAppKitAccount()

  const {
    tokens: walletTokens,
    isLoading: isLoadingTokens,
    rawTokens,
  } = useWalletTokens(address)

  // Get token list from useTokenList hook
  const { tokens: allTokens, isLoading: isLoadingTokenList } = useTokenList()

  const [showTooltip, setShowTooltip] = useState(false)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [showTopTokens, setShowTopTokens] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      inputField === 'from' &&
      amount !== 0 &&
      amount > parseFloat(tokenBalance)
    ) {
      setIsInsufficientBalance?.(true)
    } else {
      setIsInsufficientBalance?.(false)
    }
  }, [amount, tokenBalance, inputField, setIsInsufficientBalance])

  // Get the appropriate token based on which input field this is
  const selectedToken =
    inputField === 'from' ? selectedTokenFrom : selectedTokenTo

  // Get the token from the other section to filter it out
  const otherSectionToken =
    inputField === 'from' ? selectedTokenTo : selectedTokenFrom

  // Get top tokens sorted by popularity or market cap
  const topTokens = useMemo(() => {
    if (!allTokens || allTokens.length === 0) return []

    // Find WETH first
    const weth = allTokens.find(
      (token: TOKENS_TYPE) => token.symbol.toLowerCase() === 'weth'
    )

    // Filter out STETH but keep selected tokens
    const filteredTokens = allTokens.filter((token: TOKENS_TYPE) => {
      // Skip STETH
      if (token.symbol.toLowerCase() === 'steth') {
        return false
      }
      // Skip WETH as we'll add it separately
      if (token.symbol.toLowerCase() === 'weth') {
        return false
      }
      return true
    })

    // First try to find the popular tokens
    const popular = filteredTokens.filter((token: TOKENS_TYPE) => token.popular)

    // If we have WETH, add it at the start of the list
    const topTokensList = weth ? [weth, ...popular] : popular

    if (topTokensList.length >= 5) {
      return topTokensList.slice(0, 5)
    }

    // If not enough popular tokens, sort by market cap (using usd_price as a proxy)
    const byMarketCap = [...filteredTokens].sort(
      (a: TOKENS_TYPE, b: TOKENS_TYPE) =>
        (b.usd_price || 0) - (a.usd_price || 0)
    )

    // Combine WETH with market cap sorted tokens
    const finalList = weth ? [weth, ...byMarketCap] : byMarketCap
    return finalList.slice(0, 5)
  }, [allTokens, selectedTokenFrom, selectedTokenTo])

  // Find matching wallet token when selected token changes
  const matchingWalletToken = useMemo(() => {
    if (!selectedToken || !walletTokens.length) return null

    // Case 1: ETH special handling - look for WETH token (since ETH uses WETH address for trading)
    if (selectedToken.symbol.toLowerCase() === 'eth') {
      return walletTokens.find(
        (token) =>
          token.token_address ===
            '0x0000000000000000000000000000000000000000' ||
          token.symbol === 'ETH'
      )
    }

    // Case 2: Normal token match by address
    const addressMatch = walletTokens.find(
      (token) =>
        token.token_address &&
        selectedToken.token_address &&
        token.token_address.toLowerCase() ===
          selectedToken.token_address.toLowerCase()
    )

    if (addressMatch) return addressMatch

    // Case 3: Symbol match as fallback (less reliable)
    return walletTokens.find(
      (token) =>
        token.symbol.toLowerCase() === selectedToken.symbol.toLowerCase()
    )
  }, [selectedToken, walletTokens])

  // Update token balance whenever matching wallet token changes
  useEffect(() => {
    if (matchingWalletToken) {
      const balance =
        parseFloat(matchingWalletToken.balance) /
        Math.pow(10, matchingWalletToken.decimals)
      setTokenBalance(balance.toFixed(6))
    } else {
      setTokenBalance('0')
    }
  }, [matchingWalletToken])

  // Handle token selection
  const handleSelectToken = () => {
    showSelectTokenModal(true, inputField)
  }

  // Handle quick token selection
  const handleQuickTokenSelect = (token: TOKENS_TYPE) => {
    if (inputField === 'from') {
      setSelectedTokenFrom(token)
    } else {
      setSelectedTokenTo(token)
    }
    setShowTopTokens(false)
  }

  // Handle token deselection
  const handleClearToken = () => {
    if (inputField === 'from') {
      setSelectedTokenFrom(null)
    } else {
      setSelectedTokenTo(null)
    }
  }

  // Get token balance - uses the pre-calculated state value for efficiency
  const getTokenBalance = () => {
    const balance = parseFloat(tokenBalance)
    if (balance === 0) return '0'

    // For very small numbers, show more decimal places
    if (balance < 0.0001) {
      return balance.toFixed(8).replace(/\.?0+$/, '') // Remove trailing zeros
    }

    // For normal numbers, use 4 decimal places
    return balance.toFixed(4)
  }

  // Set the amount to the max available balance (for "sell" field only)
  const handleSetMaxAmount = () => {
    if (inputField === 'from' && selectedToken) {
      const maxBalance = parseFloat(tokenBalance)
      if (maxBalance > 0) {
        setAmount(maxBalance)
      }
    }
  }

  // Calculate token balance value in USD
  const getTokenBalanceUSD = () => {
    if (!selectedToken) return 0

    const balance = parseFloat(tokenBalance)

    // For ETH, use WETH price since they have the same value
    if (selectedToken.symbol.toLowerCase() === 'eth') {
      const wethToken = allTokens.find(
        (token: TOKENS_TYPE) => token.symbol.toLowerCase() === 'weth'
      )
      if (wethToken && wethToken.usd_price) {
        return (balance * wethToken.usd_price).toFixed(2)
      }
    }

    if (!selectedToken.usd_price) return 0
    return (balance * selectedToken.usd_price).toFixed(2)
  }

  // Format token price for display
  const formatTokenPrice = () => {
    if (!selectedToken || !selectedToken.usd_price) return '--'
    return `$${selectedToken.usd_price.toFixed(2)}`
  }

  // Check if MAX button should be shown
  const shouldShowMaxButton = () => {
    return (
      inputField === 'from' &&
      parseFloat(tokenBalance) > 0 &&
      !isLoadingTokens &&
      isConnected
    )
  }

  return (
    <div className="w-full">
      <div className="w-full flex gap-4 items-center justify-between mt-[12px]">
        {/* amount */}
        <div className="flex-1">
          <InputAmount
            inputRef={inputRef}
            amount={amount}
            inValidAmount={inValidAmount}
            setAmount={(val: any) => {
              setAmount(val)
            }}
            onInputFocus={onInputFocus}
            disable={disabled}
            isLoading={isLoading}
            isBuySection={isBuySection}
            isSellSection={isSellSection}
          />
        </div>

        {/* select token */}
        {selectedToken ? (
          <div
            className={`min-w-[165px] group w-fit h-12 rounded-[25px] p-[2px] ${
              amount > 0 && !inValidAmount && !isBuySection
                ? ' bg-borderGradient'
                : 'bg-[#373D3F]'
            }`}
            ref={buttonRef}
          >
            <div
              className="min-w-[165px] overflow-hidden w-fit h-full bg-[#0D0D0D] group-hover:bg-[#2a2a2a] transition-colors duration-300 p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold"
              onClick={handleSelectToken}
            >
              <div className="flex items-center w-fit h-fit">
                <div className="mr-2.5 relative">
                  <Image
                    src={getTokenIcon(selectedToken) || '/icons/token.svg'}
                    alt={selectedToken.name || ''}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain rounded-full overflow-hidden"
                    onError={(e) => {
                      // If the token image fails to load, use a fallback
                      const target = e.target as HTMLImageElement
                      target.src = '/icons/default-token.svg'
                    }}
                  />
                  <Image
                    src="/tokens/ether.png"
                    alt="Ethereum"
                    width={24}
                    height={24}
                    className="absolute -right-1.5 -bottom-1.5 rounded-md w-[1.15rem] h-[1.15rem] border-[2px] border-black"
                  />
                </div>
                <p>{selectedToken.symbol || ''}</p>
              </div>
              <Image
                src="/icons/arrow-down-white.svg"
                alt="close"
                className="w-fit h-fit mr-4"
                width={20}
                height={20}
              />
            </div>

            {/* We don't show top tokens when a token is already selected */}
          </div>
        ) : (
          <div
            onClick={handleSelectToken}
            className="min-w-[165px] bg-[linear-gradient(90deg,_#40FCB4_0%,_#41F58C_21.95%,_#40FCB4_48.58%,_#41F58C_71.52%,_#40FCB4_100%)] relative w-fit h-12 hover:opacity-85 py-[13px] px-[20px] gap-[14px] flex rounded-[25px] items-center justify-between text-black cursor-pointer uppercase font-bold"
            onMouseEnter={() => setShowTopTokens(true)}
            onMouseLeave={() => setShowTopTokens(false)}
            ref={buttonRef}
          >
            <p>Select Token</p>
            <Image
              src="/icons/arrow-down-black.svg"
              alt="arrow-down"
              className="w-fit h-fit"
              width={20}
              height={20}
            />

            {/* Top tokens displayed on hover (only when no token is selected) */}
            <TopTokens
              tokens={topTokens}
              isVisible={
                showTopTokens && !isLoadingTokenList && topTokens.length > 0
              }
              onTokenSelect={handleQuickTokenSelect}
              selectedTokenFrom={selectedTokenFrom}
              selectedTokenTo={selectedTokenTo}
              inputField={inputField}
            />
          </div>
        )}
      </div>

      {/* bottom section */}
      <div className="mt-2 w-full flex justify-between gap-3 items-center">
        {isLoading ? (
          <Skeleton className="h-4 w-10 mt-4" />
        ) : (
          <>
            <p
              className={`${
                inValidAmount ? 'text-primaryRed' : 'text-primary'
              }`}
            >
              {selectedToken
                ? (() => {
                    // For ETH, use WETH price since they have the same value
                    if (selectedToken.symbol.toLowerCase() === 'eth') {
                      const wethToken = allTokens.find(
                        (token: TOKENS_TYPE) =>
                          token.symbol.toLowerCase() === 'weth'
                      )
                      if (wethToken && wethToken.usd_price) {
                        return `$${(amount * wethToken.usd_price).toFixed(2)}`
                      }
                    }

                    return selectedToken.usd_price
                      ? `$${(amount * selectedToken.usd_price).toFixed(2)}`
                      : `$${amount}`
                  })()
                : `$${amount}`}
            </p>
          </>
        )}

        <div className="flex gap-1.5 items-center">
          {selectedToken && (
            <>
              <Image
                src={'/icons/wallet.svg'}
                alt="price"
                className="w-4 h-4"
                width={16}
                height={16}
              />
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                {isLoadingTokens ? (
                  <p className="text-white flex items-center">
                    <span className="inline-block w-3 h-3 border-t-2 border-primary animate-spin rounded-full mr-1"></span>
                    Loading...
                  </p>
                ) : (
                  <p className="text-white">{getTokenBalance()}</p>
                )}
                {showTooltip &&
                  parseFloat(getTokenBalance()) > 0 &&
                  selectedToken.usd_price > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
                      ≈ ${getTokenBalanceUSD()}
                    </div>
                  )}
              </div>
              <p className="uppercase text-white">{selectedToken.symbol}</p>

              {/* Max button - only visible for the "from" input and when balance > 0 */}
              {shouldShowMaxButton() && (
                <button
                  onClick={handleSetMaxAmount}
                  className="ml-1 text-xs bg-white005 hover:bg-neutral-800 text-primary px-2 py-0.5 rounded-md transition-colors"
                >
                  MAX
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SelectTokenWithAmountSection
