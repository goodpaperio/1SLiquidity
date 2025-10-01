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
import { useEffect } from 'react'
import NetworkFee from '../shared/NetworkFee'

type StreamDetailsProps = {
  onBack: () => void
  selectedStream: Trade | null
  walletAddress?: string
  isUser?: boolean
  isLoading?: boolean
  onClose: () => void
  showBackIcon?: boolean
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

  // Fetch contract info on component mount if not already available
  useEffect(() => {
    if (!contractInfo) {
      getContractInfo()
    }
  }, [contractInfo, getContractInfo])

  if (!selectedStream) {
    return null
  }

  const estimatedTime = useStreamTime(
    Number(selectedStream?.lastSweetSpot) || 0
  )

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

  // Calculate USD values (using token price from tokenList)
  const amountInUsd = tokenIn
    ? Number(formattedAmountIn) * (tokenIn.usd_price || 0)
    : 0
  const amountOutUsd = tokenOut
    ? Number(formattedMinAmountOut) * (tokenOut.usd_price || 0)
    : 0

  const aggregates = calculateTradeAggregates(selectedStream)

  // Calculate swapped amount values
  const formattedSwapAmountOut = tokenOut
    ? formatUnits(BigInt(aggregates.realisedAmountOut), tokenOut.decimals)
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

  // Format execution amounts and calculate their times
  const formattedExecutions =
    selectedStream.executions?.map((execution) => ({
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
    })) || []

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
  const swappedAmountIn = tokenIn
    ? formatUnits(BigInt(amountIn) - BigInt(amountRemaining), tokenIn.decimals)
    : '0'
  const swappedAmountInUsd = tokenIn
    ? Number(swappedAmountIn) * (tokenIn.usd_price || 0)
    : 0

  const handleInstasettleClick = async (item: any) => {
    if (isConnectedWallet) {
      const signer = getSigner()

      if (signer) {
        const res = await instasettle(
          {
            tradeId: Number(selectedStream.tradeId),
            tokenInObj: tokenIn,
            tokenOutObj: tokenOut,
            tokenIn: selectedStream.tokenIn || '',
            tokenOut: selectedStream.tokenOut || '',
            amountIn: Number(
              formatUnits(
                BigInt(selectedStream.amountIn),
                tokenIn?.decimals || 18
              )
            ).toString(),
            minAmountOut: Number(
              formatUnits(
                BigInt(selectedStream.minAmountOut),
                tokenOut?.decimals || 18
              )
            ).toString(),
            isInstasettlable: true,
            usePriceBased: false,
            signer: signer,
          },
          signer
        )
        if (res.success) {
          onClose()
        }
      }
    }
  }

  const handleCancelClick = async (item: any) => {
    if (isConnectedWallet) {
      const signer = getSigner()

      if (signer) {
        const res = await cancelTrade(Number(selectedStream.tradeId), signer)
        if (res.success) {
          onClose()
        }
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

    // Existing realisedAmountOut reported on trade (if any)
    const existingRealisedOut = BigInt(trade.realisedAmountOut ?? '0')

    // Final realisedAmountOut = existing + executions sum
    const finalRealisedAmountOut = existingRealisedOut + totalExecRealisedOut

    // amountIn (original) and recalculated amountRemaining
    const amountIn = BigInt(trade.amountIn ?? '0')
    const recalculatedAmountRemaining = amountIn - totalExecutedAmountIn

    return {
      amountIn: amountIn.toString(),
      amountRemaining: recalculatedAmountRemaining.toString(),
      realisedAmountOut: finalRealisedAmountOut.toString(),
    }
  }

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
        {selectedStream.isInstasettlable && (
          <div className="flex items-center py-1 text-sm gap-1 bg-zinc-900 pl-1 pr-1.5 text-primary rounded-full leading-none">
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
            <span className="text-xs sm:inline-block hidden">Instasettle</span>
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
                    {formattedAmountIn} {tokenIn?.symbol}
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
                    ~ {formattedMinAmountOut} {tokenOut?.symbol}
                  </p>
                  <p className="text-white52 text-[14px]">
                    ${amountOutUsd.toFixed(2)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-between py-4 border-b border-borderBottom">
            <div className="flex flex-col leading-tight gap-2 items-start">
              <p className="text-[14px] text-white52">Swapped Input</p>
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-16" />
                </>
              ) : (
                <>
                  <p className="">
                    {swappedAmountIn} {tokenIn?.symbol}
                  </p>
                  <p className="text-white52 text-[14px]">
                    ${swappedAmountInUsd.toFixed(2)}
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
              <p className="text-[14px] text-white52">Output</p>
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-16" />
                </>
              ) : (
                <>
                  <p className="">
                    {formattedSwapAmountOut} {tokenOut?.symbol}
                  </p>
                  <p className="text-white52 text-[14px]">
                    ${swapAmountOutUsd.toFixed(2)}
                  </p>
                </>
              )}
            </div>
          </div>

          <div
            className={cn(
              'flex flex-col gap-2 py-4 border-b border-borderBottom',
              (selectedStream.settlements.length > 0 ||
                selectedStream.cancellations.length > 0) &&
                'border-b-0'
            )}
          >
            <AmountTag
              title="BPS Savings"
              amount={
                selectedStream.isInstasettlable
                  ? `5 BPS ($${(amountInUsd * 0.05).toFixed(2)})`
                  : 'N/A'
              }
              infoDetail="Info"
              titleClassName="text-white52"
              amountClassName="text-white52"
              showInstaIcon={selectedStream.isInstasettlable}
              isLoading={isLoading}
            />
            <AmountTag
              title="Streams Completed"
              amount={
                isLoading
                  ? '0'
                  : selectedStream.settlements.length > 0 ||
                    selectedStream.cancellations.length > 0
                  ? (Number(executionsCount) + 1).toString()
                  : executionsCount.toString()
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
                      selectedStream.settlements.length > 0 ||
                      selectedStream.cancellations.length > 0
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
              selectedStream.cancellations.length > 0
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
              amount={formatWalletAddress(selectedStream.user)}
              infoDetail="Info"
              titleClassName="text-white52"
              isLoading={isLoading}
            />
          </div>
          {/* {selectedStream.isInstasettle && (
            <div className="mt-4">
              <Button text="Execute Instasettle" />
            </div>
          )} */}
          {selectedStream.settlements.length > 0 ||
          selectedStream.cancellations.length > 0 ? (
            ''
          ) : (
            <ConfigTrade
              amountReceived={`$${amountOutUsd.toFixed(2)}`}
              fee="$190.54"
              isEnabled={
                selectedStream.isInstasettlable ||
                selectedStream.user?.toLowerCase() ===
                  walletAddress?.toLowerCase()
              }
              // isEnabled={true}
              isUser={isUser}
              isLoading={isLoading || loading}
              selectedStream={selectedStream}
              handleInstasettleClick={handleInstasettleClick}
              handleCancelClick={handleCancelClick}
              walletAddress={walletAddress}
              isCancellable={selectedStream.cancellations.length === 0}
              tokenIn={tokenIn}
              formattedAmountIn={formattedAmountIn}
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
