import Image from 'next/image'
import React, { useEffect, useState } from 'react'
import AmountTag from '../../amountTag'
import { ReserveData } from '@/app/lib/dex/calculators'
import { formatEther } from 'ethers/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import DexSummary from './DexSummary'
import { formatNumberSmart } from '@/app/lib/utils/number'

interface DetailSectionProps {
  sellAmount?: string
  buyAmount?: string
  inValidAmount?: boolean
  reserves?: ReserveData | null
  botGasLimit?: bigint | null
  streamCount?: number | null
  tokenFromSymbol?: string
  tokenToSymbol?: string
  tokenToUsdPrice?: number
  estTime?: string
  isCalculating?: boolean
  isFetchingReserves?: boolean
  slippageSavings?: number | null
  dexFee?: number | null
  usePriceBased?: boolean
}

const DetailSection: React.FC<DetailSectionProps> = ({
  sellAmount,
  buyAmount,
  inValidAmount,
  reserves,
  dexFee,
  botGasLimit,
  streamCount,
  tokenFromSymbol,
  tokenToSymbol,
  tokenToUsdPrice = 0,
  estTime = '',
  isCalculating = false,
  slippageSavings = null,
  isFetchingReserves = false,
  usePriceBased = true,
}) => {
  const [showDetails, setShowDetails] = useState(true)

  const toggleDetails = () => setShowDetails(!showDetails)

  // useEffect(() => {
  //   if (isFetchingReserves || isCalculating) {
  //     setShowDetails(false)
  //   }
  // }, [isFetchingReserves, isCalculating])

  // Calculate the fee amount based on sellAmount and fee percentage
  const calculateFeeAmount = () => {
    if (!dexFee || !sellAmount) return '$0.00'

    // Simple calculation: sellAmount * (fee / 100)
    const numericSellAmount = parseFloat(sellAmount)
    if (isNaN(numericSellAmount)) return '$0.00'

    const feeAmount = numericSellAmount * (dexFee / 100)
    return `$${feeAmount.toFixed(2)}`
  }

  // Extract fee tier from DEX type for display purposes
  const extractFeeTier = (dexType: string): string => {
    if (dexType && dexType.startsWith('uniswap-v3-')) {
      const feeStr = dexType.split('-').pop()
      if (feeStr && !isNaN(parseInt(feeStr))) {
        const feeBps = parseInt(feeStr)
        // Convert basis points to percentage for display
        return `${(feeBps / 10000).toFixed(2)}%`
      }
    }
    return dexFee ? `${dexFee}%` : 'Unknown'
  }

  // Calculate minimum output correction based on buy amount and stream count
  const calculateMinOutputCorrection = () => {
    if (!buyAmount || !streamCount) return null
    const numericBuyAmount = parseFloat(buyAmount)
    if (isNaN(numericBuyAmount)) return null
    const minOutput = numericBuyAmount / streamCount
    let usdString = ''
    if (tokenToUsdPrice && !isNaN(tokenToUsdPrice)) {
      const usdValue = minOutput * tokenToUsdPrice
      usdString = ` ($${usdValue.toFixed(2)})`
    }
    return `${minOutput.toFixed(4)} ${tokenToSymbol}${usdString}`
  }

  // Format slippage savings as percentage and USD value
  const formatSlippageSavings = () => {
    if (!slippageSavings || !buyAmount) return '0%'
    const numericBuyAmount = parseFloat(buyAmount)
    if (isNaN(numericBuyAmount) || numericBuyAmount === 0) return '0%'

    // Format USD value
    const usdString = `$${Math.abs(slippageSavings).toFixed(2)}`

    // Calculate percentage
    const savingsPercentage =
      (slippageSavings / (numericBuyAmount * tokenToUsdPrice)) * 100
    const percentString = `${Math.abs(savingsPercentage).toFixed(2)}%`

    console.log('slippage savings ====>', usdString, percentString)

    return `${usdString}`
  }

  const LoadingSkeleton = () => (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-24 bg-white/10" />
    </div>
  )

  return (
    <div className="w-full p-5 border-[2px] border-white12 bg-[#0D0D0D] my-[26px] mt-[20px] rounded-[15px]">
      <div
        className={`w-full flex justify-between gap-1 duration-300 ease-in-out cursor-pointer`}
        onClick={toggleDetails}
      >
        <div
          className={`flex gap-1.5 items-center ${
            inValidAmount ? 'text-primaryRed' : ''
          }`}
        >
          {inValidAmount && (
            <Image
              src="/icons/warning.svg"
              alt="error"
              className="w-5"
              width={20}
              height={20}
            />
          )}
          <p>
            {formatNumberSmart(sellAmount)} {tokenFromSymbol}
          </p>
          {inValidAmount ? (
            <Image
              src="/icons/red-right-arrow.svg"
              alt="stream"
              className="w-2.5"
              width={20}
              height={20}
            />
          ) : (
            <Image
              src="/icons/right-arrow.svg"
              alt="stream"
              className="w-2.5"
              width={20}
              height={20}
            />
          )}
          <p>
            {isCalculating ? (
              <LoadingSkeleton />
            ) : (
              `${formatNumberSmart(buyAmount)} ${tokenToSymbol} (Est)`
            )}
          </p>
        </div>
        <div className="flex gap-2.5 items-center">
          <div className="flex gap-1.5">
            <Image
              src="/icons/time.svg"
              alt="clock"
              className="w-5"
              width={20}
              height={20}
            />
            {isCalculating ? <LoadingSkeleton /> : <p>{estTime || '...'}</p>}
          </div>
          <Image
            src="/icons/up-arrow.svg"
            alt="up-arrow"
            className={`w-2.5 ${showDetails ? 'rotate-0' : 'rotate-180'}`}
            width={20}
            height={20}
          />
        </div>
      </div>

      {/* Animate visibility of amount details */}
      <div
        className={`transition-height duration-300 ease-in-out overflow-hidden ${
          showDetails
            ? 'max-h-[1000px] border-t mt-4 border-borderBottom'
            : 'max-h-0'
        }`}
      >
        <div className="w-full flex flex-col gap-2 py-4 border-b border-borderBottom">
          {dexFee && (
            <AmountTag
              title={`DEX Fee (${dexFee}%)`}
              amount={isCalculating ? undefined : calculateFeeAmount()}
              infoDetail="Estimated"
              isLoading={isCalculating}
            />
          )}
          {/* <AmountTag
            title="Bot Gas Allowance"
            amount={
              isCalculating
                ? undefined
                : botGasLimit
                ? `${parseFloat(formatEther(botGasLimit)).toFixed(4)} ETH`
                : undefined
            }
            infoDetail="Estimated"
            isLoading={isCalculating}
          /> */}
          {/* <AmountTag
            error={inValidAmount}
            title="Estimated Output"
            amount={'3,300 USDC  ($3,096.69)'}
            infoDetail="Estimated"
          /> */}
          <AmountTag
            title="Slippage Savings"
            amount={isCalculating ? undefined : formatSlippageSavings()}
            infoDetail="Estimated"
            isLoading={isCalculating}
          />
          {/* <AmountTag
            title="Price Impact"
            amount={'0.25%'}
            infoDetail="Estimated"
          /> */}
        </div>
        <div className="w-full flex flex-col gap-2 py-4">
          {/* <AmountTag
            title="Stream Volume ($)"
            amount={'$3,096.69'}
            infoDetail="Estimated"
          /> */}
          <AmountTag
            // title="Min. Output Correction"
            title="Stream Volume"
            amount={
              isCalculating
                ? undefined
                : calculateMinOutputCorrection() || undefined
            }
            infoDetail="Estimated"
            isLoading={isCalculating}
          />
          <AmountTag
            title="Est. Stream Count"
            amount={isCalculating ? undefined : streamCount?.toString()}
            infoDetail="Estimated"
            isLoading={isCalculating}
          />
          {/* <AmountTag
            title="Est. Time"
            amount={'12 mins'}
            infoDetail="Estimated"
          /> */}
        </div>

        <div className="w-full border-t border-borderBottom">
          <DexSummary
            reserves={reserves}
            tokenFromSymbol={tokenFromSymbol}
            tokenToSymbol={tokenToSymbol}
            usePriceBased={usePriceBased}
          />
        </div>
      </div>

      {/* {reserves && (
        <div
          className={`transition-height duration-300 ease-in-out overflow-hidden ${
            showDetails
              ? 'max-h-[1000px] border-t mt-4 border-borderBottom'
              : 'max-h-0'
          }`}
        >
          <div className="w-full flex flex-col gap-2 py-4 border-b border-borderBottom">
            <h3 className="text-white font-medium mb-2">Liquidity Reserves</h3>
            {reserves && (
              <div className="mb-2">
                <p className="text-white70 text-sm">
                  {reserves.dex.startsWith('uniswap-v3')
                    ? `Uniswap V3 Pool (${extractFeeTier(
                        reserves.dex
                      )} fee tier)`
                    : `${reserves.dex} Pool`}
                </p>
                <div className="flex justify-between mt-1">
                  <p className="text-white text-sm">Token 0:</p>
                  <p className="text-white text-sm">
                    {reserves.reserves.token0
                      ? parseFloat(reserves.reserves.token0).toFixed(5)
                      : '0'}
                  </p>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-white text-sm">Token 1:</p>
                  <p className="text-white text-sm">
                    {reserves.reserves.token1
                      ? parseFloat(reserves.reserves.token1).toFixed(5)
                      : '0'}
                  </p>
                </div>
                <div className="flex justify-between mt-1">
                  <p className="text-white text-sm">Pair Address:</p>
                  <p className="text-white text-xs truncate max-w-[150px]">
                    {reserves.pairAddress}
                  </p>
                </div>
                {reserves.dex.startsWith('uniswap-v3') && (
                  <div className="mt-3 p-2 bg-neutral-800 rounded-md">
                    <p className="text-white70 text-xs mb-1">
                      Uniswap V3 uses concentrated liquidity which may not be
                      accurately represented by reserve values. The actual price
                      impact may vary.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )} */}
    </div>
  )
}

export default DetailSection
