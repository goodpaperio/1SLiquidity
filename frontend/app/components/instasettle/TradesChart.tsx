'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Rectangle,
} from 'recharts'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import InstasettlePill from '@/app/components/shared/InstasettlePill'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import TradesTable from './TradesTable'
import { Trade } from '@/app/lib/graphql/types/trade'
import tradesApi from '@/api/trades'
import { Spinner } from '../ui/spinner'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useCustomTokenList } from '@/app/lib/hooks/useCustomTokensList'
import { formatUnits } from 'viem'

const DEFAULT_RECORDS = 100

// Extended Trade type with calculated fields (same as TradesTable)
interface ExtendedTrade extends Trade {
  effectivePrice: number
  networkFee: number
  amountInUsd: number
  tokenInDetails: TOKENS_TYPE | null
  tokenOutDetails: TOKENS_TYPE | null
  formattedAmountRemaining: string
  cost: number
  savings: number
  onlyInstasettlable?: boolean
}

// Define ChartDataPoint interface for the real GraphQL Trade
interface ChartDataPoint {
  cost: number // Cost in USD (for X-axis)
  volume: number // Volume (formattedAmountRemaining, not in USD)
  savings: number // Savings in USD (for Y-axis)
  trade: ExtendedTrade
}

const chartConfig = {
  savings: {
    label: 'Savings',
  },
} satisfies ChartConfig

interface TradesChartProps {
  selectedTokenFrom: TOKENS_TYPE | null
  selectedTokenTo: TOKENS_TYPE | null
}

