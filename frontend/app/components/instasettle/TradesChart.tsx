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
import { useQuery } from '@tanstack/react-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

  // Filter states - default to 'all'
  const [selectedTopN, setSelectedTopN] = useState<string>('all')

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

    return filteredTrades.map((trade: Trade): ChartDataPoint => {
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

        // Calculate cost (same logic as TradesTable)
        const targetAmountOut = trade.minAmountOut
        const realisedAmountOut = trade.realisedAmountOut
        const instasettleBps = trade.instasettleBps

        const cost = BigInt(targetAmountOut) - BigInt(realisedAmountOut)
        const formatCost = tokenOut
          ? formatUnits(BigInt(cost || '0'), tokenOut.decimals || 18)
          : '0'

        // Calculate amountOut for effective price
        let amountOut: bigint
        try {
          amountOut =
            ((BigInt(targetAmountOut) - BigInt(realisedAmountOut)) *
              (BigInt(10000) - BigInt(instasettleBps))) /
            BigInt(10000)
        } catch {
          amountOut = BigInt(0)
        }

        // Calculate amountIn for effective price
        const NETWORK_FEE_BPS = BigInt(15) // 15 basis points
        const networkFee =
          (BigInt(trade.amountIn) * NETWORK_FEE_BPS) / BigInt(10000)

        let amountIn: bigint
        try {
          amountIn =
            (BigInt(trade.amountRemaining) *
              (BigInt(10000) - NETWORK_FEE_BPS)) /
            BigInt(10000)
        } catch {
          amountIn = BigInt(1) // Use 1 to avoid division by zero
        }

        // Calculate effective price
        let effectivePrice = 0
        try {
          if (amountIn > BigInt(0)) {
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
          const volume = Number(formattedAmountRemaining)
          savings = effectivePrice - volume
          savings = isFinite(savings) ? Math.max(0, savings) : 0
        } catch (error) {
          savings = 0
        }

        // Create ExtendedTrade object
        const extendedTrade: ExtendedTrade = {
          ...trade,
          effectivePrice: isFinite(effectivePrice) ? effectivePrice : 0,
          networkFee: isFinite(Number(networkFee)) ? Number(networkFee) : 0,
          amountInUsd: isFinite(amountInUsd) ? amountInUsd : 0,
          tokenInDetails: tokenIn || null,
          tokenOutDetails: tokenOut || null,
          formattedAmountRemaining: formattedAmountRemaining,
          cost: Number(formatCost),
          savings: isFinite(savings) ? savings : 0,
        }

        return {
          cost: Number(formatCost), // Cost in USD for X-axis
          volume: Number(formattedAmountRemaining), // Volume (formattedAmountRemaining)
          savings: isFinite(savings) ? savings : 0, // Savings in USD for Y-axis
          // savings: Number(formatCost) * Math.floor(Math.random() * 100) + 1,
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

  // Sort chart data by cost (descending) and limit based on selectedTopN
  const sortedChartData = useMemo(() => {
    const sorted = [...chartData].sort((a, b) => b.cost - a.cost) // Sort by cost descending

    // Apply the top N limit if not 'all'
    if (selectedTopN !== 'all') {
      const limitNum = parseInt(selectedTopN)
      return sorted.slice(0, limitNum)
    }

    return sorted
  }, [chartData, selectedTopN])

  // Calculate container width based on data length
  const containerWidth = useMemo(() => {
    const minWidth = 1200
    const barWidth = 25 // width per bar
    const padding = 200 // padding for better visualization
    const calculatedWidth = Math.max(
      minWidth,
      sortedChartData.length * barWidth + padding
    )
    return calculatedWidth
  }, [sortedChartData.length])

  const getBarProps = useCallback(
    (index: number) => ({
      fill:
        activeBar === index || selectedBar === index ? '#00e0ff' : '#41fcb4',
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

  // Handle value change for the dropdown
  const handleValueChange = (value: string) => {
    setSelectedBar(null) // Reset selected bar when changing view
    setActiveBar(null) // Reset active bar when changing view
    setSelectedTopN(value)
  }

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100
    // setScrollPosition(scrollPercentage) // This state is no longer needed
  }, [])

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Show loading state
  if (isLoading || isLoadingTokenList) {
    return (
      <div className="mt-32 mb-16">
        <div className="dark">
          <div className="w-full bg-background text-foreground">
            <div className="mb-6 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
              <h2 className="text-2xl font-bold">Loading Trades...</h2>
              <Select value={selectedTopN} onValueChange={handleValueChange}>
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
              <Select value={selectedTopN} onValueChange={handleValueChange}>
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
            <h2 className="text-2xl font-bold">
              Top Trades ($
              {Math.min(...sortedChartData.map((d) => d.cost)).toFixed(2)} - $
              {Math.max(...sortedChartData.map((d) => d.cost)).toFixed(2)})
            </h2>

            <Select value={selectedTopN} onValueChange={handleValueChange}>
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

          {/* Chart Container */}
          <div className="relative" ref={chartContainerRef}>
            {/* Edge fade effect */}
            <div
              className="absolute left-0 top-0 bottom-[35px] w-28 z-10 pointer-events-none"
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
                <div
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
                />

                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative"
                >
                  <BarChart
                    data={sortedChartData}
                    margin={{
                      top: 20,
                      right: 50,
                      left: 80,
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
                          sortedChartData[data.activeTooltipIndex],
                          data.activeTooltipIndex
                        )
                      }
                    }}
                  >
                    <XAxis
                      dataKey="cost"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={20}
                      tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                      label={{
                        bps: 'Cost',
                        position: 'insideBottom',
                        offset: -10,
                      }}
                    />
                    {/* <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                      label={{
                        value: 'Savings',
                        angle: -90,
                        position: 'insideLeft',
                      }}
                    /> */}
                    <Bar
                      dataKey="savings"
                      radius={8}
                      // maxBarSize={20}
                      activeIndex={(selectedBar || activeBar) ?? undefined}
                    >
                      {sortedChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarProps(index).fill}
                          style={getBarProps(index).style}
                        />
                      ))}
                    </Bar>
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-white005 bg-black p-3 shadow-md">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Cost:
                                  </span>
                                  <span className="text-sm font-bold">
                                    ${Number(label).toFixed(2)}
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
          selectedBar !== null ? sortedChartData[selectedBar].trade : null
        }
        selectedVolume={
          selectedBar !== null ? sortedChartData[selectedBar].volume : null
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
