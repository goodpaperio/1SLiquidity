import { TOKENS, WALLET_TABS } from '@/app/lib/constants'
import { formatWalletAddress } from '@/app/lib/helper'
import Image from 'next/image'
import { useState } from 'react'
import Modal from '.'
import StreamDetails from '../streamDetails'
import SwapStream from '../swapStream'
import Tabs from '../tabs'
import { MOCK_STREAMS } from '@/app/lib/constants/streams'
import { Stream } from '@/app/lib/types/stream'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'

type WalletDetailsModalProps = {
  isOpen: boolean
  onClose: () => void
  walletAddress?: string
}

const WalletDetailsModal: React.FC<WalletDetailsModalProps> = ({
  isOpen,
  onClose,
  walletAddress = 'GY68234nasmd234asfKT21',
}) => {
  const [activeTab, setActiveTab] = useState(WALLET_TABS[0])
  const [isStreamDetailsOpen, setIsStreamDetailsOpen] = useState(false)
  const [selectedStream, setSelectedStream] = useState<any>(null)

  // Fetch trades data
  const {
    trades,
    isLoading: isLoadingTrades,
    error: tradesError,
  } = useTrades({
    first: 10,
    skip: 0,
  })

  // Fetch token list for conversion
  const { tokens: tokenList, isLoading: isLoadingTokens } = useTokenList()

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* close icon */}
      <div
        onClick={onClose}
        className="bg-[#232624] cursor-pointer rounded-full p-2 absolute top-6 -left-3 z-50"
      >
        <Image
          src={'/icons/close.svg'}
          alt="close"
          className="w-2"
          width={1000}
          height={1000}
          onClick={onClose}
        />
      </div>

      {/* main content */}
      <div className="relative max-h-[95vh] overflow-hidden overflow-y-auto">
        {selectedStream ? (
          <>
            <StreamDetails
              onBack={() => setIsStreamDetailsOpen(false)}
              selectedStream={selectedStream}
              onClose={onClose}
            />
          </>
        ) : (
          <>
            <div className="flex justify-between gap-2 h-full sticky bg-black top-0 p-6 rounded-2xl z-40">
              <div className="flex gap-3 items-center">
                <div className="relative h-fit">
                  <Image
                    src={'/icons/token.svg'}
                    alt="coin"
                    className="w-8 h-8"
                    width={1000}
                    height={1000}
                  />
                  <Image
                    src="/icons/token-icon.svg"
                    alt="token symbol"
                    className="w-4 h-4 absolute bottom-0 right-0"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-white">
                  {formatWalletAddress('GY68234nasmd234asfKT21')}
                </p>
              </div>
              <Image
                src={'/icons/switchoff.svg'}
                alt="close"
                className="w-6 cursor-pointer"
                width={1000}
                height={1000}
                onClick={onClose}
              />
            </div>

            {/* wallet amount details */}
            <div className="px-6 pb-6">
              <div className="">
                <p className="text-[36px] font-bold">$915.56</p>
                {/* progress */}
                <div className="flex gap-1.5 text-white text-[14px]">
                  <Image
                    src={'/icons/progress-down.svg'}
                    alt="progress"
                    className="w-2.5"
                    width={1000}
                    height={1000}
                  />
                  <p className="">$22.39 (2.39%)</p>
                  <p>Today</p>
                </div>
              </div>

              {/* LP Positions */}
              <div className="mt-7 bg-white005 py-4 px-3.5 rounded-[15px]">
                <div className="flex text-white gap-1 items-center">
                  <p className="">LP Positions</p>
                  <Image
                    src={'/icons/right-arrow.svg'}
                    alt="arrow-lp"
                    className="w-3 mt-1"
                    width={1000}
                    height={1000}
                  />
                </div>
                <p className="text-[20px]">$999,999.99</p>
                <div className="flex gap-1 text-white">
                  <p className="">Reward: </p>
                  <p className="">$22.39 </p>
                </div>
              </div>

              {/* tabs */}
              <div className="mt-[34px] w-full">
                <Tabs
                  tabs={WALLET_TABS}
                  theme="secondary"
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  tabHeight={32}
                />
              </div>

              {/* ongoing streams */}
              {activeTab == WALLET_TABS[0] ? (
                <div>
                  <div className="mt-4">
                    <p className="text-[20px]">Ongoing Streams</p>
                    <div className="flex flex-col gap-2.5 mt-4">
                      {!isLoadingTrades && trades.length === 0 ? (
                        <div className="text-white52 text-center py-8">
                          No trades found
                        </div>
                      ) : (
                        <>
                          {trades.map((trade, index) => (
                            <SwapStream
                              key={index}
                              onClick={() => {
                                setIsStreamDetailsOpen(true)
                                setSelectedStream(trade)
                              }}
                              trade={trade}
                              isLoading={isLoadingTrades}
                            />
                          ))}
                          {isLoadingTrades &&
                            Array(4)
                              .fill(0)
                              .map((_, index) => (
                                <SwapStream
                                  key={`skeleton-${index}`}
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
                              ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Past Streams */}
                  {/* <div className="mt-4">
                    <p className="text-[20px]">Past Streams</p>
                    <div className="flex flex-col gap-2.5 mt-4">
                      <SwapStream
                        onClick={() => {
                          setIsStreamDetailsOpen(true)
                          setSelectedStream(MOCK_STREAMS[0])
                        }}
                        stream={MOCK_STREAMS[0]}
                      />
                      <SwapStream
                        onClick={() => {
                          setIsStreamDetailsOpen(true)
                          setSelectedStream(MOCK_STREAMS[0])
                        }}
                        stream={MOCK_STREAMS[0]}
                      />
                    </div>
                  </div> */}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 my-[13px]">
                  {TOKENS.map((token, ind) => (
                    <div
                      key={ind}
                      className="w-full flex items-center justify-between border border-white14 bg-white005 hover:bg-neutral-800 p-4 rounded-[15px] cursor-pointer"
                    >
                      <div className="flex gap-[12px]">
                        <div className="relative h-fit">
                          <Image
                            src={token.icon}
                            alt={token.name}
                            className="w-[40px] h-[40px]"
                            width={1000}
                            height={1000}
                          />
                          <Image
                            src="/icons/token.svg"
                            alt="close"
                            className="w-[18px] h-[18px] absolute bottom-0 right-0 z-10"
                            width={20}
                            height={20}
                          />
                        </div>
                        <div>
                          <p className="text-[18px] p-0 leading-tight">
                            {token.symbol}
                          </p>
                          <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                            {token.value}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end">
                        {
                          <p
                            className={`text-[16px] p-0 leading-tight ${
                              token.status == 'increase'
                                ? 'text-primary'
                                : 'text-primaryRed'
                            }`}
                          >
                            {`${token.status == 'increase' ? '+' : '-'} ${
                              token.statusAmount
                            }`}
                          </p>
                        }
                        {/* {token.status == 'increase' ? ( */}
                        <div className="flex gap-1 items-center">
                          <Image
                            src={
                              token.status == 'increase'
                                ? '/icons/progress-up.svg'
                                : '/icons/progress-down.svg'
                            }
                            alt="progress"
                            className="w-2"
                            width={1000}
                            height={1000}
                          />
                          <p className="text-[14px]">
                            {`${token.statusAmount} (2.39%)`}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default WalletDetailsModal
