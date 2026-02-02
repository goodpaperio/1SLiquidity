'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion, Variants, useAnimation } from 'framer-motion'
import Image from 'next/image'
import { useTrade } from '@/app/lib/hooks/useTrade'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { useWallet } from '@/app/lib/hooks/useWallet'
import { useCoreTrading } from '@/app/lib/hooks/useCoreTrading'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { formatWalletAddress } from '@/app/lib/helper'
import { formatNumberSmart } from '@/app/lib/utils/number'
import { formatRelativeTime } from '@/app/lib/utils/time'
import { calculateRemainingStreams } from '@/app/lib/utils/streams'
import { useStreamTime } from '@/app/lib/hooks/useStreamTime'
import { cn } from '@/lib/utils'
import { ArrowLeft, Copy, Check, Search } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import Button from '@/app/components/button'
import TokenBar from '@/app/components/tokenBar'
import AmountTag from '@/app/components/amountTag'
import StreamCard from '@/app/components/streamDetails/StreamCard'
import NetworkFee from '@/app/components/shared/NetworkFee'
import ImageFallback from '@/app/shared/ImageFallback'
import InstasettlePill from '@/app/components/shared/InstasettlePill'
import { ethers } from 'ethers'
import { InfoIcon } from '@/app/lib/icons'
import Navbar from '@/app/components/navbar'
import Link from 'next/link'
import { Trade } from '@/app/lib/graphql/types/trade'

