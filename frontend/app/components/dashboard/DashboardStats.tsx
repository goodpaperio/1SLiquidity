'use client'

import { useMemo } from 'react'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { useCustomTokenList } from '@/app/lib/hooks/useCustomTokensList'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { TimePeriod } from './index'

interface StatCardProps {
  title: string
  value: string
  subValue?: string
  subLabel?: string
  highlight?: boolean
}

const StatCard = ({
  title,
  value,
  subValue,
  subLabel,
  highlight,
}: StatCardProps) => {
  return (
    <div
      className={`relative flex flex-col p-4 rounded-xl border ${
        highlight
          ? 'border-primary bg-gradient-to-br from-[#0a2018] to-[#071510]'
          : 'border-[#373d3f] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d]'
      }`}
    >
      <span className="text-lg text-white/70 uppercase tracking-wider mb-1">
        {title}
      </span>
      <span className="text-2xl md:text-3xl font-bold text-white">{value}</span>
      {subValue && (
        <div className="mt-2 flex items-center justify-end gap-1.5">
          <span className="text-primary text-sm font-medium">{subValue}</span>
          {subLabel && (
            <span className="text-white/50 text-[10px]">{subLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

interface DashboardStatsProps {
  timePeriod: TimePeriod
}

const getTimePeriodLabel = (period: TimePeriod): string => {
  switch (period) {
    case '1D':
      return '1D'
    case '1W':
      return '1W'
    case '1M':
      return '1M'
    case '1Y':
      return '1Y'
    case 'ALL':
      return 'ALL'
    default:
      return '1M'
  }
}

const getTimeRange = (period: TimePeriod) => {
  const now = Date.now()
  switch (period) {
    case '1D':
      return { start: now - 24 * 60 * 60 * 1000, subPeriodMs: 60 * 60 * 1000 } // 1 hour sub-period
    case '1W':
      return {
        start: now - 7 * 24 * 60 * 60 * 1000,
        subPeriodMs: 24 * 60 * 60 * 1000,
      } // 1 day sub-period
    case '1M':
      return {
        start: now - 30 * 24 * 60 * 60 * 1000,
        subPeriodMs: 24 * 60 * 60 * 1000,
      } // 1 day sub-period
    case '1Y':
      return {
        start: now - 365 * 24 * 60 * 60 * 1000,
        subPeriodMs: 30 * 24 * 60 * 60 * 1000,
      } // 1 month sub-period
    case 'ALL':
    default:
      return { start: 0, subPeriodMs: 30 * 24 * 60 * 60 * 1000 } // 1 month sub-period
  }
}

const getSubPeriodLabel = (period: TimePeriod): string => {
  switch (period) {
    case '1D':
      return '1H'
    case '1W':
      return '1D'
    case '1M':
      return '1D'
    case '1Y':
      return '1M'
    case 'ALL':
      return '1M'
    default:
      return '1D'
  }
}

const DashboardStats = ({ timePeriod }: DashboardStatsProps) => {
  const { trades, isLoading } = useTrades({ first: 1000, skip: 0 })
  const { tokens: tokenList, isLoading: isLoadingTokenList } =
    useCustomTokenList()

  // Calculate stats from trades data based on selected time period
  const stats = useMemo(() => {
    console.log('[DashboardStats] Processing data:', {
      tradesCount: trades?.length || 0,
      tokenListCount: tokenList?.length || 0,
      timePeriod,
      sampleTokens: tokenList?.slice(0, 5).map((t: TOKENS_TYPE) => ({
        symbol: t.symbol,
        address: t.token_address,
        usd_price: t.usd_price,
      })),
    })

    if (
      !trades ||
      trades.length === 0 ||
      !tokenList ||
      tokenList.length === 0
    ) {
      console.log('[DashboardStats] No data available')
      return {
        totalTrades: 0,
        totalVolume: 0,
        totalSavings: 0,
        subPeriodTrades: 0,
        subPeriodVolume: 0,
        subPeriodSavings: 0,
        streamsCount: 0,
      }
    }

    const now = Date.now()
    const { start: periodStart, subPeriodMs } = getTimeRange(timePeriod)
    const subPeriodStart = now - subPeriodMs

    console.log('[DashboardStats] Time range:', {
      now: new Date(now).toISOString(),
      periodStart: new Date(periodStart).toISOString(),
      subPeriodStart: new Date(subPeriodStart).toISOString(),
    })

    let totalVolume = 0
    let totalSavings = 0
    let totalTrades = 0
    let subPeriodVolume = 0
    let subPeriodSavings = 0
    let subPeriodTrades = 0
    let tradesWithToken = 0
    let tradesWithoutToken = 0

    trades.forEach((trade, index) => {
      const tradeTimestamp = Number(trade.createdAt) * 1000

      if (index < 3) {
        console.log('[DashboardStats] Trade sample:', {
          id: trade.id,
          createdAt: trade.createdAt,
          tradeDate: new Date(tradeTimestamp).toISOString(),
          tokenIn: trade.tokenIn,
          amountIn: trade.amountIn,
        })
      }

      // Find token for calculations
      const tokenIn = tokenList.find(
        (t: TOKENS_TYPE) =>
          t.token_address?.toLowerCase() === trade.tokenIn?.toLowerCase()
      )
      const tokenOut = tokenList.find(
        (t: TOKENS_TYPE) =>
          t.token_address?.toLowerCase() === trade.tokenOut?.toLowerCase()
      )

      if (tokenIn) {
        tradesWithToken++
      } else {
        tradesWithoutToken++
        if (tradesWithoutToken <= 3) {
          console.log('[DashboardStats] Token not found for trade:', {
            tradeId: trade.id,
            tokenIn: trade.tokenIn,
            availableTokens: tokenList
              .slice(0, 5)
              .map((t: TOKENS_TYPE) => t.token_address),
          })
        }
      }

      // Calculate volume (amountIn in USD)
      let tradeVolume = 0
      if (tokenIn) {
        const formattedAmountIn = formatUnits(
          BigInt(trade.amountIn || '0'),
          tokenIn.decimals || 18
        )
        tradeVolume = Number(formattedAmountIn) * (tokenIn.usd_price || 0)
      }

      // Calculate savings
      let tradeSavings = 0
      if (tokenOut) {
        const remainingAmountOut =
          BigInt(trade.minAmountOut) - BigInt(trade.realisedAmountOut)
        const formattedRemainingAmountOut = formatUnits(
          remainingAmountOut > 0 ? remainingAmountOut : BigInt(0),
          tokenOut.decimals || 18
        )
        const savingsInTokenOut =
          (Number(formattedRemainingAmountOut) * Number(trade.instasettleBps)) /
          10000
        tradeSavings = savingsInTokenOut * (tokenOut.usd_price || 0)
      }

      // Period stats (based on selected time period)
      if (tradeTimestamp >= periodStart) {
        totalTrades++
        totalVolume += tradeVolume
        totalSavings += tradeSavings
      }

      // Sub-period stats (for the bottom right display)
      if (tradeTimestamp >= subPeriodStart) {
        subPeriodTrades++
        subPeriodVolume += tradeVolume
        subPeriodSavings += tradeSavings
      }
    })

    console.log('[DashboardStats] Final stats:', {
      totalTrades,
      totalVolume,
      totalSavings,
      subPeriodTrades,
      subPeriodVolume,
      subPeriodSavings,
      tradesWithToken,
      tradesWithoutToken,
      streamsCount: trades.length,
    })

    return {
      totalTrades,
      totalVolume,
      totalSavings,
      subPeriodTrades,
      subPeriodVolume,
      subPeriodSavings,
      streamsCount: trades.length,
    }
  }, [trades, tokenList, timePeriod])

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`
    }
    return `$${value.toFixed(2)}`
  }

  const formatNumber = (value: number): string => {
    return value.toLocaleString()
  }

  const periodLabel = getTimePeriodLabel(timePeriod)
  const subPeriodLabel = getSubPeriodLabel(timePeriod)

  if (isLoading || isLoadingTokenList) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col p-4 rounded-xl border border-[#373d3f] bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] animate-pulse"
          >
            <div className="h-3 bg-white/10 rounded w-20 mb-2"></div>
            <div className="h-8 bg-white/10 rounded w-28 mb-2"></div>
            <div className="h-3 bg-white/10 rounded w-24 ml-auto"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
      <StatCard
        title={`TRADES (${periodLabel})`}
        value={formatNumber(stats.totalTrades)}
        subValue={`${formatNumber(stats.streamsCount)}+ STREAMS`}
        highlight={true}
      />
      <StatCard
        title={`VOLUME (${periodLabel})`}
        value={formatCurrency(stats.totalVolume)}
        subValue={formatCurrency(stats.subPeriodVolume)}
        subLabel={`(${subPeriodLabel})`}
      />
      <StatCard
        title={`SAVINGS (${periodLabel})`}
        value={formatCurrency(stats.totalSavings)}
        subValue={formatCurrency(stats.subPeriodSavings)}
        subLabel={`(${subPeriodLabel})`}
      />
    </div>
  )
}

export default DashboardStats