export default function TradesChart({
  selectedTokenFrom,
  selectedTokenTo,
}: TradesChartProps) {
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollAnimationRef = useRef<number | null>(null)
  const activeArrowRef = useRef<'left' | 'right' | null>(null)
  const [activeArrow, setActiveArrow] = useState<'left' | 'right' | null>(null)

  // Filter states - default to 'all'
  const [selectedTopN, setSelectedTopN] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Use real trades data instead of dummy API
  const limit =
    selectedTopN === 'all' ? DEFAULT_RECORDS : parseInt(selectedTopN)
  const { trades, isLoading, error, refetch } = useTrades({
    first: limit,
    skip: 0,
  })

  // Get token list for proper volume calculations
  const { tokens: tokenList, isLoading: isLoadingTokenList } =
    useCustomTokenList()

  // Combine data into chart data points
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return []

    // Filter trades based on selected tokens
    let filteredTrades = trades.filter(
      (trade) =>
        trade.isInstasettlable &&
        trade.settlements.length === 0 &&
        trade.cancellations.length === 0
    )

    if (selectedTokenFrom && selectedTokenTo) {
      filteredTrades = trades.filter(
        (trade) =>
          trade.isInstasettlable &&
          trade.settlements.length === 0 &&
          trade.cancellations.length === 0 &&
          trade.tokenIn?.toLowerCase() ===
            selectedTokenFrom.token_address?.toLowerCase() &&
          trade.tokenOut?.toLowerCase() ===
            selectedTokenTo.token_address?.toLowerCase()
      )
    }

    // Add mock "Only Instasettlable" trades
    const mockOnlyInstasettlableTrades: Trade[] = [
      {
        id: 'mock-only-1',
        amountIn: '3000000000000000000', // 3 tokens
        amountRemaining: '3000000000000000000',
        minAmountOut: '3000000000000000000',
        tokenIn:
          selectedTokenFrom?.token_address ||
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        tokenOut:
          selectedTokenTo?.token_address ||
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        isInstasettlable: true,
        realisedAmountOut: '0',
        lastSweetSpot: '0',
        executions: [],
        settlements: [],
        cancellations: [],
        instasettleBps: '167', // ~1.67% for $0.05 savings on $3
        createdAt: new Date().toISOString(),
        tradeId: 'mock-trade-1',
        user: '0x0000000000000000000000000000000000000000',
      },
      {
        id: 'mock-only-2',
        amountIn: '3000000000000000000',
        amountRemaining: '3000000000000000000',
        minAmountOut: '3000000000000000000',
        tokenIn:
          selectedTokenFrom?.token_address ||
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        tokenOut:
          selectedTokenTo?.token_address ||
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        isInstasettlable: true,
        realisedAmountOut: '0',
        lastSweetSpot: '0',
        executions: [],
        settlements: [],
        cancellations: [],
        instasettleBps: '167',
        createdAt: new Date().toISOString(),
        tradeId: 'mock-trade-2',
        user: '0x0000000000000000000000000000000000000000',
      },
      {
        id: 'mock-only-3',
        amountIn: '3000000000000000000',
        amountRemaining: '3000000000000000000',
        minAmountOut: '3000000000000000000',
        tokenIn:
          selectedTokenFrom?.token_address ||
          '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        tokenOut:
          selectedTokenTo?.token_address ||
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        isInstasettlable: true,
        realisedAmountOut: '0',
        lastSweetSpot: '0',
        executions: [],
        settlements: [],
        cancellations: [],
        instasettleBps: '167',
        createdAt: new Date().toISOString(),
        tradeId: 'mock-trade-3',
        user: '0x0000000000000000000000000000000000000000',
      },
    ]

    // Combine real and mock trades
    const allTrades = [...filteredTrades, ...mockOnlyInstasettlableTrades]

    return allTrades.map((trade: Trade, index: number): ChartDataPoint => {
      const isOnlyInstasettlable = trade.id.startsWith('mock-only')
      try {
        // Find token information for this trade (same logic as TradesTable)
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

        // Create ExtendedTrade object
        const extendedTrade: ExtendedTrade = {
          ...trade,
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
          onlyInstasettlable: isOnlyInstasettlable,
        }

        // Override values for mock "Only Instasettlable" trades
        if (isOnlyInstasettlable) {
          return {
            cost: 3.0, // $3 cost
            volume: 3.0, // 3 tokens volume
            savings: 0.05, // $0.05 savings
            trade: {
              ...extendedTrade,
              cost: 3.0,
              savings: 0.05,
              amountInUsd: 3.0,
            },
          }
        }

        return {
          cost: isFinite(costInUsd) ? costInUsd : 0, // Cost in USD for X-axis
          volume: Number(formattedAmountRemaining), // Volume in tokens
          savings: isFinite(savingsInUsd) ? savingsInUsd : 0, // Savings in USD for Y-axis
          trade: extendedTrade,
        }
      } catch (error) {
        console.error('Error processing trade:', error)
        // Return trade with safe default values if anything fails
        const extendedTrade: ExtendedTrade = {
          ...trade,
          effectivePrice: 0,
          networkFee: 0,
          amountInUsd: 0,
          tokenInDetails: null,
          tokenOutDetails: null,
          formattedAmountRemaining: '0',
          cost: 0,
          savings: 0,
        }

        return {
          cost: 0,
          volume: 0,
          savings: 0,
          trade: extendedTrade,
        }
      }
    })
  }, [trades, selectedTokenFrom, selectedTokenTo, tokenList])

  // Apply type filter
  const typeFilteredData = useMemo(() => {
    if (selectedType === 'all') {
      return chartData
    } else if (selectedType === 'instasettlable') {
      return chartData.filter((d) => !d.trade.onlyInstasettlable)
    } else if (selectedType === 'only-instasettlable') {
      return chartData.filter((d) => d.trade.onlyInstasettlable)
    }
    return chartData
  }, [chartData, selectedType])

  // Sort chart data by cost (descending) and limit based on selectedTopN
  const sortedChartData = useMemo(() => {
    const sorted = [...typeFilteredData].sort((a, b) => b.cost - a.cost) // Sort by cost descending

    // Apply the top N limit if not 'all'
    if (selectedTopN !== 'all') {
      const limitNum = parseInt(selectedTopN)
      return sorted.slice(0, limitNum)
    }

    return sorted
  }, [typeFilteredData, selectedTopN])

  // Add index to chart data for even spacing
  const indexedChartData = useMemo(() => {
    return sortedChartData.map((data, index) => ({
      ...data,
      index,
    }))
  }, [sortedChartData])

  // Calculate container width based on data length with dynamic spacing
  const containerWidth = useMemo(() => {
    const dataLength = sortedChartData.length

    // Dynamic bar width and spacing based on number of trades
    let barWidth = 25
    let spacing = 25 // Space between bars
    let minWidth = 800

    if (dataLength <= 2) {
      barWidth = 80
      spacing = 100
      minWidth = 400
    } else if (dataLength <= 5) {
      barWidth = 60
      spacing = 60
      minWidth = 600
    } else if (dataLength <= 10) {
      barWidth = 45
      spacing = 40
      minWidth = 600
    } else if (dataLength <= 20) {
      barWidth = 35
      spacing = 30
    }

    const padding = 200
    // Use 50vw as absolute minimum width
    const viewportMinWidth =
      typeof window !== 'undefined' ? window.innerWidth * 0.5 : minWidth
    const calculatedWidth = Math.max(
      viewportMinWidth,
      minWidth,
      dataLength * (barWidth + spacing) + padding
    )
    return calculatedWidth
  }, [sortedChartData.length])

  const getBarProps = useCallback(
    (index: number, isOnlyInstasettlable: boolean) => ({
      fill:
        activeBar === index || selectedBar === index
          ? '#00e0ff'
          : isOnlyInstasettlable
          ? '#FAEE40'
          : '#41fcb4',
      style: {
        transition: 'fill 0.2s ease',
      },
    }),
    [activeBar, selectedBar]
  )

  const handleBarClick = (data: ChartDataPoint, index: number) => {
    if (!isChartReady) return
    setSelectedBar(selectedBar === index ? null : index)
    if (selectedBar !== index) {
      // console.log('Selected Bar Details:', {
      //   cost: data.cost,
      //   volume: data.volume,
      //   savings: data.savings,
      //   trade: data.trade,
      // })
    }
  }

  // Set chart ready when data is available
  useEffect(() => {
    if (!isLoading && trades && trades.length > 0) {
      setIsChartReady(true)
    }
  }, [isLoading, trades])

  // Handle value change for the dropdowns
  const handleCountChange = (value: string) => {
    setSelectedBar(null) // Reset selected bar when changing view
    setActiveBar(null) // Reset active bar when changing view
    setSelectedTopN(value)
  }

  const handleTypeChange = (value: string) => {
    setSelectedBar(null) // Reset selected bar when changing view
    setActiveBar(null) // Reset active bar when changing view
    setSelectedType(value)
  }

  // Handle scroll event

  const updateScrollability = useCallback(() => {
    if (!containerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    const maxScroll = scrollWidth - clientWidth

    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft < maxScroll - 5)
  }, [])

  // Scroll with animation
  const scrollInDirection = useCallback(
    (direction: 'left' | 'right') => {
      if (!containerRef.current) return

      activeArrowRef.current = direction
      setActiveArrow(direction)

      const container = containerRef.current
      const scrollAmount = direction === 'left' ? -37.5 : 37.5

      const animate = () => {
        if (!containerRef.current || activeArrowRef.current !== direction)
          return

        const { scrollLeft, scrollWidth, clientWidth } = container
        const maxScroll = scrollWidth - clientWidth

        // Stop if we've reached the boundary
        if (
          (direction === 'left' && scrollLeft <= 0) ||
          (direction === 'right' && scrollLeft >= maxScroll)
        ) {
          activeArrowRef.current = null
          setActiveArrow(null)
          updateScrollability()
          return
        }

        container.scrollLeft += scrollAmount
        updateScrollability()

        scrollAnimationRef.current = requestAnimationFrame(animate)
      }

      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
      }

      scrollAnimationRef.current = requestAnimationFrame(animate)
    },
    [updateScrollability]
  )

  const stopScrolling = useCallback(() => {
    activeArrowRef.current = null
    setActiveArrow(null)

    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
    }

    updateScrollability()
  }, [updateScrollability])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      updateScrollability()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    updateScrollability()

    const timeoutId = setTimeout(updateScrollability, 100)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
    }
  }, [updateScrollability, sortedChartData.length, containerWidth])

  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
      }
    }
  }, [])

  // Show loading state
  if (isLoading || isLoadingTokenList) {
    return (
      <div className="mt-32 mb-16">
        <div className="dark">
          <div className="w-full bg-background text-foreground">
            <div className="mb-6 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
              <h2 className="text-2xl font-bold">Loading Trades...</h2>
              <div className="flex gap-2">
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                    <SelectValue placeholder="Type Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border border-primary">
                    <SelectItem
                      value="all"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      All Types
                    </SelectItem>
                    <SelectItem
                      value="instasettlable"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Instasettlable
                    </SelectItem>
                    <SelectItem
                      value="only-instasettlable"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Only Instasettlable
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTopN} onValueChange={handleCountChange}>
                  <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                    <SelectValue placeholder="Select trades" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border border-primary">
                    <SelectItem
                      value="10"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Top 10 Trades
                    </SelectItem>
                    <SelectItem
                      value="20"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Top 20 Trades
                    </SelectItem>
                    <SelectItem
                      value="50"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Top 50 Trades
                    </SelectItem>
                    <SelectItem
                      value="all"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      All Trades (100)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative" style={{ height: '500px' }}>
              <div className="flex items-center justify-center h-full">
                <Spinner />
              </div>
            </div>
          </div>
        </div>
        <TradesTable
          selectedTrade={null}
          selectedVolume={null}
          isChartFiltered={false}
          onClearSelection={() => setSelectedBar(null)}
          selectedTokenFrom={selectedTokenFrom}
          selectedTokenTo={selectedTokenTo}
          refetchTrades={refetch}
        />
      </div>
    )
  }

  // Show no data state
  if (!trades || trades.length === 0 || sortedChartData.length === 0) {
    const hasTokenFilter = selectedTokenFrom && selectedTokenTo
    return (
      <div className="mt-32 mb-16">
        <div className="dark">
          <div className="w-full bg-background text-foreground">
            <div className="mb-6 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
              <h2 className="text-2xl font-bold">
                {hasTokenFilter
                  ? `No Trades Found for ${selectedTokenFrom.symbol}/${selectedTokenTo.symbol}`
                  : 'No Trades Available'}
              </h2>
              <div className="flex gap-2">
                <Select value={selectedType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                    <SelectValue placeholder="Type Filter" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border border-primary">
                    <SelectItem
                      value="all"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      All Types
                    </SelectItem>
                    <SelectItem
                      value="instasettlable"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Instasettlable
                    </SelectItem>
                    <SelectItem
                      value="only-instasettlable"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Only Instasettlable
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedTopN} onValueChange={handleCountChange}>
                  <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                    <SelectValue placeholder="Select trades" />
                  </SelectTrigger>
                  <SelectContent className="bg-black border border-primary">
                    <SelectItem
                      value="10"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Top 10 Trades
                    </SelectItem>
                    <SelectItem
                      value="20"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Top 20 Trades
                    </SelectItem>
                    <SelectItem
                      value="50"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      Top 50 Trades
                    </SelectItem>
                    <SelectItem
                      value="all"
                      className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                    >
                      All Trades (100)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative" style={{ height: '500px' }}>
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">
                  No trading data available
                </h3>
                <p className="text-muted-foreground">
                  {hasTokenFilter
                    ? `No trades found for the selected token pair ${selectedTokenFrom.symbol}/${selectedTokenTo.symbol}`
                    : 'There are currently no trades to display. Check back later or try selecting different tokens.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <TradesTable
          selectedTrade={null}
          selectedVolume={null}
          isChartFiltered={false}
          onClearSelection={() => setSelectedBar(null)}
          selectedTokenFrom={selectedTokenFrom}
          selectedTokenTo={selectedTokenTo}
          refetchTrades={refetch}
        />
      </div>
    )
  }

  return (
    <div className="mt-32 mb-16">
      <div className="dark">
        <div className="w-full bg-background text-foreground">
          <div className="mb-6 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold">
                Top Trades ($
                {Math.min(...indexedChartData.map((d) => d.cost)).toFixed(2)} -
                ${Math.max(...indexedChartData.map((d) => d.cost)).toFixed(2)})
              </h2>
              <div className="flex items-center gap-2">
                <InstasettlePill
                  isSettled={false}
                  variant="instasettled"
                  showTextOnMobile={true}
                />
                <InstasettlePill
                  isSettled={false}
                  variant="only-instasettlable"
                  showTextOnMobile={true}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                  <SelectValue placeholder="Type Filter" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary">
                  <SelectItem
                    value="all"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    All Types
                  </SelectItem>
                  <SelectItem
                    value="instasettlable"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    Instasettlable
                  </SelectItem>
                  <SelectItem
                    value="only-instasettlable"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    Only Instasettlable
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedTopN} onValueChange={handleCountChange}>
                <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                  <SelectValue placeholder="Select trades" />
                </SelectTrigger>
                <SelectContent className="bg-black border border-primary">
                  <SelectItem
                    value="10"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    Top 10 Trades
                  </SelectItem>
                  <SelectItem
                    value="20"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    Top 20 Trades
                  </SelectItem>
                  <SelectItem
                    value="50"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    Top 50 Trades
                  </SelectItem>
                  <SelectItem
                    value="all"
                    className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                  >
                    All Trades (100)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chart Container */}
          <div className="relative" ref={chartContainerRef}>
            {/* Navigation Arrows - positioned below the Y-axis label */}
            {canScrollLeft && (
              <button
                onMouseDown={() => scrollInDirection('left')}
                onMouseUp={stopScrolling}
                onMouseLeave={stopScrolling}
                onTouchStart={() => scrollInDirection('left')}
                onTouchEnd={stopScrolling}
                className={`absolute left-4 top-[60%] -translate-y-1/2 z-20 border rounded-full p-1.5 transition-all duration-150 backdrop-blur-sm ${
                  activeArrow === 'left'
                    ? 'bg-primary/30 border-primary/70 shadow-lg shadow-primary/50 scale-90'
                    : 'bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/40 shadow-md shadow-primary/20'
                }`}
                aria-label="Scroll left"
              >
                <ChevronLeft
                  className="w-4 h-4 text-primary"
                  strokeWidth={2.5}
                />
              </button>
            )}
            {canScrollRight && (
              <button
                onMouseDown={() => scrollInDirection('right')}
                onMouseUp={stopScrolling}
                onMouseLeave={stopScrolling}
                onTouchStart={() => scrollInDirection('right')}
                onTouchEnd={stopScrolling}
                className={`absolute right-4 top-[60%] -translate-y-1/2 z-20 border rounded-full p-1.5 transition-all duration-150 backdrop-blur-sm ${
                  activeArrow === 'right'
                    ? 'bg-primary/30 border-primary/70 shadow-lg shadow-primary/50 scale-90'
                    : 'bg-gradient-to-l from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/40 shadow-md shadow-primary/20'
                }`}
                aria-label="Scroll right"
              >
                <ChevronRight
                  className="w-4 h-4 text-primary"
                  strokeWidth={2.5}
                />
              </button>
            )}
            {/* Edge fade effect */}
            <div
              className="absolute left-[-10px] top-0 bottom-[35px] w-28 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to right, black, rgba(0, 0, 0, 0.99) 5%, rgba(0, 0, 0, 0.97) 10%, rgba(0, 0, 0, 0.95) 20%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.2) 85%, transparent)',
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-[35px] w-28 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to left, black, rgba(0, 0, 0, 0.99) 5%, rgba(0, 0, 0, 0.97) 10%, rgba(0, 0, 0, 0.95) 20%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.2) 85%, transparent)',
              }}
            />

            {/* Top fade mask - keeping this as it adds depth */}
            <div
              className="absolute inset-0 bg-black pointer-events-none"
              style={{
                WebkitMaskImage: `
          radial-gradient(circle at top, transparent 0%, black 30%)`,
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: 'cover',
                maskImage: `
          radial-gradient(circle at top, transparent 0%, black 30%)`,
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: 'cover',
              }}
            />

            {/* Fixed Y-axis label - positioned higher to avoid arrow overlap */}
            <div
              className="absolute left-2 top-[35%] -translate-y-1/2 z-10 pointer-events-none"
              style={{
                writingMode: 'vertical-rl',
                transform: 'translateY(-50%) rotate(180deg)',
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: '#41fcb4' }}
              >
                Savings (USD)
              </span>
            </div>

            <div
              ref={containerRef}
              className="overflow-x-auto chart-scroll relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{
                width: '100%',
                height: '500px',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div
                style={{
                  width: `${containerWidth}px`,
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* Background gradient */}
                {/* TODO: add background gradient */}
                {/* <div
                  className="w-full h-64 bg-gradient-to-br from-[#114532] to-[#22432e] absolute bottom-[35px] left-0"
                  style={{
                    WebkitMaskImage:
                      'linear-gradient(to top, #ffffff 0%, transparent 100%)',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: '100% 100%',
                    maskImage:
                      'linear-gradient(to top, #ffffff 0%, transparent 100%)',
                    maskRepeat: 'no-repeat',
                    maskSize: '100% 100%',
                  }}
                /> */}

                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative"
                >
                  <BarChart
                    data={indexedChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 50,
                      bottom: 20,
                    }}
                    onMouseMove={(state) => {
                      if (state?.activeTooltipIndex !== undefined) {
                        setActiveBar(state.activeTooltipIndex)
                      }
                    }}
                    onMouseLeave={() => {
                      setActiveBar(null)
                    }}
                    onClick={(data) => {
                      if (data && data.activeTooltipIndex !== undefined) {
                        handleBarClick(
                          indexedChartData[data.activeTooltipIndex],
                          data.activeTooltipIndex
                        )
                      }
                    }}
                  >
                    <XAxis
                      dataKey="index"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fill: '#888', fontSize: 11 }}
                      tickFormatter={(value, index) => {
                        const data = indexedChartData[value]
                        return data ? `$${Number(data.cost).toFixed(2)}` : ''
                      }}
                      label={{
                        value: 'Cost (USD)',
                        position: 'insideBottom',
                        offset: -8,
                        style: {
                          fill: '#41fcb4',
                          fontSize: 12,
                          fontWeight: 500,
                        },
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#e0e0e0', fontSize: 11 }}
                      width={45}
                      tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                    />
                    <Bar
                      dataKey="savings"
                      radius={8}
                      maxBarSize={
                        indexedChartData.length <= 10 ? 60 : undefined
                      }
                      minPointSize={5}
                      activeIndex={(selectedBar || activeBar) ?? undefined}
                    >
                      {indexedChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            getBarProps(
                              index,
                              entry.trade.onlyInstasettlable || false
                            ).fill
                          }
                          style={
                            getBarProps(
                              index,
                              entry.trade.onlyInstasettlable || false
                            ).style
                          }
                        />
                      ))}
                    </Bar>
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const dataPoint = indexedChartData[Number(label)]
                          return (
                            <div className="rounded-lg border border-white005 bg-black p-3 shadow-md">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Cost:
                                  </span>
                                  <span className="text-sm font-bold">
                                    $
                                    {dataPoint
                                      ? Number(dataPoint.cost).toFixed(2)
                                      : '0.00'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Savings:
                                  </span>
                                  <span className="text-sm font-bold">
                                    ${Number(payload[0].value).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
      <TradesTable
        selectedTrade={
          selectedBar !== null ? indexedChartData[selectedBar].trade : null
        }
        selectedVolume={
          selectedBar !== null ? indexedChartData[selectedBar].volume : null
        }
        isChartFiltered={selectedBar !== null}
        onClearSelection={() => setSelectedBar(null)}
        selectedTokenFrom={selectedTokenFrom}
        selectedTokenTo={selectedTokenTo}
        refetchTrades={refetch}
      />
    </div>
  )
}
