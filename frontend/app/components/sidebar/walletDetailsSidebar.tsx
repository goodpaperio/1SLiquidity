'use client'

import { TOKENS } from '@/app/lib/constants'
import { formatWalletAddress } from '@/app/lib/helper'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Sidebar from '.'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useWalletTokens, TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { calculateWalletBalance } from '@/app/lib/wallet-details/moralis'
// import { calculateWalletBalance } from '@/app/lib/wallet-details/infura'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { SwitchOffIcon } from '@/app/lib/icons'
import { CircleCheckBigIcon, CopyIcon, X } from 'lucide-react'
import { useDisconnect } from '@reown/appkit/react'
import JazzAvatar from '../shared/JazzAvatar'
import ImageFallback from '@/app/shared/ImageFallback'

// Token Skeleton component for loading state
const TokenSkeleton = () => {
  return (
    <div className="w-full flex items-center justify-between border border-white14 bg-white005 p-4 rounded-[15px] animate-pulse">
      <div className="flex gap-[12px]">
        <div className="w-[40px] h-[40px] rounded-full bg-neutral-800" />
        <div>
          <div className="h-[18px] w-24 bg-neutral-800 rounded mb-2" />
          <div className="h-[14px] w-16 bg-neutral-800 rounded" />
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="h-[16px] w-24 bg-neutral-800 rounded mb-2" />
        <div className="h-[14px] w-16 bg-neutral-800 rounded" />
      </div>
    </div>
  )
}

type WalletDetailsSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

// Chain name mapping for display purposes
const CHAIN_NAMES: { [key: string]: string } = {
  '1': 'Ethereum',
  // '42161': 'Arbitrum One',
  // '137': 'Polygon',
  // '56': 'BNB Chain',
  // Add more chains as needed
}

// Mapping from chain IDs to chain identifiers
const CHAIN_ID_TO_PLATFORM: { [key: string]: string } = {
  '1': 'eth',
  // '42161': 'arbitrum',
  // '137': 'polygon',
  // '56': 'bsc',
  // Add more chains as needed
}

