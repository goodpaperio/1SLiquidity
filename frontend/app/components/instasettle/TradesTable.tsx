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
          trade.settlements.length === 0 &&
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
        const findTokenForTrade = (
          address: string,
          selectedToken: TOKENS_TYPE | null
        ) => {
          const ethWethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
          if (
            address?.toLowerCase() === ethWethAddress &&
            selectedToken &&
            (selectedToken.symbol.toLowerCase() === 'eth' ||
              selectedToken.symbol.toLowerCase() === 'weth')
          ) {
            return selectedToken // Return the selected token (ETH or WETH) directly
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

        // Calculate sum of realisedAmountOut from executions
        const realisedAmountOutSum = (trade.executions || []).reduce(
          (sum, execution) => {
            try {
              return sum + BigInt(execution.realisedAmountOut || '0')
            } catch {
              return sum
            }
          },
          BigInt(0)
        )

        // Safely convert values to BigInt with fallbacks
        const safeConvertToBigInt = (
          value: string | null | undefined,
          fallback: string = '0'
        ): bigint => {
          try {
            return BigInt(value || fallback)
          } catch {
            return BigInt(fallback)
          }
        }

        // amountOut: ((targetAmountOut - realisedAmountOut) * (10000 - trade.instasettleBps)) / 10000
        // amountIn: (amountRemaining * (10000 - NETWORK_FEE) / 1000
        // effective price = amountOut / amountIn

        // Calculate amountOut
        const targetAmountOut = trade.minAmountOut
        const realisedAmountOut = trade.realisedAmountOut
        const instasettleBps = trade.instasettleBps

        const cost = BigInt(targetAmountOut) - BigInt(realisedAmountOut)
        const formatCost = tokenOut
          ? formatUnits(BigInt(cost || '0'), tokenOut.decimals || 18)
          : '0'

        let amountOut: bigint
        try {
          amountOut =
            ((BigInt(targetAmountOut) - BigInt(realisedAmountOut)) *
              (BigInt(10000) - BigInt(instasettleBps))) /
            BigInt(10000)

          // Use minAmountOut directly for effective price calculation
          // amountOut =
          //   (minAmountOutBN * (BigInt(10000) - instasettleBpsBN)) /
          //   BigInt(10000)
        } catch {
          amountOut = BigInt(0)
        }

        // Calculate amountIn
        const amountRemaining = trade.amountRemaining

        let amountIn: bigint
        // Calculate network fee (15% of amountInUsd)
        // Calculate network fee (15 basis points = 0.15%)
        const NETWORK_FEE_BPS = BigInt(15) // 15 basis points
        const networkFee =
          (BigInt(trade.amountIn) * NETWORK_FEE_BPS) / BigInt(10000)

        try {
          amountIn =
            (BigInt(amountRemaining) * (BigInt(10000) - NETWORK_FEE_BPS)) /
            BigInt(10000)
        } catch {
          amountIn = BigInt(1) // Use 1 to avoid division by zero
        }

        // Calculate effective price - convert to proper decimals before division
        let effectivePrice = 0
        try {
          if (amountIn > BigInt(0)) {
            // Convert amounts to proper decimal representation before division
            const tokenOutDecimals = tokenOut?.decimals || 6 // Default to 6 for USDC
            const tokenInDecimals = tokenIn?.decimals || 18 // Default to 18 for ETH

            const amountOutFloat =
              Number(amountOut) / Math.pow(10, tokenOutDecimals)
            const amountInFloat =
              Number(amountIn) / Math.pow(10, tokenInDecimals)

            effectivePrice = amountOutFloat / amountInFloat
          }
        } catch {
          effectivePrice = 0
        }

        // Calculate savings
        let savings = 0
        try {
          // Convert formattedAmountRemaining to the same decimal basis as effectivePrice
          const volume = Number(formattedAmountRemaining)

          // Both effectivePrice and volume are now in the same decimal basis
          savings = effectivePrice - volume

          // Ensure savings is not negative and is finite
          savings = isFinite(savings) ? Math.max(0, savings) : 0
        } catch (error) {
          console.error('Error calculating savings:', error)
          savings = 0
        }

        // Update trade object with calculated values
        return {
          ...trade,
          amountOut: Number(amountOut),
          effectivePrice: isFinite(effectivePrice) ? effectivePrice : 0,
          networkFee: isFinite(Number(networkFee)) ? Number(networkFee) : 0,
          amountInUsd: isFinite(amountInUsd) ? amountInUsd : 0,
          tokenInDetails: tokenIn || null,
          tokenOutDetails: tokenOut || null,
          formattedAmountRemaining: formattedAmountRemaining,
          cost: Number(formatCost),
          savings: isFinite(savings) ? savings : 0,
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

    // Apply token filter (only if both tokens are selected and not chart filtered)
    if (tokenFromAddress && tokenToAddress && !isChartFiltered) {
      filteredTrades = filteredTrades.filter(
        (trade) =>
          trade.tokenIn?.toLowerCase() === tokenFromAddress &&
          trade.tokenOut?.toLowerCase() === tokenToAddress
      )
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
        <Table className="">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Token Pair</TableHead>
              <TableHead></TableHead>
              <TableHead className="text-center">Cost</TableHead>
              <TableHead className="text-center">Volume</TableHead>
              <TableHead
                className="text-center cursor-pointer group"
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
                className="text-center cursor-pointer group"
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
                className="text-center cursor-pointer group"
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
                className="text-center cursor-pointer group"
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
              <TableHead className="text-center"></TableHead>
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
                    <TableCell className="font-medium text-center">
                      <div className="flex items-center justify-between">
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
                          className="w-4 h-4 mx-2"
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
                      ${item.cost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.formattedAmountRemaining}
                    </TableCell>
                    <TableCell className="text-center">
                      ${item.effectivePrice?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      ${item.savings?.toFixed(2)}
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
