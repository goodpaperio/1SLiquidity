'use client'

import { useState, useMemo } from 'react'
import { ArrowRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { useCustomTokenList } from '@/app/lib/hooks/useCustomTokensList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { formatUnits } from 'viem'
import { formatRelativeTime } from '@/app/lib/utils/time'
import { formatWalletAddress } from '@/app/lib/helper'
import ImageFallback from '@/app/shared/ImageFallback'
import InstasettlePill from '@/app/components/shared/InstasettlePill'
import { cn } from '@/lib/utils'

type SortField = 'volume' | 'timestamp' | 'status' | null
type SortDirection = 'asc' | 'desc'

interface TransactionsTableProps {
  selectedTokenFrom: TOKENS_TYPE | null
  selectedTokenTo: TOKENS_TYPE | null
  walletId: string | null
}

const SortIcon = ({
  field,
  currentField,
  direction,
}: {
  field: SortField
  currentField: SortField
  direction: SortDirection
}) => {
  if (currentField !== field) {
    return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />
  }
  return direction === 'asc' ? (
    <ArrowUp className="w-4 h-4 ml-1 text-primary" />
  ) : (
    <ArrowDown className="w-4 h-4 ml-1 text-primary" />
  )
}

const TransactionsTable: React.FC<TransactionsTableProps> = ({
  selectedTokenFrom,
  selectedTokenTo,
  walletId,
}) => {
  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const { trades, isLoading, error } = useTrades({ first: 1000, skip: 0 })
  const { tokens: tokenList, isLoading: isLoadingTokens } = useCustomTokenList()

  // Find token for trade with ETH/WETH handling
  const findTokenForTrade = (address: string) => {
    const ethWethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    if (address?.toLowerCase() === ethWethAddress) {
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
    return tokenList.find(
      (t: TOKENS_TYPE) =>
        t.token_address?.toLowerCase() === address?.toLowerCase()
    )
  }

  // Get trade status
  const getTradeStatus = (trade: any) => {
    if (trade.cancellations?.length > 0) {
      return trade.cancellations[0].isAutocancelled ? 'failed' : 'cancelled'
    }
    if (trade.instasettlements?.length > 0) {
      return 'instasettled'
    }
    if (
      trade.executions?.some((exec: any) => exec.lastSweetSpot === '0')
    ) {
      return 'completed'
    }
    return 'ongoing'
  }

  // Filter and sort trades
  const displayData = useMemo(() => {
    if (!trades.length || !tokenList.length) return []

    let filteredTrades = [...trades]

    // Filter by wallet if provided
    if (walletId) {
      filteredTrades = filteredTrades.filter(
        (trade) => trade.user?.toLowerCase() === walletId.toLowerCase()
      )
    }

    // Filter by tokens
    if (selectedTokenFrom) {
      filteredTrades = filteredTrades.filter(
        (trade) =>
          trade.tokenIn?.toLowerCase() ===
          selectedTokenFrom.token_address?.toLowerCase()
      )
    }
    if (selectedTokenTo) {
      filteredTrades = filteredTrades.filter(
        (trade) =>
          trade.tokenOut?.toLowerCase() ===
          selectedTokenTo.token_address?.toLowerCase()
      )
    }

    // Add calculated fields
    const processedTrades = filteredTrades.map((trade) => {
      const tokenIn = findTokenForTrade(trade.tokenIn)
      const tokenOut = findTokenForTrade(trade.tokenOut)

      const formattedAmountIn = tokenIn
        ? formatUnits(BigInt(trade.amountIn || '0'), tokenIn.decimals || 18)
        : '0'
      const formattedAmountOut = tokenOut
        ? formatUnits(BigInt(trade.minAmountOut || '0'), tokenOut.decimals || 18)
        : '0'

      const volumeUsd = tokenIn
        ? Number(formattedAmountIn) * (tokenIn.usd_price || 0)
        : 0

      return {
        ...trade,
        tokenInDetails: tokenIn,
        tokenOutDetails: tokenOut,
        formattedAmountIn,
        formattedAmountOut,
        volumeUsd,
        status: getTradeStatus(trade),
      }
    })

    // Sort
    if (sortField) {
      processedTrades.sort((a, b) => {
        let comparison = 0
        switch (sortField) {
          case 'volume':
            comparison = a.volumeUsd - b.volumeUsd
            break
          case 'timestamp':
            comparison = Number(a.createdAt) - Number(b.createdAt)
            break
          case 'status':
            const statusOrder = {
              ongoing: 0,
              instasettled: 1,
              completed: 2,
              cancelled: 3,
              failed: 4,
            }
            comparison =
              (statusOrder[a.status as keyof typeof statusOrder] || 0) -
              (statusOrder[b.status as keyof typeof statusOrder] || 0)
            break
        }
        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return processedTrades
  }, [trades, tokenList, selectedTokenFrom, selectedTokenTo, walletId, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatVolume = (value: number): string => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`
    }
    return `$${value.toFixed(2)}`
  }

  // Loading skeleton
  if (isLoading || isLoadingTokens) {
    return (
      <div className="rounded-xl border border-[#373d3f] bg-black overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-[#373d3f] hover:bg-transparent">
              <TableHead className="text-white/70">Token Pair</TableHead>
              <TableHead className="text-white/70">Volume</TableHead>
              <TableHead className="text-white/70">Output</TableHead>
              <TableHead className="text-white/70">Status</TableHead>
              <TableHead className="text-white/70">Time</TableHead>
              <TableHead className="text-white/70">Wallet</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(10)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i} className="border-b border-[#373d3f]/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="w-4 h-4" />
                      <Skeleton className="w-6 h-6 rounded-full" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-20 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-24 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-16 h-6 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-16 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-24 h-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="w-5 h-5" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-8 text-center">
        <p className="text-red-400">Error loading transactions: {(error as Error).message}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#373d3f] bg-black overflow-hidden">
      <ScrollArea className="w-full">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="border-b border-[#373d3f] hover:bg-transparent">
              <TableHead className="text-white/70 min-w-[140px]">Token Pair</TableHead>
              <TableHead
                className="text-white/70 cursor-pointer hover:text-white transition-colors min-w-[120px]"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center">
                  Volume
                  <SortIcon field="volume" currentField={sortField} direction={sortDirection} />
                </div>
              </TableHead>
              <TableHead className="text-white/70 min-w-[140px]">Output</TableHead>
              <TableHead
                className="text-white/70 cursor-pointer hover:text-white transition-colors min-w-[120px]"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  <SortIcon field="status" currentField={sortField} direction={sortDirection} />
                </div>
              </TableHead>
              <TableHead
                className="text-white/70 cursor-pointer hover:text-white transition-colors min-w-[100px]"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center">
                  Time
                  <SortIcon field="timestamp" currentField={sortField} direction={sortDirection} />
                </div>
              </TableHead>
              {!walletId && (
                <TableHead className="text-white/70 min-w-[120px]">Wallet</TableHead>
              )}
              <TableHead className="min-w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={walletId ? 6 : 7} className="text-center py-12">
                  <p className="text-white/50">No transactions found</p>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((trade) => (
                <TableRow
                  key={trade.id}
                  className="border-b border-[#373d3f]/50 hover:bg-white/5 transition-colors"
                >
                  {/* Token Pair */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ImageFallback
                        src={
                          trade.tokenInDetails?.symbol?.toLowerCase() === 'usdt'
                            ? '/tokens/usdt.svg'
                            : trade.tokenInDetails?.icon || '/icons/default-token.svg'
                        }
                        width={24}
                        height={24}
                        alt={trade.tokenInDetails?.symbol || 'token'}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-white/50">→</span>
                      <ImageFallback
                        src={
                          trade.tokenOutDetails?.symbol?.toLowerCase() === 'usdt'
                            ? '/tokens/usdt.svg'
                            : trade.tokenOutDetails?.icon || '/icons/default-token.svg'
                        }
                        width={24}
                        height={24}
                        alt={trade.tokenOutDetails?.symbol || 'token'}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-white/70 text-sm">
                        {trade.tokenInDetails?.symbol || '?'}/{trade.tokenOutDetails?.symbol || '?'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Volume */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-white">
                        {Number(trade.formattedAmountIn).toFixed(4)} {trade.tokenInDetails?.symbol}
                      </span>
                      <span className="text-white/50 text-xs">
                        {formatVolume(trade.volumeUsd)}
                      </span>
                    </div>
                  </TableCell>

                  {/* Output */}
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-white">
                        {Number(trade.formattedAmountOut).toFixed(4)} {trade.tokenOutDetails?.symbol}
                      </span>
                      {trade.tokenOutDetails?.usd_price && (
                        <span className="text-white/50 text-xs">
                          {formatVolume(
                            Number(trade.formattedAmountOut) * trade.tokenOutDetails.usd_price
                          )}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <div
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        trade.status === 'ongoing' && 'bg-primary/20 text-primary',
                        trade.status === 'completed' && 'bg-green-900/20 text-green-400',
                        trade.status === 'instasettled' && 'bg-green-900/20 text-green-400',
                        trade.status === 'cancelled' && 'bg-red-900/20 text-red-400',
                        trade.status === 'failed' && 'bg-red-900/20 text-red-400'
                      )}
                    >
                      {trade.status === 'instasettled' ? (
                        <InstasettlePill isSettled={true} variant="instasettled" />
                      ) : trade.status === 'ongoing' && trade.isInstasettlable ? (
                        <InstasettlePill isSettled={false} variant="instasettled" />
                      ) : (
                        <span className="capitalize">{trade.status}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Time */}
                  <TableCell>
                    <span className="text-white/70 text-sm">
                      {formatRelativeTime(trade.createdAt)}
                    </span>
                  </TableCell>

                  {/* Wallet */}
                  {!walletId && (
                    <TableCell>
                      <Link
                        href={`/transactions?walletId=${trade.user}`}
                        className="text-primary/70 hover:text-primary transition-colors text-sm font-mono"
                      >
                        {formatWalletAddress(trade.user)}
                      </Link>
                    </TableCell>
                  )}

                  {/* Action */}
                  <TableCell>
                    <Link
                      href={`/trade/${trade.tradeId}`}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors inline-flex"
                    >
                      <ArrowRight className="w-4 h-4 text-white/50 hover:text-white" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Results count */}
      <div className="px-4 py-3 border-t border-[#373d3f]/50 text-white/50 text-sm">
        Showing {displayData.length} transaction{displayData.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

export default TransactionsTable
