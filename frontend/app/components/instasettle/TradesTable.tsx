'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ArrowRight, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Button from '../button'
import { MOCK_STREAMS } from '@/app/lib/constants/streams'
import Image from 'next/image'
import GlobalStreamSidebar from '../sidebar/globalStreamSidebar'
import { Stream } from '@/app/lib/types/stream'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Trade } from '@/app/lib/graphql/types/trade'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'
import { useInView } from 'react-intersection-observer'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUnits } from 'viem'
import { useCustomTokenList } from '@/app/lib/hooks/useCustomTokensList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { formatRelativeTime } from '@/app/lib/utils/time'
import ImageFallback from '@/app/shared/ImageFallback'
import { useWallet } from '@/app/lib/hooks/useWallet'
import { useAccount } from 'wagmi'
import { useCoreTrading } from '@/app/lib/hooks/useCoreTrading'
import { useSidebar } from '@/app/lib/context/sidebarContext'

// Constants
const LIMIT = 10

// Extended Trade type with calculated fields
interface ExtendedTrade extends Trade {
  effectivePrice: number
  networkFee: number
  amountInUsd: number
  amountOut: number
  tokenInDetails: TOKENS_TYPE | null
  tokenOutDetails: TOKENS_TYPE | null
  formattedAmountRemaining: string
  cost: number
  savings: number
}

const SortIcon = ({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc' | null
}) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`ml-2 ${
      active ? 'opacity-100' : 'opacity-50'
    } group-hover:opacity-100`}
  >
    <path
      d="M6 0L3 4H9L6 0Z"
      fill={direction === 'asc' && active ? '#41fcb4' : 'currentColor'}
    />
    <path
      d="M6 12L3 8H9L6 12Z"
      fill={direction === 'desc' && active ? '#41fcb4' : 'currentColor'}
    />
  </svg>
)

type SortField = 'streams' | 'output' | 'volume' | 'timestamp' | null
type SortDirection = 'asc' | 'desc' | null

interface TradesTableProps {
  selectedTrade: Trade | null
  selectedVolume: number | null
  isChartFiltered: boolean
  onClearSelection: () => void
  selectedTokenFrom?: TOKENS_TYPE | null
  selectedTokenTo?: TOKENS_TYPE | null
  refetchTrades?: () => void
}

