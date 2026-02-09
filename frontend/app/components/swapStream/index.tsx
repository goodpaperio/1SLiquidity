'use client'

import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import React from 'react'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { cn } from '@/lib/utils'
import { useStreamTime } from '@/app/lib/hooks/useStreamTime'
import ImageFallback from '@/app/shared/ImageFallback'
import { XIcon } from 'lucide-react'
import { formatNumberSmart } from '@/app/lib/utils/number'
import { calculateRemainingStreams } from '@/app/lib/utils/streams'
import InstasettlePill from '@/app/components/shared/InstasettlePill'
import { Cancellation } from '@/app/lib/graphql/types/trade'

type Trade = {
  id: string
  amountIn: string
  amountRemaining: string
  minAmountOut: string
  tokenIn: string
  tokenOut: string
  isInstasettlable: boolean
  realisedAmountOut: string
  lastSweetSpot: string
  executions: any[]
  settlements: any[]
  cancellations: Cancellation[]
  onlyInstasettle?: boolean
}

type Props = {
  trade: Trade
  onClick?: (trade: Trade) => void
  isUser?: boolean
  isLoading?: boolean
}

const SwapStream: React.FC<Props> = ({ trade, onClick, isUser, isLoading }) => {
  const { tokens, isLoading: isLoadingTokens } = useTokenList()
  const remainingStreams = calculateRemainingStreams(trade)
  const estimatedTime = useStreamTime(remainingStreams, 5)

  // Find token information with ETH/WETH handling
  const findTokenForTrade = (address: string) => {
    const ethWethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    if (address?.toLowerCase() === ethWethAddress) {
      // For streams, prefer WETH over ETH since most DeFi protocols use WETH
      return (
        tokens.find(
          (t: TOKENS_TYPE) =>
            t.token_address?.toLowerCase() === address?.toLowerCase() &&
            t.symbol.toLowerCase() === 'weth'
        ) ||
        tokens.find(
          (t: TOKENS_TYPE) =>
            t.token_address?.toLowerCase() === address?.toLowerCase()
        )
      )
    }
    // For all other cases, use normal address matching
    return tokens.find(
      (t: TOKENS_TYPE) =>
        t.token_address?.toLowerCase() === address?.toLowerCase()
    )
  }

  const tokenIn = findTokenForTrade(trade.tokenIn)
  const tokenOut = findTokenForTrade(trade.tokenOut)

  // Format amounts using token decimals
  const formattedAmountIn = tokenIn
    ? formatUnits(BigInt(trade.amountIn), tokenIn.decimals)
    : '0'
  const formattedMinAmountOut = tokenOut
    ? formatUnits(BigInt(trade.minAmountOut), tokenOut.decimals)
    : '0'

  if (isLoadingTokens) {
    return (
      <div className="w-full border border-white14 relative bg-white005 p-4 rounded-[15px]">
        <Skeleton className="h-[100px] w-full" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full border border-white14 relative bg-white005 p-4 rounded-[15px] cursor-pointer hover:bg-tabsGradient transition-all duration-300',
        trade.cancellations.length > 0 && 'border-[#3d0e0e] hover:bg-red-700/10'
      )}
      onClick={() => onClick?.(trade)}
    >
      <div className="flex mr-8 items-center gap-1.5 absolute top-4 left-2">
        <Image
          src="/icons/swap-stream.svg"
          width={24}
          height={24}
          alt="swapStream"
        />
      </div>

      {/* main content */}
      <div className="ml-[27px] flex flex-col">
        <div className="flex gap-[6px] items-center">
          <div className="flex items-center gap-1">
            {isLoading ? (
              <>
                <Skeleton className="w-[18px] h-[18px] rounded-full" />
                <Skeleton className="w-24 h-4" />
              </>
            ) : (
              <>
                <ImageFallback
                  src={
                    (tokenIn?.symbol.toLowerCase() === 'usdt'
                      ? '/tokens/usdt.svg'
                      : tokenIn?.icon) || '/icons/default-token.svg'
                  }
                  width={2400}
                  height={2400}
                  alt={tokenIn?.symbol || 'token'}
                  className="w-[18px] h-[18px] rounded-full overflow-hidden"
                />
                <p className="text-white uppercase">
                  {formatNumberSmart(formattedAmountIn)} {tokenIn?.symbol}
                </p>
              </>
            )}
          </div>
          <Image
            src="/icons/right-arrow.svg"
            width={2400}
            height={2400}
            alt="swapStream"
            className="w-[10px]"
          />
          <div className="flex items-center gap-1">
            {isLoading ? (
              <>
                <Skeleton className="w-[18px] h-[18px] rounded-full" />
                <Skeleton className="w-24 h-4" />
              </>
            ) : (
              <>
                <ImageFallback
                  src={
                    (tokenOut?.symbol.toLowerCase() === 'usdt'
                      ? '/tokens/usdt.svg'
                      : tokenOut?.icon) || '/icons/default-token.svg'
                  }
                  width={2400}
                  height={2400}
                  alt={tokenOut?.symbol || 'token'}
                  className="w-[18px] h-[18px] rounded-full overflow-hidden"
                />
                <p className="text-white uppercase">
                  {formatNumberSmart(formattedMinAmountOut)} {tokenOut?.symbol}{' '}
                  (EST)
                </p>
              </>
            )}
          </div>
        </div>

        <div className="w-full h-[3px] bg-white005 mt-[12px] relative">
          {isLoading ? (
            <Skeleton className="h-[3px] w-1/4 absolute top-0 left-0" />
          ) : (
            <div
              className={cn(
                'h-[3px] bg-primary absolute top-0 left-0',
                trade.cancellations.length > 0 && 'bg-red-700'
              )}
              style={{
                width: `${Math.min(
                  ((trade.settlements.length > 0
                    ? trade.settlements.length + trade.executions.length
                    : trade.executions.length) /
                    (trade.settlements.length > 0
                      ? trade.settlements.length + trade.executions.length
                      : remainingStreams)) *
                    100,
                  100
                )}%`,
              }}
            />
          )}
        </div>

        <div
          className={cn(
            'flex flex-wrap items-center gap-x-2 gap-y-1 text-white52',
            isLoading ? 'mt-3.5' : 'mt-1.5'
          )}
        >
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </>
          ) : (
            <>
              {!trade.onlyInstasettle && (
                <>
                  <p className="whitespace-nowrap">
                    {trade.settlements.length > 0
                      ? trade.settlements.length + trade.executions.length
                      : trade.executions.length}{' '}
                    /{' '}
                    {trade.settlements.length > 0
                      ? trade.settlements.length + trade.executions.length
                      : remainingStreams}{' '}
                    completed
                  </p>

                  {trade.settlements.length > 0 ||
                  trade.cancellations.length > 0 ||
                  (trade.settlements.length > 0
                    ? trade.settlements.length + trade.executions.length
                    : trade.executions.length) >=
                    (trade.settlements.length > 0
                      ? trade.settlements.length + trade.executions.length
                      : remainingStreams) ? (
                    ''
                  ) : (
                    <div className="flex items-center whitespace-nowrap ml-auto">
                      <Image
                        src="/icons/time.svg"
                        alt="clock"
                        className="w-5"
                        width={20}
                        height={20}
                      />
                      <p>{estimatedTime || '..'}</p>
                    </div>
                  )}
                </>
              )}
              {trade.isInstasettlable && !trade.onlyInstasettle && (
                <InstasettlePill
                  isSettled={trade.settlements.length > 0}
                  variant="instasettled"
                />
              )}

              {trade.onlyInstasettle && (
                <InstasettlePill
                  isSettled={trade.settlements.length > 0}
                  variant="only-instasettlable"
                />
              )}

              {trade.cancellations.length > 0 && (
                <div className="flex items-center text-sm gap-1 bg-zinc-900 pl-1 pr-1.5 text-red-700 rounded-full leading-none whitespace-nowrap ml-auto">
                  <XIcon className="w-3.5 h-3.5" />
                  <span className="text-xs sm:inline-block hidden">
                    {trade.cancellations[0].isAutocancelled
                      ? 'Failed'
                      : 'User Cancelled'}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SwapStream
