import { Badge } from '@/components/ui/badge'
import { Stream } from '../../lib/types/stream'
import Image from 'next/image'
import React from 'react'

type Props = {
  stream: Stream
  onClick?: (stream: Stream) => void
  isUser?: boolean
}

const SwapStream: React.FC<Props> = ({ stream, onClick, isUser }) => {
  return (
    <div
      className="w-full border border-white14 relative bg-white005 p-4 rounded-[15px] cursor-pointer"
      onClick={() => onClick?.(stream)}
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
            <Image
              src={stream.fromToken.icon}
              width={2400}
              height={2400}
              alt={stream.fromToken.symbol}
              className="w-[18px] h-[18px]"
            />
            <p className="text-white uppercase">
              {stream.fromToken.amount} {stream.fromToken.symbol}
            </p>
          </div>
          <Image
            src="/icons/right-arrow.svg"
            width={2400}
            height={2400}
            alt="swapStream"
            className="w-[10px]"
          />
          <div className="flex items-center gap-1">
            <Image
              src={stream.toToken.icon}
              width={2400}
              height={2400}
              alt={stream.toToken.symbol}
              className="w-[18px] h-[18px]"
            />
            <p className="text-white uppercase">
              {stream.toToken.estimatedAmount} {stream.toToken.symbol} (Est)
            </p>
          </div>
        </div>

        <div className="w-full h-[3px] bg-white005 mt-[12px] relative">
          <div
            className="h-[3px] bg-primary absolute top-0 left-0"
            style={{
              width: `${
                (stream.progress.completed / stream.progress.total) * 100
              }%`,
            }}
          />
        </div>

        <div className="mt-1.5 flex justify-between items-center gap-2 text-white52">
          <p className="">
            {stream.progress.completed}/{stream.progress.total} completed
          </p>
          <div className="flex gap-2">
            <div className="flex items-center">
              <Image
                src="/icons/time.svg"
                alt="clock"
                className="w-5"
                width={20}
                height={20}
              />
              <p>{stream.timeRemaining} min</p>
            </div>
            {stream.isInstasettle && (
              <div className="flex items-center text-sm gap-1 bg-zinc-900 pl-1 pr-1.5 text-primary rounded-full leading-none">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 sm:w-5 sm:h-5"
                >
                  <path
                    d="M13 2L6 14H11V22L18 10H13V2Z"
                    fill="#40f798"
                    fillOpacity="0.72"
                  />
                </svg>
                <span className="text-xs sm:inline-block hidden">
                  Instasettle
                </span>
              </div>
            )}
          </div>
        </div>

        {stream.limit && (
          <div className="flex gap-1.5 mt-1 items-center">
            <div className="p-[3px] rounded-[4px] !text-[12px] flex items-center justify-center bg-primary uppercase text-black">
              Limit
            </div>
            <div className="text-white52 text-[14px]">
              {stream.limit.price} {stream.limit.token}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SwapStream
