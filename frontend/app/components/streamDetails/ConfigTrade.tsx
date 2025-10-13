'use client'

import Image from 'next/image'
import React, { useCallback, useEffect, useState } from 'react'
import AmountTag from '../amountTag'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import Button from '../button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useCoreTrading } from '@/app/lib/hooks/useCoreTrading'
import { ethers } from 'ethers'

type Props = {
  amountReceived: string
  fee: string
  isEnabled: boolean
  isUser: boolean
  isLoading?: boolean
  walletAddress?: string
  selectedStream: any
  handleInstasettleClick: (selectedStream: any) => void
  handleCancelClick: (selectedStream: any) => void
  isCancellable: boolean
  tokenIn?: any
  tokenOut?: any
  formattedAmountIn?: string
}

const ConfigTrade: React.FC<Props> = ({
  amountReceived,
  fee,
  isEnabled,
  isUser,
  isLoading = false,
  walletAddress,
  selectedStream,
  handleInstasettleClick,
  handleCancelClick,
  isCancellable,
  tokenIn,
  tokenOut,
  formattedAmountIn,
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const toggleDetails = () => setShowDetails(!showDetails)
  const [tradeInfo, setTradeInfo] = useState<any>(null)

  const LoadingSkeleton = () => (
    <div className="flex items-center space-x-2">
      <Skeleton className="h-4 w-24 bg-white/10" />
    </div>
  )

  const { getTradeInfo } = useCoreTrading()

  const getTradeInfoCallback = useCallback(async () => {
    const tradeInfo = await getTradeInfo(selectedStream.tradeId, true)
    setTradeInfo(tradeInfo)
  }, [getTradeInfo, selectedStream.tradeId])

  const settlerPaymentFormatted = tradeInfo?.settlerPayment
    ? parseFloat(
        ethers.utils.formatUnits(tradeInfo.settlerPayment, tokenOut.decimals)
      ).toFixed(4)
    : '0'

  // console.log('settlerPaymentFormatted', settlerPaymentFormatted)
  // console.log('tradeInfo', tradeInfo)

  useEffect(() => {
    getTradeInfoCallback()
  }, [getTradeInfoCallback])

  return (
    <div
      className={cn(
        'w-full p-2.5 bg-[#9798971A] mt-4 rounded-[8px]',
        showDetails ? 'border-[1px] border-white12' : ''
      )}
    >
      <div
        className={`w-full flex justify-center gap-1 duration-300 ease-in-out ${
          isEnabled ? 'text-white cursor-pointer' : 'text-white/50'
        }`}
        onClick={isEnabled ? toggleDetails : undefined}
      >
        Config Trade
      </div>

      {/* Animate visibility of amount details */}
      <div
        className={`transition-height duration-300 ease-in-out overflow-hidden ${
          showDetails
            ? 'max-h-[1000px] border-t mt-2.5 border-borderBottom border-white12'
            : 'max-h-0'
        }`}
      >
        {selectedStream.isInstasettlable ? (
          <>
            <div
              className={cn(
                'w-full flex flex-col gap-2 py-4 border-b border-borderBottom border-white12',
                isUser && 'mb-4',
                !isUser && 'border-b-0'
              )}
            >
              <div className="flex items-start w-full flex-col justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
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
                    <span className="text-lg font-medium">Instasettlable</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-zinc-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                        <p>
                          Maximum price difference you're willing to accept for
                          this trade
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1">
                    <p className={cn('text-[14px]')}>Amount Received</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Image
                          src="/icons/info.svg"
                          alt="info"
                          className="w-4 h-4 cursor-pointer"
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
                      {Number(formattedAmountIn)} {tokenIn.symbol}
                    </p>
                    <Image
                      src={
                        (tokenIn?.symbol.toLowerCase() === 'usdt'
                          ? '/tokens/usdt.svg'
                          : tokenIn?.icon) || '/icons/default-token.svg'
                      }
                      alt={tokenIn?.symbol || 'token'}
                      width={40}
                      height={40}
                      className="border-[1.5px] border-black w-[20px] rounded-full"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1">
                    <p className={cn('text-[14px]')}>Settler Payment</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Image
                          src="/icons/info.svg"
                          alt="info"
                          className="w-4 h-4 cursor-pointer"
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
                              tokenOut.decimals
                            )
                          ).toFixed(4)
                        : 0}{' '}
                      {tokenOut.symbol}
                    </p>
                    <Image
                      src={
                        (tokenOut?.symbol.toLowerCase() === 'usdt'
                          ? '/tokens/usdt.svg'
                          : tokenOut?.icon) || '/icons/default-token.svg'
                      }
                      alt={tokenOut?.symbol || 'token'}
                      width={40}
                      height={40}
                      className="border-[1.5px] border-black w-[20px] rounded-full"
                    />
                  </div>
                </div>

                {/* <div className="w-full">
                  <AmountTag
                    title="Fee"
                    amount={
                      tradeInfo?.protocolFee
                        ? parseFloat(
                            ethers.utils.formatUnits(
                              tradeInfo.protocolFee,
                              tokenOut.decimals
                            )
                          ).toFixed(4)
                        : '0'
                    }
                    infoDetail="Estimated"
                    isLoading={false}
                    className="w-full"
                  />
                </div> */}

                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1">
                    <p className={cn('text-[14px]')}>Fee</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Image
                          src="/icons/info.svg"
                          alt="info"
                          className="w-4 h-4 cursor-pointer"
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
                              tokenOut.decimals
                            )
                          ).toFixed(4)
                        : '0'}{' '}
                      {/* {tokenOut.symbol} */}
                    </p>
                    <Image
                      src={
                        (tokenOut?.symbol.toLowerCase() === 'usdt'
                          ? '/tokens/usdt.svg'
                          : tokenOut?.icon) || '/icons/default-token.svg'
                      }
                      alt={tokenOut?.symbol || 'token'}
                      width={40}
                      height={40}
                      className="border-[1.5px] border-black w-[20px] rounded-full"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-0">
                <Button
                  text="EXECUTE INSTASETTLE"
                  className="h-[2.25rem]"
                  disabled={
                    isLoading ||
                    selectedStream.settlements.length > 0 ||
                    !walletAddress
                  }
                  loading={isLoading}
                  onClick={() => handleInstasettleClick(selectedStream)}
                />
              </div>
            </div>

            <div className="mt-0">
              {isUser && (
                <Button
                  text="CANCEL TRADE"
                  theme="destructive"
                  className="h-[2.25rem]"
                  disabled={isLoading || !isCancellable || !walletAddress}
                  loading={isLoading}
                  onClick={() => handleCancelClick(selectedStream)}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className={cn('w-full flex flex-col gap-2 py-4')}>
              <div className="flex items-start w-full flex-col justify-between gap-1.5">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-1">
                    <p className={cn('text-[14px]')}>Amount Received</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Image
                          src="/icons/info.svg"
                          alt="info"
                          className="w-4 h-4 cursor-pointer"
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
                      {Number(formattedAmountIn)} {tokenIn.symbol}
                    </p>
                    <Image
                      src={
                        (tokenIn?.symbol.toLowerCase() === 'usdt'
                          ? '/tokens/usdt.svg'
                          : tokenIn?.icon) || '/icons/default-token.svg'
                      }
                      alt={tokenIn?.symbol || 'token'}
                      width={40}
                      height={40}
                      className="border-[1.5px] border-black w-[20px] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {isUser && (
              <Button
                text="CANCEL TRADE"
                theme="destructive"
                className="h-[2.25rem]"
                disabled={isLoading || !isCancellable || !walletAddress}
                loading={isLoading}
                onClick={() => handleCancelClick(selectedStream)}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ConfigTrade