const WalletDetailsSidebar: React.FC<WalletDetailsSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const [totalBalance, setTotalBalance] = useState<number | null>(null)
  // Track average percentage change across tokens
  const [averagePercentChange, setAveragePercentChange] = useState<
    number | null
  >(null)
  const [dayChange, setDayChange] = useState<number | null>(null)
  const [showCopied, setShowCopied] = useState(false)

  const { address, isConnected, caipAddress, status, embeddedWalletInfo } =
    useAppKitAccount()
  const { disconnect } = useDisconnect()

  const disconnectWallet = async () => {
    await disconnect()
    onClose()
  }

  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]

  // Map chainId to Moralis chain format
  const chain = CHAIN_ID_TO_PLATFORM[chainId] || 'eth'

  // Use the hook with React Query to fetch wallet tokens for the selected chain
  const {
    tokens: walletTokens,
    rawTokens,
    isLoading: isLoadingTokens,
    error: tokensError,
    refetch,
    isFetching,
  } = useWalletTokens(address, chain)

  // Fetch token list for conversion
  const { tokens: tokenList, isLoading: isLoadingTokensList } = useTokenList()

  // Calculate total balance whenever token data changes
  useEffect(() => {
    if (rawTokens.length > 0 && !tokensError) {
      const balance = calculateWalletBalance(rawTokens)
      setTotalBalance(balance)

      // Calculate average percentage change
      let totalPercentChange = 0
      let tokensWithPriceData = 0

      rawTokens.forEach((token) => {
        if (token.usd_price && token.statusAmount !== undefined) {
          totalPercentChange +=
            token.statusAmount * (token.status === 'decrease' ? -1 : 1)
          tokensWithPriceData++
        }
      })

      if (tokensWithPriceData > 0) {
        const avgChange = totalPercentChange / tokensWithPriceData
        setAveragePercentChange(avgChange)

        // Calculate estimated $ change based on percentage
        const estimatedChange = balance * (avgChange / 100)
        setDayChange(estimatedChange)
      } else {
        setAveragePercentChange(null)
        setDayChange(null)
      }
    } else if (rawTokens.length === 0 && !isLoadingTokens && !tokensError) {
      // If we have no tokens but the query completed successfully, set balance to 0
      setTotalBalance(0)
      setAveragePercentChange(null)
      setDayChange(null)
    }
  }, [rawTokens, tokensError, isLoadingTokens])

  // Flag to determine if we're showing real tokens or fallback tokens
  const isShowingRealTokens = walletTokens.length > 0 && !tokensError

  // Display fallback tokens if there's an error or no tokens
  const displayTokens = isShowingRealTokens ? walletTokens : TOKENS

  // Format currency for display
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    setTotalBalance(null)
    await refetch()
  }

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address)
        setShowCopied(true)
        setTimeout(() => setShowCopied(false), 1000) // Show tick for 1 second
      } catch (err) {
        console.error('Failed to copy address:', err)
      }
    }
  }

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      {/* close icon */}
      <div
        onClick={onClose}
        className="bg-[#232624] cursor-pointer rounded-full p-1.5 absolute top-[1.9rem] -left-[0.7rem] z-50 group hover:bg-[#373D3F] transition-all duration-300"
      >
        {/* <Image
          src={'/icons/close.svg'}
          alt="close"
          className="w-2"
          width={1000}
          height={1000}
          onClick={onClose}
        /> */}
        <X className="w-3 h-3 text-[#666666] group-hover:text-white transition-all duration-300" />
      </div>

      {/* main content */}
      <div className="relative max-h-[90vh] overflow-hidden overflow-y-auto">
        <div className="flex justify-between gap-2 items-center h-full sticky bg-black top-0 py-6 z-40">
          <div className="flex gap-2 items-center">
            {/* <div className="relative h-fit">
                  <Image
                    src={'/icons/token.svg'}
                    alt="coin"
                    className="w-8 h-8"
                    width={1000}
                    height={1000}
                  />
                  <Image
                    src="/icons/token-icon.svg"
                    alt="token symbol"
                    className="w-4 h-4 absolute bottom-0 right-0"
                    width={200}
                    height={200}
                  />
                </div> */}
            <JazzAvatar address={address || ''} diameter={30} />
            <div className="flex items-center gap-2">
              <p className="text-white">
                {formatWalletAddress(address || 'GY68234nasmd234asfKT21')}
              </p>
              <button
                onClick={handleCopyAddress}
                className="hover:opacity-80 transition-opacity"
                title="Copy address"
              >
                {showCopied ? (
                  <CircleCheckBigIcon className="w-4 h-4 text-primary" />
                ) : (
                  <CopyIcon className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
          {/* <Image
                src={'/icons/switchoff.svg'}
                alt="close"
                className="w-6 cursor-pointer"
                width={1000}
                height={1000}
                onClick={onClose}
              /> */}
          <div
            className="p-0.5 rounded-md group hover:bg-[#222121] transition-all duration-300"
            onClick={disconnectWallet}
          >
            <SwitchOffIcon className="w-6 cursor-pointer text-[#808080] transition-all duration-300" />
          </div>
        </div>

        {/* Chain Indicator */}
        {/* <div className="mt-4 flex justify-between items-center">
              <div className="flex items-center">
                <div className="text-sm text-white px-2 py-1 bg-neutral-800 rounded-full flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                  {chainName}
                </div>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoadingTokens || isFetching}
                className="flex items-center gap-1 text-sm text-white hover:text-white p-2 bg-white005 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  src={'/icons/refresh.svg'}
                  alt="refresh"
                  className={`w-4 h-4 text-white ${
                    isFetching ? 'animate-spin' : ''
                  }`}
                  width={16}
                  height={16}
                />
                Refresh
              </button>
            </div> */}

        {/* wallet amount details */}
        <div className="pb-6">
          <div className="">
            {isLoadingTokens || isFetching ? (
              <p className="text-[24px] font-bold">Loading balance...</p>
            ) : tokensError ? (
              <p className="text-[24px] font-bold text-primaryRed">
                Error loading balance
              </p>
            ) : (
              <p className="text-[36px] font-bold">
                {formatCurrency(totalBalance)}
              </p>
            )}
            {/* progress */}
            <div className="flex gap-1.5 text-white text-[14px]">
              {averagePercentChange !== null && dayChange !== null ? (
                <>
                  <Image
                    src={
                      averagePercentChange >= 0
                        ? '/icons/progress-up.svg'
                        : '/icons/progress-down.svg'
                    }
                    alt="progress"
                    className="w-2.5"
                    width={1000}
                    height={1000}
                  />
                  <p
                    className={
                      averagePercentChange >= 0
                        ? 'text-primary'
                        : 'text-primaryRed'
                    }
                  >
                    {formatCurrency(Math.abs(dayChange || 0))} (
                    {Math.abs(averagePercentChange).toFixed(2)}%)
                  </p>
                  <p>Today</p>
                </>
              ) : (
                <p>No price change data available</p>
              )}
            </div>
          </div>

          {/* LP Positions */}
          {/* <div className="mt-7 bg-white005 py-4 px-3.5 rounded-[15px]">
                <div className="flex text-white gap-1 items-center">
                  <p className="">LP Positions</p>
                  <Image
                    src={'/icons/right-arrow.svg'}
                    alt="arrow-lp"
                    className="w-3 mt-1"
                    width={1000}
                    height={1000}
                  />
                </div>
                <p className="text-[20px]">$999,999.99</p>
                <div className="flex gap-1 text-white">
                  <p className="">Reward: </p>
                  <p className="">$22.39 </p>
                </div>
              </div> */}

          {/* tokens section */}
          <div className="mt-[34px]">
            <p className="text-[20px]">Tokens</p>
            <div className="flex flex-col gap-2.5 my-[13px]">
              {isLoadingTokens || isFetching ? (
                <>
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                  <TokenSkeleton />
                </>
              ) : tokensError ? (
                <div className="text-center p-6 rounded-[15px] border border-primaryRed/30 bg-primaryRed/10">
                  <p className="text-primaryRed mb-2">
                    Error loading tokens: {tokensError.message}
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="text-sm bg-primaryRed/20 hover:bg-primaryRed/30 px-4 py-2 rounded-md text-white transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : walletTokens.length === 0 ? (
                <div className="text-center p-6 rounded-[15px] border border-white14 bg-white005">
                  <p className="text-white mb-1">No tokens found</p>
                  <p className="text-white52 text-sm">
                    Connect your wallet or switch networks to view your tokens
                  </p>
                </div>
              ) : (
                displayTokens
                  .map((token, ind) => {
                    // Skip tokens with no price data or insufficient liquidity
                    if (!isShowingRealTokens && ind > 5) {
                      return null // Limit fallback tokens to 5
                    }

                    // Only show tokens that have price data or are native tokens
                    const hasValidPriceData =
                      ((token as TOKENS_TYPE)?.usd_price ?? 0) > 0 ||
                      ((token as TOKENS_TYPE)?.token_address ?? '') ===
                        '0x0000000000000000000000000000000000000000' ||
                      parseFloat((token as TOKENS_TYPE)?.balance ?? '0') > 0 // Show tokens with balance

                    if (isShowingRealTokens && !hasValidPriceData) {
                      return null
                    }

                    return (
                      <div
                        key={ind}
                        className="w-full flex items-center justify-between border border-white14 bg-white005 hover:bg-neutral-800 p-4 rounded-[15px] cursor-pointer hover:bg-tabsGradient transition-all duration-300"
                      >
                        <div className="flex gap-[12px]">
                          <div className="relative h-fit">
                            <ImageFallback
                              src={
                                token.symbol.toLocaleLowerCase() === 'weth'
                                  ? 'https://assets.coingecko.com/coins/images/2518/large/weth.png'
                                  : token.icon
                              }
                              alt={token.name}
                              className="w-[40px] h-[40px] rounded-full overflow-hidden object-cover"
                              width={1000}
                              height={1000}
                            />
                            <Image
                              src="/tokens/ether.png"
                              alt="Ethereum"
                              width={24}
                              height={24}
                              className="absolute -right-1.5 -bottom-1.5 rounded-md w-[1.35rem] h-[1.35rem] border-[2px] border-black"
                            />
                          </div>
                          <div>
                            <p className="text-[18px] p-0 leading-tight">
                              {token.symbol}
                            </p>
                            <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                              {typeof token.value === 'number'
                                ? `${token.value.toFixed(6)} ${token.symbol}`
                                : `${(
                                    parseFloat(
                                      (token as TOKENS_TYPE)?.balance ?? '0'
                                    ) /
                                    Math.pow(
                                      10,
                                      (token as TOKENS_TYPE)?.decimals ?? 18
                                    )
                                  ).toFixed(6)} ${token.symbol}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          {isShowingRealTokens &&
                          'usd_price' in token &&
                          ((token as TOKENS_TYPE)?.usd_price ?? 0) > 0 ? (
                            <>
                              <p className="text-[16px] p-0 leading-tight text-white text-right">
                                {formatCurrency(
                                  ((token as TOKENS_TYPE)?.usd_price ?? 0) *
                                    (parseFloat(
                                      (token as TOKENS_TYPE)?.balance ?? '0'
                                    ) /
                                      Math.pow(
                                        10,
                                        (token as TOKENS_TYPE)?.decimals ?? 18
                                      ))
                                )}
                              </p>
                              <div className="flex gap-1 items-center">
                                <Image
                                  src={
                                    token.status == 'increase'
                                      ? '/icons/progress-up.svg'
                                      : '/icons/progress-down.svg'
                                  }
                                  alt="progress"
                                  className="w-2"
                                  width={1000}
                                  height={1000}
                                />
                                <p
                                  className={`text-[14px] ${
                                    token.status == 'increase'
                                      ? 'text-primary'
                                      : 'text-primaryRed'
                                  }`}
                                >
                                  {`${(token.statusAmount || 0).toFixed(2)}%`}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-[16px] p-0 leading-tight text-white text-right">
                                {'token_address' in token &&
                                ((token as TOKENS_TYPE)?.token_address ??
                                  '') ===
                                  '0x0000000000000000000000000000000000000000'
                                  ? // Find WETH in tokens array if this is ETH
                                    (() => {
                                      const wethToken = displayTokens.find(
                                        (t) => t.symbol === 'WETH'
                                      ) as TOKENS_TYPE
                                      if (
                                        token.symbol === 'ETH' &&
                                        wethToken?.usd_price
                                      ) {
                                        return formatCurrency(
                                          wethToken.usd_price *
                                            (parseFloat(
                                              (token as TOKENS_TYPE)?.balance ??
                                                '0'
                                            ) /
                                              Math.pow(
                                                10,
                                                (token as TOKENS_TYPE)
                                                  ?.decimals ?? 18
                                              ))
                                        )
                                      }
                                      return 'usd_price' in token &&
                                        ((token as TOKENS_TYPE)?.usd_price ??
                                          0) > 0
                                        ? formatCurrency(
                                            ((token as TOKENS_TYPE)
                                              ?.usd_price ?? 0) *
                                              (parseFloat(
                                                (token as TOKENS_TYPE)
                                                  ?.balance ?? '0'
                                              ) /
                                                Math.pow(
                                                  10,
                                                  (token as TOKENS_TYPE)
                                                    ?.decimals ?? 18
                                                ))
                                          )
                                        : 'No price data'
                                    })()
                                  : parseFloat(
                                      (token as TOKENS_TYPE)?.balance ?? '0'
                                    ) > 0
                                  ? `Balance: ${(
                                      parseFloat(
                                        (token as TOKENS_TYPE)?.balance ?? '0'
                                      ) /
                                      Math.pow(
                                        10,
                                        (token as TOKENS_TYPE)?.decimals ?? 18
                                      )
                                    ).toFixed(4)}`
                                  : 'No price data'}
                              </p>
                              <div className="flex gap-1 items-center">
                                <p className="text-[14px] text-white text-right">
                                  {'token_address' in token &&
                                  ((token as TOKENS_TYPE)?.token_address ??
                                    '') ===
                                    '0x0000000000000000000000000000000000000000'
                                    ? (() => {
                                        const wethToken = displayTokens.find(
                                          (t) => t.symbol === 'WETH'
                                        ) as TOKENS_TYPE
                                        if (
                                          token.symbol === 'ETH' &&
                                          wethToken?.usd_price
                                        ) {
                                          return (
                                            <span className="flex gap-1 items-center">
                                              <Image
                                                src={
                                                  wethToken.status ===
                                                  'increase'
                                                    ? '/icons/progress-up.svg'
                                                    : '/icons/progress-down.svg'
                                                }
                                                alt="progress"
                                                className="w-2"
                                                width={1000}
                                                height={1000}
                                              />
                                              <span
                                                className={
                                                  wethToken.status ===
                                                  'increase'
                                                    ? 'text-primary'
                                                    : 'text-primaryRed'
                                                }
                                              >
                                                {`${(
                                                  wethToken.statusAmount || 0
                                                ).toFixed(2)}%`}
                                              </span>
                                            </span>
                                          )
                                        }
                                        return 'usd_price' in token &&
                                          ((token as TOKENS_TYPE)?.usd_price ??
                                            0) > 0 ? (
                                          <span className="flex gap-1 items-center">
                                            <Image
                                              src={
                                                token.status == 'increase'
                                                  ? '/icons/progress-up.svg'
                                                  : '/icons/progress-down.svg'
                                              }
                                              alt="progress"
                                              className="w-2"
                                              width={1000}
                                              height={1000}
                                            />
                                            <span
                                              className={
                                                token.status == 'increase'
                                                  ? 'text-primary'
                                                  : 'text-primaryRed'
                                              }
                                            >
                                              {`${(
                                                token.statusAmount || 0
                                              ).toFixed(2)}%`}
                                            </span>
                                          </span>
                                        ) : (
                                          'No price data'
                                        )
                                      })()
                                    : token.symbol === 'ZONE'
                                    ? 'No price data available'
                                    : parseFloat(
                                        (token as TOKENS_TYPE)?.balance ?? '0'
                                      ) > 0
                                    ? 'No price data'
                                    : isShowingRealTokens
                                    ? 'Insufficient liquidity'
                                    : 'Demo data'}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })
                  .filter(Boolean) // Filter out null values
              )}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}

export default WalletDetailsSidebar
