'use client'

import { useMemo } from 'react'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import SwapStream from '../swapStream'
import { LiveStatisticsIcon } from '@/app/lib/icons'
import Link from 'next/link'
import { isTradeCompleted } from '@/app/lib/utils/tradeStatus'
import {
  tradeDisplayNotionalUsd,
} from '@/app/lib/utils/tradeDisplay'
import type { TimePeriod } from '@/app/lib/utils/dashboardChartGrouping'
import {
  type ChartBarSelection,
  tradeMatchesChartBar,
} from '@/app/lib/utils/dashboardChartGrouping'

interface DashboardTradesProps {
  timePeriod: TimePeriod
  selectedBar: ChartBarSelection | null
  onClearBarFilter: () => void
}

const DashboardTrades = ({
  timePeriod,
  selectedBar,
  onClearBarFilter,
}: DashboardTradesProps) => {
  const { trades, isLoading } = useTrades({ first: 1000, skip: 0 })
  const { tokens } = useTokenList()

  // Filter ongoing and completed trades
  const { ongoingTrades, latestTrades, ongoingVolume } = useMemo(() => {
    if (!trades || trades.length === 0) {
      return { ongoingTrades: [], latestTrades: [], ongoingVolume: 0 }
    }

    const filteredTrades = trades.filter(
      (trade) =>
        !selectedBar ||
        tradeMatchesChartBar(trade.createdAt, selectedBar.groupKey, timePeriod)
    )

    const ongoing = filteredTrades.filter((trade) => !isTradeCompleted(trade))
    const completed = filteredTrades
      .filter((trade) => isTradeCompleted(trade))
      .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))

    const latestLimit = selectedBar ? completed.length : 4

    // Calculate ongoing volume
    let volume = 0
    if (tokens && tokens.length > 0) {
      ongoing.forEach((trade) => {
        volume += tradeDisplayNotionalUsd(trade, tokens)
      })
    }

    return {
      ongoingTrades: ongoing,
      latestTrades: completed.slice(0, latestLimit),
      ongoingVolume: volume,
    }
  }, [trades, tokens, selectedBar, timePeriod])

  const formatVolume = (value: number): string => {
    if (value >= 1000000) {
      return `$ ${(value / 1000000).toFixed(1)} M`
    } else if (value >= 1000) {
      return `$ ${(value / 1000).toFixed(1)} K`
    }
    return `$ ${value.toFixed(2)}`
  }

  return (
    <div className="mt-12 space-y-10">
      {/* On-going Trades Section */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold text-white">On-going Trades</h2>
          <LiveStatisticsIcon className="w-5 h-5 text-primary" />
        </div>

        {/* Stats display */}
        <div className="inline-flex items-center gap-4 mb-6">
          <div className="flex items-center rounded-lg border border-[#373d3f] bg-[#0d0d0d] px-4 py-2">
            <span className="text-sm font-medium text-white">VOLUME</span>
            <span className="text-primary ml-2 text-sm font-medium">
              {formatVolume(ongoingVolume)}
            </span>
          </div>
          <div className="flex items-center rounded-lg border border-[#373d3f] bg-[#0d0d0d] px-4 py-2">
            <span className="text-sm font-medium text-white">TRADES</span>
            <span className="text-primary ml-2 text-sm font-medium">
              {ongoingTrades.length}
            </span>
          </div>
        </div>

        {/* Ongoing Trades List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            Array(3)
              .fill(0)
              .map((_, index) => (
                <SwapStream
                  key={`skeleton-ongoing-${index}`}
                  trade={{
                    id: '',
                    lastSweetSpot: '',
                    amountIn: '0',
                    amountRemaining: '0',
                    minAmountOut: '0',
                    tokenIn: '',
                    tokenOut: '',
                    isInstasettlable: false,
                    realisedAmountOut: '0',
                    executions: [],
                    instasettlements: [],
                    cancellations: [],
                  }}
                  isLoading={true}
                />
              ))
          ) : ongoingTrades.length === 0 ? (
            <div className="text-white/50 text-center py-8">
              No ongoing trades
            </div>
          ) : (
            ongoingTrades
              .slice(0, selectedBar ? ongoingTrades.length : 3)
              .map((trade) => (
                <SwapStream
                  key={trade.id}
                  trade={trade}
                  isLoading={false}
                  linkToTradePage={true}
                />
              ))
          )}
        </div>
      </div>

      {/* Latest Trades Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white">Latest Trades</h2>
            {selectedBar && (
              <>
                <span className="text-sm text-white/50">
                  {selectedBar.fullDate}
                </span>
                <button
                  type="button"
                  onClick={onClearBarFilter}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Clear filter
                </button>
              </>
            )}
          </div>
          {!selectedBar && (
            <Link
              href="/transactions"
              className="text-white/50 hover:text-primary text-sm transition-colors"
            >
              View More →
            </Link>
          )}
        </div>

        {/* Latest Trades List */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            Array(4)
              .fill(0)
              .map((_, index) => (
                <SwapStream
                  key={`skeleton-latest-${index}`}
                  trade={{
                    id: '',
                    lastSweetSpot: '',
                    amountIn: '0',
                    amountRemaining: '0',
                    minAmountOut: '0',
                    tokenIn: '',
                    tokenOut: '',
                    isInstasettlable: false,
                    realisedAmountOut: '0',
                    executions: [],
                    instasettlements: [],
                    cancellations: [],
                  }}
                  isLoading={true}
                />
              ))
          ) : latestTrades.length === 0 ? (
            <div className="text-white/50 text-center py-8">
              {selectedBar
                ? 'No trades for this period'
                : 'No completed trades yet'}
            </div>
          ) : (
            latestTrades.map((trade) => (
              <SwapStream
                key={trade.id}
                trade={trade}
                isLoading={false}
                linkToTradePage={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default DashboardTrades