const TradesTable = ({
  selectedTrade,
  selectedVolume,
  isChartFiltered,
  onClearSelection,
  selectedTokenFrom,
  selectedTokenTo,
  refetchTrades,
}: TradesTableProps) => {
  const [activeTab, setActiveTab] = useState('all')
  const timeframes = ['1D', '1W', '1M', '1Y', 'ALL']
  const [activeTimeframe, setActiveTimeframe] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [initialStream, setInitialStream] = useState<ExtendedTrade | undefined>(
    undefined
  )
  const { isMobile, isTablet } = useScreenSize()
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const { ref, inView } = useInView()

  // Get token list
  const { tokens: tokenList, isLoading: isLoadingTokenList } =
    useCustomTokenList()

  const { getSigner, isConnected: isConnectedWallet } = useWallet()
  const { address } = useAccount()
  const { placeTrade, loading, instasettle } = useCoreTrading()
  const { showGlobalStreamSidebar, isGlobalStreamSidebarOpen } = useSidebar()

  // Memoize token addresses to prevent unnecessary re-renders
  const tokenFromAddress = useMemo(
    () => selectedTokenFrom?.token_address?.toLowerCase(),
    [selectedTokenFrom?.token_address]
  )
  const tokenToAddress = useMemo(
    () => selectedTokenTo?.token_address?.toLowerCase(),
    [selectedTokenTo?.token_address]
  )

  // Use the useTrades hook for GraphQL queries
  const { trades, isLoading, error, loadMore, refetch } = useTrades({
    first: LIMIT,
    skip: 0,
  })

  useEffect(() => {
    if (inView && !isChartFiltered && !isLoading) {
      loadMore()
    }
  }, [inView, isChartFiltered, isLoading, loadMore])

  // Reset filters and sorting when chart selection changes
  useEffect(() => {
    if (isChartFiltered) {
      setActiveTab('all')
      setActiveTimeframe('ALL')
      setSortField(null)
      setSortDirection(null)
    }
  }, [isChartFiltered])

  const handleSort = (field: SortField) => {
    if (!isChartFiltered) {
      if (sortField === field) {
        // Toggle direction if same field
        if (sortDirection === 'asc') setSortDirection('desc')
        else if (sortDirection === 'desc') {
          setSortField(null)
          setSortDirection(null)
        }
      } else {
        // New field, start with ascending
        setSortField(field)
        setSortDirection('asc')
      }
    }
  }

  // Filter and sort trades
  const displayData = useMemo((): ExtendedTrade[] => {
    if (isChartFiltered) {
      return selectedTrade ? [selectedTrade as ExtendedTrade] : []
    }

    if (!trades.length) return []

    let filteredTrades = [
      ...trades.filter(
        (trade) =>
          trade.isInstasettlable &&
          trade.instasettlements.length === 0 &&
          trade.cancellations.length === 0
      ),
    ].map((trade) => {
      try {
        // Find token information for this trade
        // const tokenIn = tokenList.find(
        //   (t: TOKENS_TYPE) =>
        //     t.token_address?.toLowerCase() === trade.tokenIn?.toLowerCase()
        // )
        // const tokenOut = tokenList.find(
        //   (t: TOKENS_TYPE) =>
        //     t.token_address?.toLowerCase() === trade.tokenOut?.toLowerCase()

        // Special case for ETH/WETH: return the selected token if it matches the address
        // Otherwise, prefer WETH over ETH since most DeFi protocols use WETH
        const findTokenForTrade = (
          address: string,
          selectedToken: TOKENS_TYPE | null
        ) => {
          const ethWethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
          if (address?.toLowerCase() === ethWethAddress) {
            // If there's a selectedToken that matches, use it
            if (
              selectedToken &&
              (selectedToken.symbol.toLowerCase() === 'eth' ||
                selectedToken.symbol.toLowerCase() === 'weth')
            ) {
              return selectedToken
            }
            // Otherwise, prefer WETH over ETH for instasettle trades
            return (
              tokenList.find(
                (t: TOKENS_TYPE) =>
                  t.token_address?.toLowerCase() === address?.toLowerCase() &&
                  t.symbol.toLowerCase() === 'weth'
              ) ||
              tokenList.find(
                (t: TOKENS_TYPE) =>
                  t.token_address?.toLowerCase() === address?.toLowerCase()
              )
            )
          }
          // For all other cases, use normal address matching
          return tokenList.find(
            (t: TOKENS_TYPE) =>
              t.token_address?.toLowerCase() === address?.toLowerCase()
          )
        }

        const tokenIn = findTokenForTrade(
          trade.tokenIn,
          selectedTokenFrom || null
        )
        const tokenOut = findTokenForTrade(
          trade.tokenOut,
          selectedTokenTo || null
        )

        // Format amounts using token decimals - default to 18 decimals if not found
        const formattedAmountIn = tokenIn
          ? formatUnits(BigInt(trade.amountIn || '0'), tokenIn.decimals || 18)
          : '0'

        // Calculate USD values
        const amountInUsd =
          tokenIn && !isNaN(Number(formattedAmountIn))
            ? Number(formattedAmountIn) * (tokenIn.usd_price || 0)
            : 0

        const formattedAmountRemaining = tokenIn
          ? formatUnits(
              BigInt(trade.amountRemaining || '0'),
              tokenIn.decimals || 18
            )
          : '0'

        // Calculate remaining amount out in tokens (what instasettler needs to provide)
        const remainingAmountOut =
          BigInt(trade.minAmountOut) - BigInt(trade.realisedAmountOut)
        const formattedRemainingAmountOut = tokenOut
          ? formatUnits(remainingAmountOut, tokenOut.decimals || 18)
          : '0'

        // Calculate cost in USD (what instasettler needs to pay in tokenOut)
        const costInUsd =
          tokenOut && !isNaN(Number(formattedRemainingAmountOut))
            ? Number(formattedRemainingAmountOut) * (tokenOut.usd_price || 0)
            : 0

        // Calculate network fee (15 basis points = 0.15%)
        const NETWORK_FEE_BPS = BigInt(15)
        const networkFee =
          (BigInt(trade.amountIn) * NETWORK_FEE_BPS) / BigInt(10000)

        // Calculate effective price (tokens out per token in ratio)
        let effectivePriceRatio = 0
        try {
          const amountInAfterFee =
            (BigInt(trade.amountRemaining) *
              (BigInt(10000) - NETWORK_FEE_BPS)) /
            BigInt(10000)

          const amountOutAfterDiscount =
            (remainingAmountOut *
              (BigInt(10000) - BigInt(trade.instasettleBps))) /
            BigInt(10000)

          if (amountInAfterFee > BigInt(0)) {
            const tokenOutDecimals = tokenOut?.decimals || 18
            const tokenInDecimals = tokenIn?.decimals || 18

            const amountOutFloat =
              Number(amountOutAfterDiscount) / Math.pow(10, tokenOutDecimals)
            const amountInFloat =
              Number(amountInAfterFee) / Math.pow(10, tokenInDecimals)

            effectivePriceRatio = amountOutFloat / amountInFloat
          }
        } catch {
          effectivePriceRatio = 0
        }

        // Calculate savings in tokenOut (discount on amountOut)
        const savingsInTokenOut =
          (Number(formattedRemainingAmountOut) * Number(trade.instasettleBps)) /
          10000

        // Calculate savings in USD
        const savingsInUsd =
          tokenOut && !isNaN(savingsInTokenOut)
            ? savingsInTokenOut * (tokenOut.usd_price || 0)
            : 0

        // Update trade object with calculated values
        return {
          ...trade,
          amountOut: Number(remainingAmountOut),
          effectivePrice: isFinite(effectivePriceRatio)
            ? effectivePriceRatio
            : 0,
          networkFee: isFinite(Number(networkFee)) ? Number(networkFee) : 0,
          amountInUsd: isFinite(amountInUsd) ? amountInUsd : 0,
          tokenInDetails: tokenIn || null,
          tokenOutDetails: tokenOut || null,
          formattedAmountRemaining: formattedAmountRemaining,
          cost: isFinite(costInUsd) ? costInUsd : 0,
          savings: isFinite(savingsInUsd) ? savingsInUsd : 0,
        }
      } catch (error) {
        console.error('Error processing trade:', error)
        // Return trade with safe default values if anything fails
        return {
          ...trade,
          effectivePrice: 0,
          networkFee: 0,
          amountInUsd: 0,
          tokenInDetails: null,
          tokenOutDetails: null,
          formattedAmountRemaining: '0',
          cost: 0,
          savings: 0,
        } as ExtendedTrade
      }
    })

    // Apply token filter based on selection state (if not chart filtered)
    // - Both null: show all trades
    // - Only from selected: filter by tokenIn
    // - Only to selected: filter by tokenOut
    // - Both selected: filter by both tokenIn and tokenOut
    if ((tokenFromAddress || tokenToAddress) && !isChartFiltered) {
      filteredTrades = filteredTrades.filter((trade) => {
        const matchesFrom = tokenFromAddress
          ? trade.tokenIn?.toLowerCase() === tokenFromAddress
          : true
        const matchesTo = tokenToAddress
          ? trade.tokenOut?.toLowerCase() === tokenToAddress
          : true
        return matchesFrom && matchesTo
      })
    }

    // Apply ownership filter
    if (activeTab === 'myInstasettles') {
      filteredTrades = filteredTrades.filter(
        (trade) => trade.user?.toLowerCase() === address?.toLowerCase()
      )
    }

    // Apply timeframe filter
    const now = Date.now()
    filteredTrades = filteredTrades.filter((trade) => {
      const tradeDate = new Date(trade.createdAt).getTime()
      switch (activeTimeframe) {
        case '1D':
          return now - tradeDate <= 24 * 60 * 60 * 1000
        case '1W':
          return now - tradeDate <= 7 * 24 * 60 * 60 * 1000
        case '1M':
          return now - tradeDate <= 30 * 24 * 60 * 60 * 1000
        case '1Y':
          return now - tradeDate <= 365 * 24 * 60 * 60 * 1000
        case 'ALL':
        default:
          return true
      }
    })

    return filteredTrades as ExtendedTrade[]
  }, [
    trades,
    activeTab,
    activeTimeframe,
    isChartFiltered,
    selectedTrade,
    tokenList,
    tokenFromAddress,
    tokenToAddress,
  ])

  const handleStreamClick = (item: ExtendedTrade) => {
    // Close the global sidebar if it's open
    if (isGlobalStreamSidebarOpen) {
      showGlobalStreamSidebar(false)
    }
    setInitialStream(item)
    setIsSidebarOpen(true)
  }

  const handleInstasettleClick = async (item: ExtendedTrade) => {
    if (isConnectedWallet) {
      const signer = getSigner()

      if (signer) {
        const res = await instasettle(
          {
            tradeId: Number(item.id),
            tokenInObj: item.tokenInDetails,
            tokenOutObj: item.tokenOutDetails,
            tokenIn: item.tokenInDetails?.token_address || '',
            tokenOut: item.tokenOutDetails?.token_address || '',
            amountIn: Number(
              formatUnits(
                BigInt(item.amountIn),
                item.tokenInDetails?.decimals || 18
              )
            ).toString(),
            minAmountOut: Number(
              formatUnits(
                BigInt(item.minAmountOut),
                item.tokenOutDetails?.decimals || 18
              )
            ).toString(),
            isInstasettlable: true,
            usePriceBased: false,
            signer: signer,
          },
          signer
        )
        if (res.success) {
          // Refetch trades to update the list
          if (refetchTrades) {
            refetchTrades()
          } else {
            refetch()
          }
        }
      }
    }
  }

  // Loading skeleton
  if ((isLoading && !displayData.length) || isLoadingTokenList) {
    return (
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Token Pair</TableHead>
            <TableHead></TableHead>
            <TableHead className="text-center">Volume</TableHead>
            <TableHead className="text-center">Effective Price</TableHead>
            <TableHead className="text-center">Savings</TableHead>
            <TableHead className="text-center">bps</TableHead>
            <TableHead className="text-center">Timestamp</TableHead>
            <TableHead className="text-center"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      {/* <div>
                        <Skeleton className="w-12 h-4 mb-1" />
                        <Skeleton className="w-16 h-4" />
                      </div> */}
                    </div>
                    <Skeleton className="w-4 h-2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      {/* <div>
                        <Skeleton className="w-12 h-4 mb-1" />
                        <Skeleton className="w-16 h-4" />
                      </div> */}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="w-16 h-4" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-12 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-5 h-5 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="mt-16 relative">
      <div className="flex justify-between mb-6">
        <div className="flex gap-2">
          <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex gap-[6px]">
            <div
              className={`flex gap-[6px] items-center py-[6px] sm:py-[10px] bg-opacity-[12%] px-[6px] sm:px-[9px] cursor-pointer rounded-[8px] ${
                activeTab === 'all'
                  ? ' bg-primaryGradient text-black'
                  : 'hover:bg-tabsGradient'
              } ${
                isChartFiltered
                  ? 'opacity-50 pointer-events-none cursor-not-allowed'
                  : ''
              }`}
              onClick={() => {
                if (!isChartFiltered) {
                  setActiveTab('all')
                }
              }}
            >
              ALL
            </div>
            <div
              className={`flex gap-[6px] items-center py-[6px] sm:py-[10px] bg-opacity-[12%] px-[6px] sm:px-[9px] cursor-pointer rounded-[8px] ${
                activeTab === 'myInstasettles'
                  ? ' bg-primaryGradient text-black'
                  : 'hover:bg-tabsGradient'
              } ${
                isChartFiltered
                  ? 'opacity-50 pointer-events-none cursor-not-allowed'
                  : ''
              }`}
              onClick={() => {
                if (!isChartFiltered) {
                  setActiveTab('myInstasettles')
                }
              }}
            >
              MY INSTASETTLES
            </div>
          </div>
        </div>
        {isChartFiltered && selectedVolume !== null && (
          <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex items-center">
            <div className="flex gap-[6px] items-center py-[6px] sm:py-[10px] px-[6px] sm:px-[9px] rounded-[8px]">
              <span>Trade Volume: {selectedVolume}</span>
              <button
                onClick={onClearSelection}
                className="hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center min-w-[120px]">
                Token Pair
              </TableHead>
              <TableHead className="min-w-[110px]"></TableHead>
              <TableHead className="text-center min-w-[120px]">Cost</TableHead>
              <TableHead className="text-center min-w-[120px]">
                Volume
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group min-w-[140px]"
                // onClick={() => handleSort('output')}
              >
                <div className="flex items-center justify-center">
                  Effective Price
                  <SortIcon
                    active={sortField === 'output'}
                    direction={sortField === 'output' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group min-w-[120px]"
                // onClick={() => handleSort('streams')}
              >
                <div className="flex items-center justify-center">
                  Savings
                  <SortIcon
                    active={sortField === 'streams'}
                    direction={sortField === 'streams' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group min-w-[70px]"
                // onClick={() => handleSort('volume')}
              >
                <div className="flex items-center justify-center">
                  BPS
                  <SortIcon
                    active={sortField === 'volume'}
                    direction={sortField === 'volume' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group min-w-[90px]"
                // onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center justify-center">
                  Timestamp
                  <SortIcon
                    active={sortField === 'timestamp'}
                    direction={sortField === 'timestamp' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead className="text-center min-w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="text-red-500 text-center py-8">
                    Error loading trades: {(error as Error).message}
                  </div>
                </TableCell>
              </TableRow>
            ) : displayData.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="text-white52 text-center py-8">
                    No trades found
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => {
                // Format amounts using token decimals
                const formattedAmountIn = item.tokenInDetails
                  ? formatUnits(
                      BigInt(item.amountIn),
                      item.tokenInDetails.decimals
                    )
                  : '0'
                const formattedMinAmountOut = item.tokenOutDetails
                  ? formatUnits(
                      BigInt(item.minAmountOut),
                      item.tokenOutDetails.decimals
                    )
                  : '0'

                // Calculate USD values (using token price from tokenList)
                const amountInUsd = item.tokenInDetails
                  ? Number(formattedAmountIn) *
                    (item.tokenInDetails.usd_price || 0)
                  : 0
                const amountOutUsd = item.tokenOutDetails
                  ? Number(formattedMinAmountOut) *
                    (item.tokenOutDetails.usd_price || 0)
                  : 0

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-center min-w-[120px]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ImageFallback
                            src={
                              (item.tokenInDetails?.symbol.toLowerCase() ===
                              'usdt'
                                ? '/tokens/usdt.svg'
                                : item.tokenInDetails?.icon) ||
                              '/icons/default-token.svg'
                            }
                            width={32}
                            height={32}
                            className="w-6 h-6 rounded-full"
                            alt={item.tokenInDetails?.symbol || 'eth'}
                          />
                          {/* <div>
                            <p className="text-white">
                              {item.tokenInDetails?.symbol || 'ETH'}
                            </p>
                            <p className="text-white52">
                              ${item.amountInUsd?.toFixed(2)}
                            </p>
                          </div> */}
                        </div>
                        <Image
                          src="/icons/right-arrow.svg"
                          width={24}
                          height={24}
                          alt="to"
                          className="w-4 h-4 flex-shrink-0"
                        />
                        <div className="flex items-center gap-2">
                          <ImageFallback
                            src={
                              (item.tokenOutDetails?.symbol.toLowerCase() ===
                              'usdt'
                                ? '/tokens/usdt.svg'
                                : item.tokenOutDetails?.icon) ||
                              '/icons/default-token.svg'
                            }
                            width={32}
                            height={32}
                            alt={item.tokenOutDetails?.symbol || 'usdc'}
                            className="w-6 h-6 rounded-full"
                          />
                          {/* <div>
                            <p className="text-white">
                              {item.tokenOutDetails?.symbol || 'USDC'}
                            </p>
                            <p className="text-white52">
                              ${amountOutUsd.toFixed(2)}
                            </p>
                          </div> */}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        text={
                          item.isInstasettlable ? 'INSTASETTLE' : 'INSTASETTLE'
                        }
                        disabled={
                          !isConnectedWallet || loading
                          // address?.toLowerCase() !== item.user.toLowerCase() ||
                        }
                        className="h-[2.15rem] hover:bg-primaryGradient hover:text-black"
                        // onClick={() => handleInstasettleClick(item)}
                        onClick={() => handleStreamClick(item)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span>
                          {Number(
                            formatUnits(
                              BigInt(item.minAmountOut) -
                                BigInt(item.realisedAmountOut),
                              item.tokenOutDetails?.decimals || 18
                            )
                          ).toFixed(4)}{' '}
                          {item.tokenOutDetails?.symbol || 'N/A'}
                        </span>
                        <span className="text-white52 text-xs">
                          (${item.cost.toFixed(2)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span>
                          {Number(item.formattedAmountRemaining).toFixed(4)}{' '}
                          {item.tokenInDetails?.symbol || 'N/A'}
                        </span>
                        <span className="text-white52 text-xs">
                          ($
                          {(
                            Number(item.formattedAmountRemaining) *
                            (item.tokenInDetails?.usd_price || 0)
                          ).toFixed(2)}
                          )
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span>
                          {item.effectivePrice?.toFixed(2)}{' '}
                          {item.tokenOutDetails?.symbol || 'N/A'} /{' '}
                          {item.tokenInDetails?.symbol || 'N/A'}
                        </span>
                        <span className="text-white52 text-xs">(Ratio)</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center">
                        <span>
                          {(
                            (Number(
                              formatUnits(
                                BigInt(item.minAmountOut) -
                                  BigInt(item.realisedAmountOut),
                                item.tokenOutDetails?.decimals || 18
                              )
                            ) *
                              Number(item.instasettleBps)) /
                            10000
                          ).toFixed(4)}{' '}
                          {item.tokenOutDetails?.symbol || 'N/A'}
                        </span>
                        <span className="text-white52 text-xs">
                          (${item.savings?.toFixed(2)})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.instasettleBps || '0'}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatRelativeTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-center group">
                      <ArrowRight
                        className="h-5 w-5 text-zinc-400 group-hover:text-white cursor-pointer"
                        onClick={() => handleStreamClick(item)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Intersection Observer target */}
      {/* {!isChartFiltered && (
        <div ref={ref}>
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          )}
        </div>
      )} */}

      {initialStream && (
        <GlobalStreamSidebar
          isOpen={isSidebarOpen}
          onClose={() => {
            setInitialStream(undefined)
            setIsSidebarOpen(false)
          }}
          initialStream={initialStream}
          showBackIcon={false}
        />
      )}
    </div>
  )
}

export default TradesTable