export default function TradePage() {
  const params = useParams()
  const controls = useAnimation()
  const tradeId = params.id as string

  const { trade, isLoading: isLoadingTrade, refetch } = useTrade({ tradeId })
  const { tokens, isLoading: isLoadingTokens } = useTokenList()
  const {
    getSigner,
    isConnected: isConnectedWallet,
    address: walletAddress,
  } = useWallet()
  const { instasettle, cancelTrade, contractInfo, getContractInfo } =
    useCoreTrading()

  const [showCompleted, setShowCompleted] = useState(true)
  const [tradeOperationLoading, setTradeOperationLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tradeInfo, setTradeInfo] = useState<any>(null)
  const { getTradeInfo } = useCoreTrading()

  useEffect(() => {
    controls.start('visible')
  }, [controls])

  useEffect(() => {
    if (!contractInfo) {
      getContractInfo()
    }
  }, [contractInfo, getContractInfo])

  useEffect(() => {
    if (trade?.tradeId) {
      getTradeInfo(Number(trade.tradeId), true).then(setTradeInfo)
    }
  }, [trade?.tradeId, getTradeInfo])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0,
      },
    },
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tradeId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Find token information with ETH/WETH handling
  const findTokenForTrade = (address: string) => {
    const ethWethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    if (address?.toLowerCase() === ethWethAddress) {
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
    return tokens.find(
      (t: TOKENS_TYPE) =>
        t.token_address?.toLowerCase() === address?.toLowerCase()
    )
  }

  // Recalc function
  function calculateTradeAggregates(trade: Trade) {
    const executions = trade.executions ?? []
    const totalExecutedAmountIn = executions.reduce(
      (acc: bigint, e) => acc + BigInt(e.amountIn ?? '0'),
      BigInt(0)
    )
    const totalExecRealisedOut = executions.reduce(
      (acc: bigint, e) => acc + BigInt(e.realisedAmountOut ?? '0'),
      BigInt(0)
    )
    const amountIn = BigInt(trade.amountIn ?? '0')
    const recalculatedAmountRemaining = amountIn - totalExecutedAmountIn
    return {
      amountIn: amountIn.toString(),
      amountRemaining: recalculatedAmountRemaining.toString(),
      realisedAmountOut: totalExecRealisedOut.toString(),
    }
  }

  if (!trade && !isLoadingTrade) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />
        {/* Topographic wave background - positioned at top, centered */}
        <div
          className="absolute top-0 left-0 right-0 h-[340px] pointer-events-none"
          style={{
            backgroundImage: 'url(/heros/hero-3.png)',
            backgroundSize: '100% auto',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div className="mt-[60px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-4xl">
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
            className="text-center py-20"
          >
            <Search className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Trade Not Found
            </h1>
            <p className="text-white/50 mb-6">
              The trade with ID "{tradeId}" could not be found.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </motion.div>
        </div>
      </div>
    )
  }

  const isLoading = isLoadingTrade || isLoadingTokens

  const tokenIn = trade ? findTokenForTrade(trade.tokenIn) : null
  const tokenOut = trade ? findTokenForTrade(trade.tokenOut) : null

  const formattedAmountIn =
    tokenIn && trade
      ? formatUnits(BigInt(trade.amountIn), tokenIn.decimals)
      : '0'
  const formattedMinAmountOut =
    tokenOut && trade
      ? formatUnits(BigInt(trade.minAmountOut), tokenOut.decimals)
      : '0'

  const aggregates = trade ? calculateTradeAggregates(trade) : null
  const remainingStreams = trade ? calculateRemainingStreams(trade) : 0
  const estimatedTime = useStreamTime(remainingStreams, 5)

  const isStreamCompleted =
    trade &&
    ((trade.cancellations && trade.cancellations.length > 0) ||
      (trade.instasettlements && trade.instasettlements.length > 0))

  const isStreamSettled =
    trade && trade.instasettlements && trade.instasettlements.length > 0

  // Calculate amounts
  const amountRemaining = aggregates
    ? BigInt(aggregates.amountRemaining)
    : BigInt(0)
  const amountIn = trade ? BigInt(trade.amountIn) : BigInt(0)

  const formattedSwapAmountOut =
    tokenOut && trade
      ? isStreamCompleted
        ? formatUnits(BigInt(trade.minAmountOut), tokenOut.decimals)
        : formatUnits(
            BigInt(aggregates?.realisedAmountOut || '0'),
            tokenOut.decimals
          )
      : '0'

  const volumeExecutedPercentage =
    amountIn > 0
      ? Number(((amountIn - amountRemaining) * BigInt(100)) / amountIn)
      : 0

  const executionsCount = trade?.executions?.length || 0

  const lastSweetSpot =
    trade?.executions && trade.executions.length > 0
      ? Number(trade.executions[trade.executions.length - 1].lastSweetSpot || 0)
      : Number(trade?.lastSweetSpot || 0)

  // USD calculations
  const amountInUsd =
    tokenIn && formattedAmountIn
      ? Number(formattedAmountIn) * (tokenIn.usd_price || 0)
      : 0
  const amountOutUsd =
    tokenOut && formattedMinAmountOut
      ? Number(formattedMinAmountOut) * (tokenOut.usd_price || 0)
      : 0
  const swapAmountOutUsd = tokenOut
    ? Number(formattedSwapAmountOut) * (tokenOut.usd_price || 0)
    : 0

  const swappedAmountIn =
    tokenIn && trade
      ? isStreamSettled
        ? formatUnits(BigInt(amountIn), tokenIn.decimals)
        : formatUnits(
            BigInt(amountIn) - BigInt(amountRemaining),
            tokenIn.decimals
          )
      : '0'

  const swappedAmountInUsd = tokenIn
    ? Number(swappedAmountIn) * (tokenIn.usd_price || 0)
    : 0

  const remainingAmountIn =
    tokenIn && !isStreamSettled && trade
      ? formatUnits(BigInt(amountRemaining), tokenIn.decimals)
      : '0'
  const remainingAmountInUsd =
    tokenIn && !isStreamSettled
      ? Number(remainingAmountIn) * (tokenIn.usd_price || 0)
      : 0

  const remainingAmountOut =
    tokenOut && amountIn > 0 && !isStreamSettled && trade
      ? formatUnits(
          (BigInt(trade.minAmountOut) * BigInt(amountRemaining)) /
            BigInt(amountIn),
          tokenOut.decimals
        )
      : '0'
  const remainingAmountOutUsd =
    tokenOut && !isStreamSettled
      ? Number(remainingAmountOut) * (tokenOut.usd_price || 0)
      : 0

  const savingsInTokenOut = trade
    ? (Number(remainingAmountOut) * Number(trade.instasettleBps || 0)) / 10000
    : 0
  const savingsInUsd =
    tokenOut && !isNaN(savingsInTokenOut)
      ? savingsInTokenOut * (tokenOut.usd_price || 0)
      : 0

  // Calculate desired price
  const desiredPrice =
    tokenIn && tokenOut && trade
      ? (() => {
          try {
            const amountOutNormalized = Number(
              formatUnits(BigInt(trade.minAmountOut), tokenOut.decimals)
            )
            const amountInNormalized = Number(
              formatUnits(BigInt(trade.amountIn), tokenIn.decimals)
            )
            return amountInNormalized > 0
              ? amountOutNormalized / amountInNormalized
              : 0
          } catch {
            return 0
          }
        })()
      : 0

  // Calculate effective price
  const effectivePrice =
    tokenIn && tokenOut && trade
      ? (() => {
          try {
            const remainingAmountOutBigInt =
              BigInt(trade.minAmountOut) - BigInt(trade.realisedAmountOut)
            const NETWORK_FEE_BPS = BigInt(15)
            const amountInAfterFee =
              (BigInt(trade.amountRemaining) *
                (BigInt(10000) - NETWORK_FEE_BPS)) /
              BigInt(10000)
            const amountOutAfterDiscount =
              (remainingAmountOutBigInt *
                (BigInt(10000) - BigInt(trade.instasettleBps))) /
              BigInt(10000)
            if (amountInAfterFee > BigInt(0)) {
              const amountOutFloat =
                Number(amountOutAfterDiscount) / Math.pow(10, tokenOut.decimals)
              const amountInFloat =
                Number(amountInAfterFee) / Math.pow(10, tokenIn.decimals)
              return amountOutFloat / amountInFloat
            }
            return 0
          } catch {
            return 0
          }
        })()
      : 0

  // Format executions
  const formattedExecutions =
    trade?.executions
      ?.map((execution) => ({
        sell: {
          amount: Number(
            formatUnits(BigInt(execution.amountIn), tokenIn?.decimals || 18)
          ),
          token: tokenIn?.symbol || '',
        },
        buy: {
          amount: Number(
            formatUnits(
              BigInt(execution.realisedAmountOut),
              tokenOut?.decimals || 18
            )
          ),
          token: tokenOut?.symbol || '',
        },
        id: execution.id,
        timestamp: Number(execution.timestamp),
        estimatedTime: formatRelativeTime(execution.timestamp),
      }))
      .sort((a, b) => b.timestamp - a.timestamp) || []

  const formattedSettlements =
    trade?.instasettlements?.map((settlement) => ({
      sell: {
        amount: Number(
          formatUnits(BigInt(settlement.totalAmountIn), tokenIn?.decimals || 18)
        ),
        token: tokenIn?.symbol || '',
      },
      buy: {
        amount: Number(
          formatUnits(
            BigInt(settlement.totalAmountOut),
            tokenOut?.decimals || 18
          )
        ),
        token: tokenOut?.symbol || '',
      },
      id: settlement.id,
      timestamp: Number(settlement.timestamp),
      estimatedTime: formatRelativeTime(settlement.timestamp),
    })) || []

  const isUser = walletAddress?.toLowerCase() === trade?.user?.toLowerCase()

  const handleInstasettleClick = async () => {
    if (isConnectedWallet && trade) {
      const signer = getSigner()
      try {
        if (signer) {
          setTradeOperationLoading(true)
          const res = await instasettle(
            {
              tradeId: Number(trade.tradeId),
              tokenInObj: tokenIn,
              tokenOutObj: tokenOut,
              tokenIn: trade.tokenIn || '',
              tokenOut: trade.tokenOut || '',
              minAmountOut: Number(
                formatUnits(
                  BigInt(trade.minAmountOut),
                  tokenOut?.decimals || 18
                )
              ).toString(),
              amountIn: formatNumberSmart(remainingAmountIn || '0') || '0',
              isInstasettlable: true,
              usePriceBased: false,
              signer: signer,
            },
            signer
          )
          if (res.success) {
            await refetch()
          }
        }
      } catch (error) {
        console.error('Error instasettling trade:', error)
      } finally {
        setTradeOperationLoading(false)
      }
    }
  }

  const handleCancelClick = async () => {
    if (isConnectedWallet && trade) {
      const signer = getSigner()
      try {
        if (signer) {
          setTradeOperationLoading(true)
          const res = await cancelTrade(Number(trade.tradeId), signer)
          if (res.success) {
            await refetch()
          }
        }
      } catch (error) {
        console.error('Error cancelling trade:', error)
      } finally {
        setTradeOperationLoading(false)
      }
    }
  }

  return (
    <TooltipProvider>
      <div className="relative min-h-screen overflow-hidden">
        <Navbar />

        {/* Topographic wave background - positioned at top, centered */}
        <div
          className="absolute top-0 left-0 right-0 h-[340px] pointer-events-none"
          style={{
            backgroundImage: 'url(/heros/hero-3.png)',
            backgroundSize: '100% auto',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div className="mt-[40px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-4xl">
          {/* Back button */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
            className="mb-6"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </motion.div>

          {/* Title with Trade ID */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
            className="mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Trade Details
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              {trade && (
                <div
                  className={cn(
                    'flex items-center py-1.5 text-sm gap-1 pl-2 pr-2.5 rounded-full leading-none',
                    trade.cancellations.length > 0
                      ? 'bg-red-900/20 text-red-400'
                      : trade.executions?.some(
                            (execution: any) => execution.lastSweetSpot === '0'
                          ) || trade.instasettlements.length > 0
                        ? 'bg-green-900/20 text-green-400'
                        : 'bg-zinc-900 text-primary'
                  )}
                >
                  {trade.instasettlements.length > 0 ? (
                    <InstasettlePill
                      isSettled={true}
                      variant={
                        trade.onlyInstasettle
                          ? 'only-instasettlable'
                          : 'instasettled'
                      }
                    />
                  ) : trade.cancellations.length > 0 ? (
                    trade.cancellations[0].isAutocancelled ? (
                      'Failed'
                    ) : (
                      'User Cancelled'
                    )
                  ) : trade.executions?.some(
                      (execution: any) => execution.lastSweetSpot === '0'
                    ) ? (
                    'Completed'
                  ) : (
                    <InstasettlePill
                      isSettled={false}
                      variant={
                        trade.onlyInstasettle
                          ? 'only-instasettlable'
                          : 'instasettled'
                      }
                    />
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Main Trade Card */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
          >
            <div className="p-6 rounded-[20px] bg-black border border-white14">
              <TokenBar
                sellToken={tokenIn}
                buyToken={tokenOut}
                isLoading={isLoading}
                cancelled={trade?.cancellations?.length > 0}
              />

              <div className="flex gap-2 justify-between py-4 border-b border-borderBottom">
                <div className="flex flex-col leading-tight gap-0.5 items-start">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </>
                  ) : (
                    <>
                      <p className="text-white text-lg">
                        {formatNumberSmart(formattedAmountIn)} {tokenIn?.symbol}
                      </p>
                      <p className="text-white52 text-[14px]">
                        ${amountInUsd.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex flex-col leading-tight gap-0.5 items-end">
                  {isLoading ? (
                    <>
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </>
                  ) : (
                    <>
                      <p className="text-white text-lg">
                        ~ {formatNumberSmart(formattedMinAmountOut)}{' '}
                        {tokenOut?.symbol}
                      </p>
                      <p className="text-white52 text-[14px]">
                        ${amountOutUsd.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Toggle for Completed/Remaining */}
              <div className="flex items-center justify-center py-3">
                <div className="flex items-center bg-white005 rounded-full p-0.5">
                  <button
                    onClick={() => setShowCompleted(true)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full transition-all duration-200',
                      showCompleted
                        ? 'bg-primary text-black font-medium'
                        : 'text-white52 hover:text-white'
                    )}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => setShowCompleted(false)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full transition-all duration-200',
                      !showCompleted
                        ? 'bg-primary text-black font-medium'
                        : 'text-white52 hover:text-white'
                    )}
                  >
                    Remaining
                  </button>
                </div>
              </div>

              <div className="flex gap-2 justify-between py-3 border-b border-borderBottom">
                <div className="flex flex-col leading-tight gap-2 items-start">
                  <p className="text-[14px] text-white52">
                    {showCompleted ? 'Swapped Input' : 'Remaining Input'}
                  </p>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </>
                  ) : (
                    <>
                      <p>
                        {showCompleted
                          ? `${formatNumberSmart(swappedAmountIn)} ${tokenIn?.symbol}`
                          : `${formatNumberSmart(remainingAmountIn)} ${tokenIn?.symbol}`}
                      </p>
                      <p className="text-white52 text-[14px]">
                        $
                        {showCompleted
                          ? swappedAmountInUsd.toFixed(2)
                          : remainingAmountInUsd.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
                <Image
                  src={'/icons/long-right-arrow.svg'}
                  alt="arrow"
                  className="w-6"
                  width={1000}
                  height={1000}
                />
                <div className="flex flex-col leading-tight gap-2 items-end">
                  <p className="text-[14px] text-white52">
                    {showCompleted ? 'Output' : 'Remaining Output'}
                  </p>
                  {isLoading ? (
                    <>
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </>
                  ) : (
                    <>
                      <p>
                        {showCompleted
                          ? `${formatNumberSmart(formattedSwapAmountOut)} ${tokenOut?.symbol}`
                          : `~ ${formatNumberSmart(remainingAmountOut)} ${tokenOut?.symbol}`}
                      </p>
                      <p className="text-white52 text-[14px]">
                        $
                        {showCompleted
                          ? swapAmountOutUsd.toFixed(2)
                          : remainingAmountOutUsd.toFixed(2)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div className="flex items-center gap-2">
                  <p className="text-[14px]">Desired price:</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 cursor-help block" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                      <p>The target price ratio for this trade</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[14px]">
                  {isLoading || !tokenIn || !tokenOut || desiredPrice === 0
                    ? '...'
                    : `${desiredPrice.toFixed(6)} ${tokenOut.symbol}/${tokenIn.symbol}`}
                </p>
              </div>

              {/* STREAMS Section */}
              <div
                className={cn(
                  'flex flex-col gap-2 pt-4 pb-4 border-b border-borderBottom',
                  trade?.cancellations?.length > 0 && 'border-b-0'
                )}
              >
                <p className="text-[14px] text-white w-full text-center font-medium">
                  STREAMS
                </p>

                <AmountTag
                  title="Streams Completed"
                  amount={
                    isLoading
                      ? '0 / 0'
                      : trade?.instasettlements?.length > 0 ||
                          trade?.cancellations?.length > 0
                        ? `${Number(executionsCount) + 1} / ${Number(executionsCount) + 1}`
                        : `${executionsCount} / ${executionsCount + lastSweetSpot}`
                  }
                  infoDetail="Number of streams completed out of total"
                  titleClassName="text-white52"
                  isLoading={isLoading}
                />
                <AmountTag
                  title="Trade Volume Executed"
                  amount={
                    isLoading
                      ? '0%'
                      : `${trade?.instasettlements?.length > 0 ? 100 : volumeExecutedPercentage}%`
                  }
                  infoDetail="Percentage of trade volume that has been executed"
                  titleClassName="text-white52"
                  isLoading={isLoading}
                />
                {!(
                  trade?.instasettlements?.length > 0 ||
                  trade?.cancellations?.length > 0 ||
                  trade?.onlyInstasettle
                ) && (
                  <AmountTag
                    title="Est time"
                    amount={
                      isLoading || trade?.instasettlements?.length > 0
                        ? '...'
                        : estimatedTime
                    }
                    infoDetail="Estimated time to complete the trade"
                    titleClassName="text-white52"
                    isLoading={isLoading}
                  />
                )}
                <NetworkFee
                  buyAmount={formattedMinAmountOut}
                  tokenToUsdPrice={tokenOut?.usd_price}
                  tokenToSymbol={tokenOut?.symbol}
                  contractInfo={contractInfo}
                  isCalculating={isLoading}
                  titleClassName="text-white52"
                />
                <AmountTag
                  title="Wallet Address"
                  amount={
                    <a
                      href={`https://etherscan.io/address/${trade?.user}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline hover:text-primary/80 transition-colors"
                    >
                      {formatWalletAddress(trade?.user || '')}
                    </a>
                  }
                  infoDetail="The wallet address that created this trade"
                  titleClassName="text-white52"
                  isLoading={isLoading}
                />
              </div>

              {/* Instasettlable Section */}
              {trade?.isInstasettlable && (
                <div
                  className={cn(
                    'flex flex-col gap-2 pt-4 pb-4 border-b border-borderBottom',
                    (trade.instasettlements.length > 0 ||
                      trade.cancellations.length > 0) &&
                      'border-b-0'
                  )}
                >
                  <div className="flex items-center w-full justify-center">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                    >
                      <path
                        d="M13 2L6 14H11V22L18 10H13V2Z"
                        fill="#40f798"
                        fillOpacity="0.72"
                      />
                    </svg>
                    <span className="text-[14px] font-medium uppercase">
                      Instasettlable
                    </span>
                  </div>

                  <AmountTag
                    title="BPS Savings"
                    amount={
                      trade.isInstasettlable && trade.instasettleBps ? (
                        <div className="flex flex-col items-end">
                          <p>
                            {Number(trade.instasettleBps)} BPS (
                            {formatNumberSmart(savingsInTokenOut.toFixed(4))}{' '}
                            {tokenOut?.symbol || ''})
                          </p>
                          <p className="text-white52 text-[12px]">
                            ${savingsInUsd.toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        'N/A'
                      )
                    }
                    infoDetail="Basis points savings for instasettle"
                    titleClassName="text-white52"
                    isLoading={isLoading}
                  />

                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-1">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                      >
                        <path
                          d="M13 2L6 14H11V22L18 10H13V2Z"
                          fill="#40f798"
                          fillOpacity="0.72"
                        />
                      </svg>
                      <p className="text-[14px] text-white52">
                        Effective Price
                      </p>
                    </div>
                    <p className="text-[14px]">
                      {effectivePrice?.toFixed(2)} {tokenOut?.symbol || 'N/A'} /{' '}
                      {tokenIn?.symbol || 'N/A'}
                    </p>
                  </div>

                  <div className="flex justify-between items-center w-full">
                    <p className="text-[14px] text-white52">Amount Received</p>
                    <div className="flex items-center gap-1">
                      <p className="text-[14px]">
                        {remainingAmountIn} {tokenIn?.symbol}
                      </p>
                      <ImageFallback
                        src={
                          (tokenIn?.symbol.toLowerCase() === 'usdt'
                            ? '/tokens/usdt.svg'
                            : tokenIn?.icon) || '/icons/default-token.svg'
                        }
                        alt={tokenIn?.symbol || 'token'}
                        width={40}
                        height={40}
                        className="border-[1.5px] border-black w-[18px] h-[18px] overflow-hidden object-cover rounded-full"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center w-full">
                    <p className="text-[14px] text-white52">Settler Payment</p>
                    <div className="flex items-center gap-1">
                      <p className="text-[14px]">
                        {tradeInfo?.settlerPayment
                          ? parseFloat(
                              ethers.utils.formatUnits(
                                tradeInfo.settlerPayment,
                                tokenOut?.decimals
                              )
                            ).toFixed(4)
                          : 0}{' '}
                        {tokenOut?.symbol}
                      </p>
                      <ImageFallback
                        src={
                          (tokenOut?.symbol.toLowerCase() === 'usdt'
                            ? '/tokens/usdt.svg'
                            : tokenOut?.icon) || '/icons/default-token.svg'
                        }
                        alt={tokenOut?.symbol || 'token'}
                        width={40}
                        height={40}
                        className="border-[1.5px] border-black w-[18px] h-[18px] overflow-hidden object-cover rounded-full"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center w-full">
                    <p className="text-[14px] text-white52">Fee</p>
                    <div className="flex items-center gap-1">
                      <p className="text-[14px]">
                        {tradeInfo?.protocolFee
                          ? parseFloat(
                              ethers.utils.formatUnits(
                                tradeInfo.protocolFee,
                                tokenOut?.decimals
                              )
                            ).toFixed(4)
                          : '0'}
                      </p>
                      <ImageFallback
                        src={
                          (tokenOut?.symbol.toLowerCase() === 'usdt'
                            ? '/tokens/usdt.svg'
                            : tokenOut?.icon) || '/icons/default-token.svg'
                        }
                        alt={tokenOut?.symbol || 'token'}
                        width={40}
                        height={40}
                        className="border-[1.5px] border-black w-[18px] h-[18px] overflow-hidden object-cover rounded-full"
                      />
                    </div>
                  </div>

                  {trade.isInstasettlable &&
                    !(
                      trade.instasettlements.length > 0 ||
                      trade.cancellations.length > 0
                    ) && (
                      <Button
                        text="EXECUTE INSTASETTLE"
                        className="h-[2.5rem] mt-2"
                        disabled={
                          isLoading ||
                          trade.instasettlements.length > 0 ||
                          !walletAddress ||
                          tradeOperationLoading
                        }
                        loading={tradeOperationLoading}
                        onClick={handleInstasettleClick}
                      />
                    )}
                </div>
              )}

              {/* User Actions */}
              {isUser &&
                !(
                  trade?.instasettlements?.length > 0 ||
                  trade?.cancellations?.length > 0
                ) && (
                  <div className="pt-4">
                    <Button
                      text="CANCEL TRADE"
                      className="h-[2.5rem] w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-900/50"
                      disabled={isLoading || tradeOperationLoading}
                      loading={tradeOperationLoading}
                      onClick={handleCancelClick}
                    />
                  </div>
                )}
            </div>
          </motion.div>

          {/* Streams Section */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
            className="mt-8"
          >
            <h2 className="text-xl font-bold text-white mb-4">Streams</h2>

            {/* Cancellations */}
            {trade?.cancellations &&
              trade.cancellations.length > 0 &&
              trade.cancellations.map((cancellation) => (
                <div
                  key={cancellation.id}
                  className="w-full p-4 border-[1px] border-red-900/30 bg-red-900/5 rounded-[15px] mb-3 hover:bg-red-900/10 transition-all duration-300"
                >
                  <div className="w-full flex justify-between gap-1 items-center">
                    <div className="flex items-center gap-0 py-1 px-1 rounded-[4px] uppercase text-red-400 text-[12px] leading-none bg-red-900/20">
                      Cancelled
                    </div>
                    <a
                      href={`https://etherscan.io/tx/${cancellation.id.split('-')[0]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 underline text-[14px] hover:text-red-300 transition-colors cursor-pointer"
                    >
                      {formatWalletAddress(cancellation.id.split('-')[0])}
                    </a>
                  </div>
                  <div className="mt-2.5 text-[14px] text-white">
                    Trade cancelled {formatRelativeTime(cancellation.timestamp)}
                  </div>
                </div>
              ))}

            {/* Settlements */}
            {formattedSettlements.map((settlement) => (
              <StreamCard
                key={settlement.id}
                status="Instasettled"
                stream={[{ sell: settlement.sell, buy: settlement.buy }]}
                date={new Date(settlement.timestamp * 1000)}
                timeRemaining={settlement.estimatedTime}
                walletAddress={settlement.id.split('-')[0]}
                isInstasettle={false}
                isLoading={isLoading}
              />
            ))}

            {/* Executions */}
            {formattedExecutions.map((execution) => (
              <StreamCard
                key={execution.id}
                status="completed"
                stream={[{ sell: execution.sell, buy: execution.buy }]}
                streamIndex={
                  trade?.isInstasettlable && trade.instasettlements.length > 0
                    ? 2
                    : 0
                }
                date={new Date(execution.timestamp * 1000)}
                timeRemaining={execution.estimatedTime}
                walletAddress={execution.id.split('-')[0]}
                isInstasettle={false}
                isLoading={isLoading}
              />
            ))}

            {!isLoading &&
              formattedExecutions.length === 0 &&
              formattedSettlements.length === 0 &&
              trade?.cancellations?.length === 0 && (
                <div className="text-white/50 text-center py-8 bg-white005 rounded-[15px]">
                  No streams executed yet
                </div>
              )}
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  )
}
