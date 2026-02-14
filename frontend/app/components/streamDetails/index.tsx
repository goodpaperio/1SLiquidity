'use client'

import Image from 'next/image'
import { formatWalletAddress } from '@/app/lib/helper'
import AmountTag from '../amountTag'
import StreamCard from './StreamCard'
import TokenBar from '../tokenBar'
import Button from '../button'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { Skeleton } from '@/components/ui/skeleton'
import ConfigTrade from './ConfigTrade'
import { Trade } from '@/app/lib/graphql/types/trade'
import { useStreamTime } from '@/app/lib/hooks/useStreamTime'
import { formatRelativeTime } from '@/app/lib/utils/time'
import { cn } from '@/lib/utils'
import { ArrowLeft, X } from 'lucide-react'
import { useWallet } from '@/app/lib/hooks/useWallet'
import { useCoreTrading } from '@/app/lib/hooks/useCoreTrading'
import { formatNumberSmart } from '@/app/lib/utils/number'
import { useCallback, useEffect, useState } from 'react'
import NetworkFee from '../shared/NetworkFee'
import { calculateRemainingStreams } from '@/app/lib/utils/streams'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import ImageFallback from '@/app/shared/ImageFallback'
import { ethers } from 'ethers'
import { InfoIcon } from '@/app/lib/icons'
import InstasettlePill from '../shared/InstasettlePill'

type StreamDetailsProps = {
  onBack: () => void
  selectedStream: Trade | null
  walletAddress?: string
  isUser?: boolean
  isLoading?: boolean
  onClose: () => void
  showBackIcon?: boolean
  onRefetch?: () => void
}

const TIMER_DURATION = 10 // 10 seconds

