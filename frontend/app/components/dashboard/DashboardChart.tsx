'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Bar, BarChart, XAxis, YAxis, Cell } from 'recharts'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { useCustomTokenList } from '@/app/lib/hooks/useCustomTokensList'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import { Spinner } from '../ui/spinner'
import { InstasettleIcon } from '@/app/lib/icons'
import { TimePeriod } from './index'

type DataViewType = 'volume' | 'earnings'

interface DailyData {
  date: string
  fullDate: string
  dayName: string
  volume: number
  trades: number
  earnings: number
  fees: number
  isToday: boolean
  sortKey: number
}

const chartConfig = {
  volume: {
    label: 'Volume',
  },
  earnings: {
    label: 'Earnings & Fees',
  },
} satisfies ChartConfig

const TIME_PERIODS: TimePeriod[] = ['1D', '1W', '1M', '1Y', 'ALL']

interface DashboardChartProps {
  timePeriod: TimePeriod
  onTimePeriodChange: (period: TimePeriod) => void
}

const DashboardChart = ({
  timePeriod,
  onTimePeriodChange,
}: DashboardChartProps) => {
  const [dataView, setDataView] = useState<DataViewType>('volume')
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const scrollAnimationRef = useRef<number | null>(null)
  const activeArrowRef = useRef<'left' | 'right' | null>(null)
  const [activeArrow, setActiveArrow] = useState<'left' | 'right' | null>(null)

  const { trades, isLoading } = useTrades({ first: 1000, skip: 0 })
  const { tokens: tokenList, isLoading: isLoadingTokenList } =
    useCustomTokenList()

  // Calculate the time range based on selected period
  const getTimeRange = useCallback((period: TimePeriod) => {
    const now = new Date()
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    )
    let startDate: Date

    switch (period) {
      case '1D':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        )
        break
      case '1W':
        startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 7)
        break
      case '1M':
        startDate = new Date(endDate)
        startDate.setMonth(startDate.getMonth() - 1)
        break
      case '1Y':
        startDate = new Date(endDate)
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      case 'ALL':
      default:
        startDate = new Date(2020, 0, 1)
        break
    }

    return { startDate, endDate }
  }, [])

  // Group trades by day/week/month based on time period
  const chartData = useMemo(() => {
    console.log('[DashboardChart] Processing data:', {
      tradesCount: trades?.length || 0,
      tokenListCount: tokenList?.length || 0,
      timePeriod,
      sampleTokens: tokenList?.slice(0, 5).map((t: TOKENS_TYPE) => ({
        symbol: t.symbol,
        address: t.token_address,
        usd_price: t.usd_price,
      })),
      sampleTradeTokens: trades?.slice(0, 3).map((t) => ({
        id: t.id,
        tokenIn: t.tokenIn,
        tokenOut: t.tokenOut,
      })),
    })

    if (
      !trades ||
      trades.length === 0 ||
      !tokenList ||
      tokenList.length === 0
    ) {
      console.log('[DashboardChart] No data available')
      return []
    }

    const { startDate, endDate } = getTimeRange(timePeriod)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    console.log('[DashboardChart] Time range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      now: now.toISOString(),
    })

    // Determine grouping interval
    const getGroupKey = (date: Date): string => {
      if (timePeriod === '1Y' || timePeriod === 'ALL') {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    const getSortKey = (dateStr: string): number => {
      if (timePeriod === '1Y' || timePeriod === 'ALL') {
        const [year, month] = dateStr.split('-').map(Number)
        return year * 100 + month
      }
      const [year, month, day] = dateStr.split('-').map(Number)
      return year * 10000 + month * 100 + day
    }

    const formatDisplayDate = (dateStr: string): string => {
      if (timePeriod === '1Y' || timePeriod === 'ALL') {
        const [year, month] = dateStr.split('-')
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ]
        return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`
      }
      const [year, month, day] = dateStr.split('-')
      return `${parseInt(day)}/${parseInt(month)}`
    }

    const formatFullDate = (dateStr: string): string => {
      if (timePeriod === '1Y' || timePeriod === 'ALL') {
        const [year, month] = dateStr.split('-')
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ]
        return `${monthNames[parseInt(month) - 1]} ${year}`
      }
      const [year, month, day] = dateStr.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]
      return `${dayNames[date.getDay()]}, ${monthNames[date.getMonth()]} ${date.getDate()}`
    }

    const getDayName = (dateStr: string): string => {
      if (timePeriod === '1Y' || timePeriod === 'ALL') {
        const [, month] = dateStr.split('-')
        const monthNames = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ]
        return monthNames[parseInt(month) - 1]
      }
      const [year, month, day] = dateStr.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      return dayNames[date.getDay()]
    }

    // Create a map to aggregate data by date
    const dataMap = new Map<string, DailyData>()

    // Initialize all dates in the range
    const currentDate = new Date(startDate)
    while (currentDate <= endDate) {
      const key = getGroupKey(currentDate)
      if (!dataMap.has(key)) {
        const isCurrentPeriod =
          timePeriod === '1Y' || timePeriod === 'ALL'
            ? currentDate.getFullYear() === today.getFullYear() &&
              currentDate.getMonth() === today.getMonth()
            : currentDate.toDateString() === today.toDateString()

        dataMap.set(key, {
          date: formatDisplayDate(key),
          fullDate: formatFullDate(key),
          dayName: getDayName(key),
          volume: 0,
          trades: 0,
          earnings: 0,
          fees: 0,
          isToday: isCurrentPeriod,
          sortKey: getSortKey(key),
        })
      }

      if (timePeriod === '1Y' || timePeriod === 'ALL') {
        currentDate.setMonth(currentDate.getMonth() + 1)
      } else {
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    // Process trades
    let tradesInRange = 0
    let tradesOutOfRange = 0
    trades.forEach((trade, index) => {
      const tradeDate = new Date(Number(trade.createdAt) * 1000)

      if (index < 3) {
        console.log('[DashboardChart] Trade sample:', {
          id: trade.id,
          createdAt: trade.createdAt,
          tradeDate: tradeDate.toISOString(),
          tokenIn: trade.tokenIn,
          amountIn: trade.amountIn,
        })
      }

      if (tradeDate < startDate || tradeDate > endDate) {
        tradesOutOfRange++
        return
      }
      tradesInRange++

      const key = getGroupKey(tradeDate)
      const data = dataMap.get(key)
      if (!data) return

      // Find tokens
      const tokenIn = tokenList.find(
        (t: TOKENS_TYPE) =>
          t.token_address?.toLowerCase() === trade.tokenIn?.toLowerCase()
      )
      const tokenOut = tokenList.find(
        (t: TOKENS_TYPE) =>
          t.token_address?.toLowerCase() === trade.tokenOut?.toLowerCase()
      )

      if (!tokenIn && tradesInRange <= 3) {
        console.log('[DashboardChart] TokenIn not found:', {
          tradeId: trade.id,
          tokenInAddress: trade.tokenIn,
        })
      }

      // Calculate volume
      if (tokenIn) {
        const formattedAmountIn = formatUnits(
          BigInt(trade.amountIn || '0'),
          tokenIn.decimals || 18
        )
        data.volume += Number(formattedAmountIn) * (tokenIn.usd_price || 0)
      }

      // Calculate fees (network fee - 15 bps)
      if (tokenIn) {
        const formattedAmountIn = formatUnits(
          BigInt(trade.amountIn || '0'),
          tokenIn.decimals || 18
        )
        const fee = (Number(formattedAmountIn) * 15) / 10000
        data.fees += fee * (tokenIn.usd_price || 0)
      }

      // Calculate earnings (instasettleBps savings)
      if (tokenOut) {
        const remainingAmountOut =
          BigInt(trade.minAmountOut) - BigInt(trade.realisedAmountOut)
        const formattedRemainingAmountOut = formatUnits(
          remainingAmountOut > 0 ? remainingAmountOut : BigInt(0),
          tokenOut.decimals || 18
        )
        const earnings =
          (Number(formattedRemainingAmountOut) * Number(trade.instasettleBps)) /
          10000
        data.earnings += earnings * (tokenOut.usd_price || 0)
      }

      data.trades++
    })

    console.log('[DashboardChart] Processing complete:', {
      tradesInRange,
      tradesOutOfRange,
      totalDataPoints: dataMap.size,
    })

    // Convert map to array and sort by sortKey (numeric comparison)
    const sortedData = Array.from(dataMap.values()).sort(
      (a, b) => a.sortKey - b.sortKey
    )

    // Log data with values
    const dataWithVolume = sortedData.filter(
      (d) => d.volume > 0 || d.trades > 0
    )
    console.log(
      '[DashboardChart] Data with values:',
      dataWithVolume.length,
      dataWithVolume.slice(0, 3)
    )

    return sortedData
  }, [trades, tokenList, timePeriod, getTimeRange])

  // Calculate container width based on data length
  const containerWidth = useMemo(() => {
    const dataLength = chartData.length
    let barWidth = 40
    let spacing = 20

    if (dataLength <= 7) {
      barWidth = 60
      spacing = 40
    } else if (dataLength <= 14) {
      barWidth = 50
      spacing = 30
    } else if (dataLength <= 31) {
      barWidth = 35
      spacing = 20
    }

    const padding = 100
    const minWidth =
      typeof window !== 'undefined' ? window.innerWidth * 0.5 : 600
    const calculatedWidth = Math.max(
      minWidth,
      dataLength * (barWidth + spacing) + padding
    )
    return calculatedWidth
  }, [chartData.length])

  // Scroll handling
  const updateScrollability = useCallback(() => {
    if (!containerRef.current) return

    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    const maxScroll = scrollWidth - clientWidth

    setCanScrollLeft(scrollLeft > 5)
    setCanScrollRight(scrollLeft < maxScroll - 5)
  }, [])

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
  }, [updateScrollability, chartData.length, containerWidth])

  useEffect(() => {
    return () => {
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current)
      }
    }
  }, [])

  const getBarColor = (isToday: boolean, isActive: boolean) => {
    if (isActive) return '#00e0ff'
    if (isToday) return '#FAEE40'
    return '#41fcb4'
  }

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(0)}`
  }

  if (isLoading || isLoadingTokenList) {
    return (
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="inline-flex items-center rounded-lg border border-[#373d3f] bg-[#0d0d0d] p-1">
            <button className="px-4 py-2 rounded-md text-sm font-medium bg-[#1a1a1a] text-white">
              TRADE VOLUME
            </button>
            <button className="px-4 py-2 rounded-md text-sm font-medium text-white/50">
              EARNINGS & FEES
            </button>
          </div>
          <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 border border-[#373d3f]">
            {TIME_PERIODS.map((period) => (
              <button
                key={period}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === timePeriod
                    ? 'bg-secondary text-primary'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#41fcb4]/30">
            <InstasettleIcon className="w-3.5 h-3.5 text-[#41fcb4]" />
            <span className="text-xs text-[#41fcb4]">Past</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#FAEE40]/30">
            <InstasettleIcon className="w-3.5 h-3.5 text-[#FAEE40]" />
            <span className="text-xs text-[#FAEE40]">Current</span>
          </div>
        </div>

        <div className="relative h-[400px] flex items-center justify-center">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="inline-flex items-center rounded-lg border border-[#373d3f] bg-[#0d0d0d] p-1">
          <button
            onClick={() => setDataView('volume')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              dataView === 'volume'
                ? 'bg-[#1a1a1a] text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            TRADE VOLUME
          </button>
          <button
            onClick={() => setDataView('earnings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              dataView === 'earnings'
                ? 'bg-[#1a1a1a] text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            EARNINGS & FEES
          </button>
        </div>
        <div className="flex gap-1 bg-[#1a1a1a] rounded-lg p-1 border border-[#373d3f]">
          {TIME_PERIODS.map((period) => (
            <button
              key={period}
              onClick={() => onTimePeriodChange(period)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === timePeriod
                  ? 'bg-secondary text-primary'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#41fcb4]/30">
          <InstasettleIcon className="w-3.5 h-3.5 text-[#41fcb4]" />
          <span className="text-xs text-[#41fcb4]">Past</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#FAEE40]/30">
          <InstasettleIcon className="w-3.5 h-3.5 text-[#FAEE40]" />
          <span className="text-xs text-[#FAEE40]">Current</span>
        </div>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            onMouseDown={() => scrollInDirection('left')}
            onMouseUp={stopScrolling}
            onMouseLeave={stopScrolling}
            onTouchStart={() => scrollInDirection('left')}
            onTouchEnd={stopScrolling}
            className={`absolute left-4 top-[50%] -translate-y-1/2 z-20 border rounded-full p-1.5 transition-all duration-150 backdrop-blur-sm ${
              activeArrow === 'left'
                ? 'bg-primary/30 border-primary/70 shadow-lg shadow-primary/50 scale-90'
                : 'bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/40 shadow-md shadow-primary/20'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 text-primary" strokeWidth={2.5} />
          </button>
        )}
        {canScrollRight && (
          <button
            onMouseDown={() => scrollInDirection('right')}
            onMouseUp={stopScrolling}
            onMouseLeave={stopScrolling}
            onTouchStart={() => scrollInDirection('right')}
            onTouchEnd={stopScrolling}
            className={`absolute right-4 top-[50%] -translate-y-1/2 z-20 border rounded-full p-1.5 transition-all duration-150 backdrop-blur-sm ${
              activeArrow === 'right'
                ? 'bg-primary/30 border-primary/70 shadow-lg shadow-primary/50 scale-90'
                : 'bg-gradient-to-l from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border-primary/40 shadow-md shadow-primary/20'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 text-primary" strokeWidth={2.5} />
          </button>
        )}

        <div
          className="absolute left-0 top-0 bottom-[35px] w-20 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, black, rgba(0, 0, 0, 0.9) 30%, transparent)',
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-[35px] w-20 z-10 pointer-events-none"
          style={{
            background:
              'linear-gradient(to left, black, rgba(0, 0, 0, 0.9) 30%, transparent)',
          }}
        />

        <div
          className="absolute left-2 top-[40%] -translate-y-1/2 z-10 pointer-events-none"
          style={{
            writingMode: 'vertical-rl',
            transform: 'translateY(-50%) rotate(180deg)',
          }}
        >
          <span className="text-xs font-medium" style={{ color: '#41fcb4' }}>
            {dataView === 'volume'
              ? 'Trade Volume (USD)'
              : 'Earnings & Fees (USD)'}
          </span>
        </div>

        <div
          ref={containerRef}
          className="overflow-x-auto chart-scroll relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          style={{
            width: '100%',
            height: '400px',
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
            <ChartContainer
              config={chartConfig}
              className="h-full w-full relative"
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 50,
                  bottom: 40,
                }}
                onMouseMove={(state) => {
                  if (state?.activeTooltipIndex !== undefined) {
                    setActiveBar(state.activeTooltipIndex)
                  }
                }}
                onMouseLeave={() => {
                  setActiveBar(null)
                }}
              >
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fill: '#888', fontSize: 11 }}
                  label={{
                    value: 'Date',
                    position: 'insideBottom',
                    offset: -10,
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
                  tickFormatter={(value) => formatValue(value)}
                />
                <Bar
                  dataKey={dataView === 'volume' ? 'volume' : 'earnings'}
                  radius={8}
                  maxBarSize={60}
                  minPointSize={5}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.isToday, activeBar === index)}
                      style={{ transition: 'fill 0.2s ease' }}
                    />
                  ))}
                </Bar>
                <ChartTooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DailyData
                      return (
                        <div className="rounded-lg border border-white/10 bg-black/95 p-3 shadow-xl backdrop-blur-sm">
                          <div className="text-sm font-semibold text-white mb-2">
                            {data.fullDate}
                          </div>
                          <div className="grid gap-1.5">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-white/60">
                                Trade Volume
                              </span>
                              <span className="text-sm font-bold text-white">
                                {formatValue(data.volume)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-xs text-white/60">
                                Trades
                              </span>
                              <span className="text-sm font-bold text-white">
                                {data.trades.toLocaleString()}
                              </span>
                            </div>
                            {dataView === 'earnings' && (
                              <>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs text-white/60">
                                    Earnings
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {formatValue(data.earnings)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <span className="text-xs text-white/60">
                                    Fees
                                  </span>
                                  <span className="text-sm font-bold text-white">
                                    {formatValue(data.fees)}
                                  </span>
                                </div>
                              </>
                            )}
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
  )
}

export default DashboardChart
