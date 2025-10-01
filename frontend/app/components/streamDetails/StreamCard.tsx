import { formatCustomTime, formatWalletAddress } from '@/app/lib/helper'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  status: 'ongoing' | 'scheduled' | 'completed' | 'Instasettled'
  stream: {
    sell: { amount: number; token: string }
    buy: { amount: number; token: string }
  }[]
  date: Date
  walletAddress?: string
  isInstasettle?: boolean
  timeRemaining?: string
  isLoading?: boolean
  streamIndex?: number
}

const StreamCard: React.FC<Props> = ({
  status,
  stream,
  date,
  walletAddress,
  isInstasettle,
  timeRemaining,
  isLoading = false,
  streamIndex,
}) => {
  const renderStreams = (streams: Props['stream']) => {
    if (streams.length > 4) {
      const firstThree = streams.slice(0, 3)
      const lastOne = streams[streams.length - 1]
      return (
        <>
          {firstThree.map((s, i) => renderStreamLine(s, i))}
          <p>....</p>
          {renderStreamLine(lastOne, streams.length - 1)}
        </>
      )
    } else {
      return streams.map((s, i) => renderStreamLine(s, i))
    }
  }

  const renderStreamLine = (stream: Props['stream'][0], index: number) => (
    <div className="flex text-white" key={index}>
      <p className="text-white52">
        Stream {index + (streamIndex || 1)}: {stream.sell.amount}{' '}
        {stream.sell.token}
      </p>
      <Image
        src="/icons/right-arrow.svg"
        width={20}
        height={20}
        alt="arrow"
        className="w-3 mx-1.5"
      />
      <p className="text-white52">
        {stream.buy.amount} {stream.buy.token}
      </p>
    </div>
  )

  return (
    <div className="w-full p-4 border-[1px] border-white12 bg-white005 rounded-[15px] mt-2.5 hover:bg-tabsGradient transition-all duration-300">
      <div className="w-full flex justify-between gap-1 items-center">
        <div
          className={`${
            !isInstasettle && status === 'ongoing'
              ? 'bg-ongoing'
              : !isInstasettle && status === 'scheduled'
              ? 'bg-scheduled'
              : isInstasettle
              ? 'bg-[#03301b] text-primary pr-1.5'
              : 'bg-primary'
          } flex items-center gap-0 py-1 px-1 rounded-[4px] uppercase text-black text-[12px] leading-none`}
        >
          {isInstasettle && (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4 sm:w-4 sm:h-4"
            >
              <path
                d="M13 2L6 14H11V22L18 10H13V2Z"
                fill="#40f798"
                fillOpacity="0.72"
              />
            </svg>
          )}
          {isInstasettle ? 'Instasettled' : status}
        </div>

        {walletAddress && (
          <a
            href={`https://etherscan.io/tx/${walletAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-primary underline text-[14px] hover:text-primary/80 transition-colors cursor-pointer`}
          >
            {formatWalletAddress(walletAddress)}
          </a>
        )}
      </div>

      <div className="flex flex-col gap-1 mt-2.5">{renderStreams(stream)}</div>

      <div className="mt-1.5 text-[14px] text-white">
        {isLoading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            {isInstasettle ? 'Trade settled in' : ''}{' '}
            {timeRemaining || formatCustomTime(date)}
          </>
        )}
      </div>
    </div>
  )
}

export default StreamCard