const StreamDetails: React.FC<StreamDetailsProps> = ({
  onBack,
  selectedStream,
  isUser = false,
  isLoading = false,
  onClose,
  showBackIcon = true,
  walletAddress,
  onRefetch,
}) => {
  const { tokens, isLoading: isLoadingTokens } = useTokenList()
  const {
    placeTrade,
    loading,
    instasettle,
    cancelTrade,
    contractInfo,
    getContractInfo,
  } = useCoreTrading()
  const { getSigner, isConnected: isConnectedWallet } = useWallet()
  const [showCompleted, setShowCompleted] = useState(true)
  const [tradeOperationLoading, setTradeOperationLoading] = useState(false)

  // Fetch contract info on component mount if not already available
  useEffect(() => {
    if (!contractInfo) {
      getContractInfo()
    }
  }, [contractInfo, getContractInfo])

  if (!selectedStream) {
    return null
  }

  const remainingStreams = calculateRemainingStreams(selectedStream)
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

  const tokenIn = findTokenForTrade(selectedStream.tokenIn)
  const tokenOut = findTokenForTrade(selectedStream.tokenOut)

  // Format amounts using token decimals
  const formattedAmountIn = tokenIn
    ? formatUnits(BigInt(selectedStream.amountIn), tokenIn.decimals)
    : '0'
  const formattedMinAmountOut = tokenOut
    ? formatUnits(BigInt(selectedStream.minAmountOut), tokenOut.decimals)
    : '0'

  // Calculate effective price (tokens out per token in ratio)
  const calculateEffectivePrice = () => {
    try {
      // Calculate remaining amount out (what instasettler needs to provide)
      const remainingAmountOut =
        BigInt(selectedStream.minAmountOut) -
        BigInt(selectedStream.realisedAmountOut)

      // Calculate network fee (15 basis points = 0.15%)
      const NETWORK_FEE_BPS = BigInt(15)

      // Calculate amount in after fee
      const amountInAfterFee =
        (BigInt(selectedStream.amountRemaining) *
          (BigInt(10000) - NETWORK_FEE_BPS)) /
        BigInt(10000)

      // Calculate amount out after discount
      const amountOutAfterDiscount =
        (remainingAmountOut *
          (BigInt(10000) - BigInt(selectedStream.instasettleBps))) /
        BigInt(10000)

      if (amountInAfterFee > BigInt(0)) {
        const tokenOutDecimals = tokenOut?.decimals || 18
        const tokenInDecimals = tokenIn?.decimals || 18

        const amountOutFloat =
          Number(amountOutAfterDiscount) / Math.pow(10, tokenOutDecimals)
        const amountInFloat =
          Number(amountInAfterFee) / Math.pow(10, tokenInDecimals)

        return amountOutFloat / amountInFloat
      }
      return 0
    } catch {
      return 0
    }
  }

  const effectivePrice = calculateEffectivePrice()

  // Calculate desired price: amountOut / amountIn (normalized by decimals, scaled to 1 unit of tokenIn)
  const calculateDesiredPrice = () => {
    if (!tokenIn || !tokenOut) return 0
    try {
      const amountOutNormalized = Number(
        formatUnits(BigInt(selectedStream.minAmountOut), tokenOut.decimals)
      )
      const amountInNormalized = Number(
        formatUnits(BigInt(selectedStream.amountIn), tokenIn.decimals)
      )
      if (amountInNormalized > 0) {
        return amountOutNormalized / amountInNormalized
      }
      return 0
    } catch {
      return 0
    }
  }

  const desiredPrice = calculateDesiredPrice()

  // Calculate USD values (using token price from tokenList)
  const amountInUsd = tokenIn
    ? Number(formattedAmountIn) * (tokenIn.usd_price || 0)
    : 0
  const amountOutUsd = tokenOut
    ? Number(formattedMinAmountOut) * (tokenOut.usd_price || 0)
    : 0

  const aggregates = calculateTradeAggregates(selectedStream)

  // Check if stream is completed (has cancellations or settlements)
  const isStreamCompleted =
    (selectedStream.cancellations && selectedStream.cancellations.length > 0) ||
    (selectedStream.settlements && selectedStream.settlements.length > 0)

  const isStreamSettled =
    selectedStream.settlements && selectedStream.settlements.length > 0

  // Calculate swapped amount values
  // If stream is completed (instasettled), show full expected output, otherwise show actually realized output
  const formattedSwapAmountOut = tokenOut
    ? isStreamCompleted
      ? formatUnits(BigInt(selectedStream.minAmountOut), tokenOut.decimals) // Show full expected output if instasettled
      : formatUnits(BigInt(aggregates.realisedAmountOut), tokenOut.decimals) // Show actually realized output
    : '0'
  const swapAmountOutUsd = tokenOut
    ? Number(formattedSwapAmountOut) * (tokenOut.usd_price || 0)
    : 0

  // Calculate trade volume executed percentage
  const amountRemaining = BigInt(aggregates.amountRemaining)
  const amountIn = BigInt(selectedStream.amountIn)
  const volumeExecutedPercentage =
    amountIn > 0
      ? Number(((amountIn - amountRemaining) * BigInt(100)) / amountIn)
      : 0

  // Get execution hashes count (if available)
  const executionsCount = selectedStream.executions?.length || 0

  // Get lastSweetSpot from the most recent execution (or 0 if no executions)
  const lastSweetSpot =
    selectedStream.executions && selectedStream.executions.length > 0
      ? Number(
          selectedStream.executions[selectedStream.executions.length - 1]
            .lastSweetSpot || 0
        )
      : Number(selectedStream.lastSweetSpot || 0)

  // Format execution amounts and calculate their times
  const formattedExecutions =
    selectedStream.executions
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
    selectedStream.settlements?.map((settlement) => ({
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

  // Calculate actual swapped input amount (amountIn - amountRemaining)
  // If stream is completed (instasettled), show full amount, otherwise show actually swapped amount
  const swappedAmountIn = tokenIn
    ? isStreamSettled
      ? formatUnits(BigInt(amountIn), tokenIn.decimals) // Show full amount if instasettled
      : formatUnits(
          BigInt(amountIn) - BigInt(amountRemaining),
          tokenIn.decimals
        ) // Show actually swapped amount
    : '0'

  const swappedAmountInUsd = tokenIn
    ? Number(swappedAmountIn) * (tokenIn.usd_price || 0)
    : 0

  // Calculate remaining amounts - set to 0 if stream is completed
  const remainingAmountIn =
    tokenIn && !isStreamSettled
      ? formatUnits(BigInt(amountRemaining), tokenIn.decimals)
      : '0'
  const remainingAmountInUsd =
    tokenIn && !isStreamSettled
      ? Number(remainingAmountIn) * (tokenIn.usd_price || 0)
      : 0

  // Calculate remaining output (estimated based on proportion) - set to 0 if stream is completed
  const remainingAmountOut =
    tokenOut && amountIn > 0 && !isStreamSettled
      ? formatUnits(
          (BigInt(selectedStream.minAmountOut) * BigInt(amountRemaining)) /
            BigInt(amountIn),
          tokenOut.decimals
        )
      : '0'
  const remainingAmountOutUsd =
    tokenOut && !isStreamSettled
      ? Number(remainingAmountOut) * (tokenOut.usd_price || 0)
      : 0

  // Calculate BPS savings in token amount
  const savingsInTokenOut =
    (Number(remainingAmountOut) * Number(selectedStream.instasettleBps || 0)) /
    10000

  // Calculate savings in USD
  const savingsInUsd =
    tokenOut && !isNaN(savingsInTokenOut)
      ? savingsInTokenOut * (tokenOut.usd_price || 0)
      : 0

  const NETWORK_FEE_BPS = 5 // 5 basis points

  const networkFeeInToken = tokenIn
    ? Number(formatUnits(BigInt(selectedStream.amountIn), tokenIn.decimals)) *
      (NETWORK_FEE_BPS / 10000)
    : 0
  const networkFeeUsd = tokenIn
    ? networkFeeInToken * (tokenIn.usd_price || 0)
    : 0

  const handleInstasettleClick = async (item: any) => {
    if (isConnectedWallet) {
      const signer = getSigner()

      try {
        if (signer) {
          setTradeOperationLoading(true)
          const res = await instasettle(
            {
              tradeId: Number(selectedStream.tradeId),
              tokenInObj: tokenIn,
              tokenOutObj: tokenOut,
              tokenIn: selectedStream.tokenIn || '',
              tokenOut: selectedStream.tokenOut || '',
              // amountIn: Number(
              //   formatUnits(
              //     BigInt(selectedStream.amountIn),
              //     tokenIn?.decimals || 18
              //   )
              // ).toString(),
              minAmountOut: Number(
                formatUnits(
                  BigInt(selectedStream.minAmountOut),
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
            // Refetch trades to update the list
            if (onRefetch) {
              await onRefetch()
            }
            onClose()
          }
        }
      } catch (error) {
        console.error('Error instasettling trade:', error)
      } finally {
        setTradeOperationLoading(false)
      }
    }
  }

  const handleCancelClick = async (item: any) => {
    if (isConnectedWallet) {
      const signer = getSigner()

      try {
        if (signer) {
          setTradeOperationLoading(true)
          const res = await cancelTrade(Number(selectedStream.tradeId), signer)
          if (res.success) {
            // Refetch trades to update the list
            if (onRefetch) {
              await onRefetch()
            }
            onClose()
          }
        }
      } catch (error) {
        console.error('Error cancelling trade:', error)
      } finally {
        setTradeOperationLoading(false)
      }
    }
  }

  // Recalc function
  function calculateTradeAggregates(trade: Trade) {
    const executions = trade.executions ?? []

    // Sum of execution.amountIn as BigInt
    const totalExecutedAmountIn = executions.reduce(
      (acc: bigint, e) => acc + BigInt(e.amountIn ?? '0'),
      BigInt(0)
    )

    // Sum of execution.realisedAmountOut as BigInt
    const totalExecRealisedOut = executions.reduce(
      (acc: bigint, e) => acc + BigInt(e.realisedAmountOut ?? '0'),
      BigInt(0)
    )

    // Use only the sum from executions, don't add existingRealisedOut as it may already include these
    const finalRealisedAmountOut = totalExecRealisedOut

    // amountIn (original) and recalculated amountRemaining
    const amountIn = BigInt(trade.amountIn ?? '0')
    const recalculatedAmountRemaining = amountIn - totalExecutedAmountIn

    return {
      amountIn: amountIn.toString(),
      amountRemaining: recalculatedAmountRemaining.toString(),
      realisedAmountOut: finalRealisedAmountOut.toString(),
      totalExecRealisedOut: totalExecRealisedOut.toString(),
    }
  }

  const [tradeInfo, setTradeInfo] = useState<any>(null)
  const { getTradeInfo } = useCoreTrading()

  const getTradeInfoCallback = useCallback(async () => {
    const tradeInfo = await getTradeInfo(Number(selectedStream.tradeId), true)
    setTradeInfo(tradeInfo)
  }, [getTradeInfo, selectedStream.tradeId])

  const settlerPaymentFormatted = tradeInfo?.settlerPayment
    ? parseFloat(
        ethers.utils.formatUnits(tradeInfo.settlerPayment, tokenOut?.decimals)
      ).toFixed(4)
    : '0'

  // console.log('settlerPaymentFormatted', settlerPaymentFormatted)
  // console.log('tradeInfo', tradeInfo)

  useEffect(() => {
    getTradeInfoCallback()
  }, [getTradeInfoCallback])

  return (
    <>
      <div className="flex justify-between items-end gap-2 h-full sticky bg-black top-0 p-6 px-2 z-40">
        {/* <div className="flex gap-1 text-white cursor-pointer" onClick={onBack}>
          <Image
            src={'/icons/right-arrow.svg'}
            alt="back"
            className="w-2.5 rotate-180"
            width={1000}
            height={1000}
          />
          <p>Back</p>
        </div> */}
        <div
          onClick={showBackIcon ? onBack : onClose}
          className={cn(
            'bg-[#232624] cursor-pointer rounded-full p-2 z-50 group hover:bg-[#373D3F] transition-all duration-300'
          )}
        >
          {showBackIcon ? (
            <ArrowLeft className="w-3 h-3 text-[#666666] group-hover:text-white transition-all duration-300" />
          ) : (
            <X className="w-3 h-3 text-[#666666] group-hover:text-white transition-all duration-300" />
          )}
          {/* <Image
            src={'/icons/close.svg'}
            alt="close"
            className="w-2"
            width={1000}
            height={1000}
            onClick={onBack}
          /> */}
        </div>
        {/* <div className="text-white52 leading-none">Stream ID</div> */}

        <div className="flex items-center gap-2">
          <p className="text-white52">Trade ID:</p>
          <p className="underline text-primary">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              formatWalletAddress(selectedStream.id)
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pb-2">
        {(selectedStream.isInstasettlable ||
          selectedStream.settlements.length > 0 ||
          selectedStream.cancellations.length > 0 ||
          selectedStream.executions?.some(
            (execution: any) => execution.lastSweetSpot === '0'
          )) && (
          <div
            className={cn(
              'flex items-center py-1 text-sm gap-1 pl-1 pr-1.5 rounded-full leading-none',
              selectedStream.cancellations.length > 0
                ? 'bg-red-900/20 text-red-400'
                : selectedStream.executions?.some(
                      (execution: any) => execution.lastSweetSpot === '0'
                    ) || selectedStream.settlements.length > 0
                  ? 'bg-green-900/20 text-green-400'
                  : 'bg-zinc-900 text-primary'
            )}
          >
            <span className="text-xs sm:inline-block hidden">
              {selectedStream.settlements.length > 0 ? (
                <InstasettlePill
                  isSettled={true}
                  variant={
                    selectedStream.onlyInstasettle
                      ? 'only-instasettlable'
                      : 'instasettled'
                  }
                />
              ) : selectedStream.cancellations.length > 0 ? (
                selectedStream.cancellations[0].isAutocancelled ? (
                  'Failed'
                ) : (
                  'User Cancelled'
                )
              ) : selectedStream.executions?.some(
                  (execution: any) => execution.lastSweetSpot === '0'
                ) ? (
                'Completed'
              ) : (
                <InstasettlePill
                  isSettled={false}
                  variant={
                    selectedStream.onlyInstasettle
                      ? 'only-instasettlable'
                      : 'instasettled'
                  }
                />
              )}
            </span>
          </div>
        )}
        {/* <div className="flex bg-white005 items-center gap-2 px-2 py-1 rounded-full">
          <div className="text-xs text-white/70">Auto refresh in</div>
          <div className="relative">
            <svg className="w-4 h-4 transform -rotate-90">
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className="text-white/10"
              />
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray="44"
                strokeDashoffset={44 * (1 - 8 / TIMER_DURATION)}
                className="text-primary transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center leading-none text-[0.65rem] font-medium">
              {4}
            </div>
          </div>
        </div> */}
      </div>
      <div className="pb-6">
        <div className="p-4 rounded-[15px] bg-white005">
          {/* <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image
                src={selectedStream.fromToken.icon}
                width={32}
                height={32}
                alt={selectedStream.fromToken.symbol}
              />
              <div>
                <p className="text-white">
                  {selectedStream.fromToken.amount}{' '}
                  {selectedStream.fromToken.symbol}
                </p>
                <p className="text-white52">From</p>
              </div>
            </div>
            <Image
              src="/icons/right-arrow.svg"
              width={24}
              height={24}
              alt="to"
            />
            <div className="flex items-center gap-2">
              <Image
                src={selectedStream.toToken.icon}
                width={32}
                height={32}
                alt={selectedStream.toToken.symbol}
              />
              <div>
                <p className="text-white">
                  {selectedStream.toToken.estimatedAmount}{' '}
                  {selectedStream.toToken.symbol}
                </p>
                <p className="text-white52">To (Estimated)</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[3px] bg-white005 relative mb-4">
            <div
              className="h-[3px] bg-primary absolute top-0 left-0"
              style={{
                width: `${
                  (selectedStream.progress.completed /
                    selectedStream.progress.total) *
                  100
                }%`,
              }}
            />
          </div> */}

          <TokenBar
            sellToken={tokenIn}
            buyToken={tokenOut}
            isLoading={isLoading || isLoadingTokens}
            cancelled={selectedStream.cancellations.length > 0}
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
                  <p className="text-white">
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
                  <p className="text-white">
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
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center bg-white005 rounded-full p-0.5">
              <button
                onClick={() => setShowCompleted(true)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full transition-all duration-200',
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
                  'px-2.5 py-1 text-xs rounded-full transition-all duration-200',
                  !showCompleted
                    ? 'bg-primary text-black font-medium'
                    : 'text-white52 hover:text-white'
                )}
              >
                Remaining
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-between py-2 border-b border-borderBottom">
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
                  <p className="">
                    {showCompleted
                      ? `${formatNumberSmart(swappedAmountIn)} ${
                          tokenIn?.symbol
                        }`
                      : `${formatNumberSmart(remainingAmountIn)} ${
                          tokenIn?.symbol
                        }`}
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
                  <p className="">
                    {showCompleted
                      ? `${formatNumberSmart(formattedSwapAmountOut)} ${
                          tokenOut?.symbol
                        }`
                      : `~ ${formatNumberSmart(remainingAmountOut)} ${
                          tokenOut?.symbol
                        }`}
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

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <p className="text-[14px]">Desired price:</p>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="h-4 w-4 cursor-help block" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                    <p>Desired price info</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-[14px]">
              {isLoading || !tokenIn || !tokenOut || desiredPrice === 0
                ? '...'
                : `${desiredPrice.toFixed(6)} ${tokenOut.symbol}/${
                    tokenIn.symbol
                  }`}
            </p>
          </div>

          <div
            className={cn(
              'flex flex-col gap-2 pt-2.5 pb-4 border-b border-borderBottom',
              selectedStream.cancellations.length > 0 && 'border-b-0'
            )}
          >
            <p className="text-[14px] text-white w-full text-center">STREAMS</p>

            {/* <AmountTag
              title="BPS Savings"
              amount={
                selectedStream.isInstasettlable &&
                selectedStream.instasettleBps ? (
                  <div className="flex flex-col items-end">
                    <p className="">
                      {Number(selectedStream.instasettleBps)} bps (
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
              infoDetail="Info"
              titleClassName="text-white52"
              amountClassName={
                selectedStream.isInstasettlable ? undefined : 'text-white52'
              }
              showInstaIcon={selectedStream.isInstasettlable}
              isLoading={isLoading}
            /> */}
            <AmountTag
              title="Streams Completed"
              amount={
                isLoading
                  ? '0 / 0'
                  : selectedStream.settlements.length > 0 ||
                      selectedStream.cancellations.length > 0
                    ? `${Number(executionsCount) + 1} / ${
                        Number(executionsCount) + 1
                      }`
                    : `${executionsCount} / ${executionsCount + lastSweetSpot}`
              }
              infoDetail="Info"
              titleClassName="text-white52"
              isLoading={isLoading}
            />
            <AmountTag
              title="Trade Volume Executed"
              amount={
                isLoading
                  ? '0%'
                  : `${
                      selectedStream.settlements.length > 0
                        ? 100
                        : volumeExecutedPercentage
                    }%`
              }
              infoDetail="Info"
              titleClassName="text-white52"
              isLoading={isLoading}
            />
            {!(
              selectedStream.settlements.length > 0 ||
              selectedStream.cancellations.length > 0 ||
              selectedStream.onlyInstasettle
            ) && (
              <AmountTag
                title="Est time"
                amount={
                  isLoading || selectedStream.settlements.length > 0
                    ? '...'
                    : estimatedTime
                }
                infoDetail="Info"
                titleClassName="text-white52"
                isLoading={isLoading}
              />
            )}
            {/* <AmountTag
              title="Output Fee"
              amount="$190.54"
              infoDetail="Info"
              titleClassName="text-white52"
              isLoading={isLoading}
            /> */}
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
                  href={`https://etherscan.io/address/${selectedStream.user}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:text-primary/80 transition-colors"
                >
                  {formatWalletAddress(selectedStream.user)}
                </a>
              }
              infoDetail="Info"
              titleClassName="text-white52"
              isLoading={isLoading}
            />
          </div>

          {selectedStream.isInstasettlable && (
            <div
              className={cn(
                'flex flex-col gap-2 pt-2.5 pb-4 border-b border-borderBottom',
                (selectedStream.settlements.length > 0 ||
                  selectedStream.cancellations.length > 0) &&
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
              {/* <p className="text-[14px] text-white w-full text-center">STREAMS</p> */}

              <AmountTag
                title="BPS Savings"
                amount={
                  selectedStream.isInstasettlable &&
                  selectedStream.instasettleBps ? (
                    <div className="flex flex-col items-end">
                      <p className="">
                        {Number(selectedStream.instasettleBps)} BPS (
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
                infoDetail="Info"
                titleClassName="text-white52"
                amountClassName={
                  selectedStream.isInstasettlable ? undefined : 'text-white52'
                }
                showInstaIcon={selectedStream.isInstasettlable}
                isLoading={isLoading}
              />

              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    {selectedStream.isInstasettlable && (
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
                    )}
                    <p className={cn('text-[14px] text-white52')}>
                      Effective Price
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image
                        src="/icons/info.svg"
                        alt="info"
                        className="w-3.5 h-3.5 cursor-pointer"
                        width={20}
                        height={20}
                        priority // Add priority to load the image faster
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0D0D0D] z-50 max-w-[280px] border-[2px] border-white12">
                      {/* <p>{infoDetail || 'Additional information'}</p> */}
                      <p>
                        Lorem Ipsum is simply dummy text of the printing and
                        typesetting industry. Lorem Ipsum has been the
                        industry's standard dummy text ever since the 1500
                        &nbsp;{' '}
                        <a
                          href="https://www.lipsum.com/"
                          target="_blank"
                          className="text-[#aeabab] underline"
                        >
                          Learn more
                        </a>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[14px]">
                    {effectivePrice?.toFixed(2)} {tokenOut?.symbol || 'N/A'} /{' '}
                    {tokenIn?.symbol || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-1">
                  <p className={cn('text-[14px] text-white52')}>
                    Amount Received
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image
                        src="/icons/info.svg"
                        alt="info"
                        className="w-3.5 h-3.5 cursor-pointer"
                        width={20}
                        height={20}
                        priority // Add priority to load the image faster
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0D0D0D] z-50 max-w-[280px] border-[2px] border-white12">
                      {/* <p>{infoDetail || 'Additional information'}</p> */}
                      <p>
                        Lorem Ipsum is simply dummy text of the printing and
                        typesetting industry. Lorem Ipsum has been the
                        industry's standard dummy text ever since the 1500
                        &nbsp;{' '}
                        <a
                          href="https://www.lipsum.com/"
                          target="_blank"
                          className="text-[#aeabab] underline"
                        >
                          Learn more
                        </a>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-1">
                  <p className={cn('text-[14px] text-white52')}>
                    Settler Payment
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image
                        src="/icons/info.svg"
                        alt="info"
                        className="w-3.5 h-3.5 cursor-pointer"
                        width={20}
                        height={20}
                        priority // Add priority to load the image faster
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0D0D0D] z-50 max-w-[280px] border-[2px] border-white12">
                      {/* <p>{infoDetail || 'Additional information'}</p> */}
                      <p>
                        Lorem Ipsum is simply dummy text of the printing and
                        typesetting industry. Lorem Ipsum has been the
                        industry's standard dummy text ever since the 1500
                        &nbsp;{' '}
                        <a
                          href="https://www.lipsum.com/"
                          target="_blank"
                          className="text-[#aeabab] underline"
                        >
                          Learn more
                        </a>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                <div className="flex items-center gap-1">
                  <p className={cn('text-[14px] text-white52')}>Fee</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Image
                        src="/icons/info.svg"
                        alt="info"
                        className="w-3.5 h-3.5 cursor-pointer"
                        width={20}
                        height={20}
                        priority // Add priority to load the image faster
                      />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0D0D0D] z-50 max-w-[280px] border-[2px] border-white12">
                      {/* <p>{infoDetail || 'Additional information'}</p> */}
                      <p>
                        Lorem Ipsum is simply dummy text of the printing and
                        typesetting industry. Lorem Ipsum has been the
                        industry's standard dummy text ever since the 1500
                        &nbsp;{' '}
                        <a
                          href="https://www.lipsum.com/"
                          target="_blank"
                          className="text-[#aeabab] underline"
                        >
                          Learn more
                        </a>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                  <p className="text-[14px]">
                    {tradeInfo?.protocolFee
                      ? parseFloat(
                          ethers.utils.formatUnits(
                            tradeInfo.protocolFee,
                            tokenOut?.decimals
                          )
                        ).toFixed(4)
                      : '0'}{' '}
                    {/* {tokenOut.symbol} */}
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

              {selectedStream.isInstasettlable &&
                !(
                  selectedStream.settlements.length > 0 ||
                  selectedStream.cancellations.length > 0
                ) && (
                  <Button
                    text="EXECUTE INSTASETTLE"
                    className="h-[2.25rem]"
                    disabled={
                      isLoading ||
                      selectedStream.settlements.length > 0 ||
                      !walletAddress ||
                      tradeOperationLoading
                    }
                    loading={isLoading}
                    onClick={() => handleInstasettleClick(selectedStream)}
                  />
                )}
            </div>
          )}

          {selectedStream.settlements.length > 0 ||
          selectedStream.cancellations.length > 0 ? (
            ''
          ) : (
            <ConfigTrade
              amountReceived={`$${amountOutUsd.toFixed(2)}`}
              fee="$190.54"
              // isEnabled={
              //   selectedStream.isInstasettlable ||
              //   selectedStream.user?.toLowerCase() ===
              //     walletAddress?.toLowerCase()
              // }

              isEnabled={isUser}
              isUser={isUser}
              isLoading={isLoading || loading || tradeOperationLoading}
              selectedStream={selectedStream}
              handleInstasettleClick={handleInstasettleClick}
              handleCancelClick={handleCancelClick}
              walletAddress={walletAddress}
              isCancellable={selectedStream.cancellations.length === 0}
              tokenIn={tokenIn}
              tokenOut={tokenOut}
              formattedAmountIn={formattedAmountIn}
              remainingAmountIn={
                formatNumberSmart(remainingAmountIn || '0') || undefined
              }
              remainingAmountOut={
                formatNumberSmart(remainingAmountOut || '0') || undefined
              }
            />
          )}
        </div>

        <div className="mt-7">
          <p className="text-[20px] pb-1.5">Streams</p>

          {/* <StreamCard
            status="ongoing"
            stream={[
              {
                sell: {
                  amount: Number(formattedAmountIn),
                  token: tokenIn?.symbol || '',
                },
                buy: {
                  amount: Number(formattedMinAmountOut),
                  token: tokenOut?.symbol || '',
                },
              },
            ]}
            isInstasettle={selectedStream.isInstasettlable}
            date={new Date()}
            timeRemaining={10}
            walletAddress={walletAddress}
            isLoading={isLoading}
          /> */}

          {/* Cancellations */}
          {selectedStream.cancellations &&
            selectedStream.cancellations.length > 0 &&
            selectedStream.cancellations.map((cancellation) => (
              <div
                key={cancellation.id}
                className="w-full p-4 border-[1px] border-red-900/30 bg-red-900/5 rounded-[15px] mt-2.5 hover:bg-red-900/10 transition-all duration-300"
              >
                <div className="w-full flex justify-between gap-1 items-center">
                  <div className="flex items-center gap-0 py-1 px-1 rounded-[4px] uppercase text-red-400 text-[12px] leading-none bg-red-900/20">
                    Cancelled
                  </div>

                  <a
                    href={`https://etherscan.io/tx/${
                      cancellation.id.split('-')[0]
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-400 underline text-[14px] hover:text-red-300 transition-colors cursor-pointer"
                  >
                    {formatWalletAddress(cancellation.id.split('-')[0])}
                  </a>
                </div>

                <div className="mt-2.5 text-[14px] text-white">
                  {isLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    <>
                      Trade cancelled{' '}
                      {formatRelativeTime(cancellation.timestamp)}
                    </>
                  )}
                </div>
              </div>
            ))}

          {formattedSettlements.map((settlement, index) => (
            <StreamCard
              key={settlement.id}
              status="Instasettled"
              stream={[
                {
                  sell: settlement.sell,
                  buy: settlement.buy,
                },
              ]}
              date={new Date(settlement.timestamp * 1000)}
              timeRemaining={settlement.estimatedTime}
              walletAddress={settlement.id.split('-')[0]}
              isInstasettle={false}
              isLoading={isLoading}
            />
          ))}

          {formattedExecutions.map((execution, index) => (
            <StreamCard
              key={execution.id}
              status="completed"
              stream={[
                {
                  sell: execution.sell,
                  buy: execution.buy,
                },
              ]}
              streamIndex={
                selectedStream.isInstasettlable &&
                selectedStream.settlements.length > 0
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
        </div>
      </div>
    </>
  )
}

export default StreamDetails
