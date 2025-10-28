'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Sidebar from '.'
import StreamDetails from '../streamDetails'
import SwapStream from '../swapStream'
import { cn } from '@/lib/utils'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { Skeleton } from '@/components/ui/skeleton'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import Tabs from '../tabs'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { RefreshIcon, TypewriterIcon } from '@/app/lib/icons'
import { Button } from '@/components/ui/button'
import { useAppKitAccount } from '@reown/appkit/react'
import { X, ChevronDown, XIcon, CheckCircle2 } from 'lucide-react'

type GlobalStreamSidebarProps = {
  isOpen: boolean
  onClose: () => void
  initialStream?: any // We'll type this properly later
  className?: string
  showBackIcon?: boolean
}

// Define the toggle tabs for global vs user trades
const TRADE_TABS = [{ title: 'Global Trades' }, { title: 'My Trades' }]

// Pagination constants
const PAST_TRADES_PER_PAGE = 10

const GlobalStreamSidebar: React.FC<GlobalStreamSidebarProps> = ({
  isOpen,
  onClose,
  initialStream,
  className,
  showBackIcon = true,
}) => {
  const [isStreamSelected, setIsStreamSelected] = useState(false)
  const [selectedStream, setSelectedStream] = useState<any>(
    initialStream || null
  )
  const [activeTab, setActiveTab] = useState(TRADE_TABS[0])
  const [isPastTradesExpanded, setIsPastTradesExpanded] = useState(false)
  const [pastTradesPage, setPastTradesPage] = useState(1)
  const [tradeFilters, setTradeFilters] = useState({
    normal: true,
    instasettled: true,
    cancelled: true,
  })
  const { address } = useAppKitAccount()

  // Reset to default state when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setIsStreamSelected(false)
      setSelectedStream(initialStream || null)
    }
  }, [isOpen, initialStream])

  // Reset pagination when switching tabs
  useEffect(() => {
    setPastTradesPage(1)
    setIsPastTradesExpanded(false)
    setTradeFilters({
      normal: true,
      instasettled: true,
      cancelled: true,
    })
  }, [activeTab])

  // Fetch trades data with Apollo's 30s polling
  const { trades, isLoading, error, isRefetching, refetch } = useTrades({
    first: 100,
    skip: 0,
  })

  const isTradeCompleted = (trade: any) => {
    return (
      trade.executions?.some(
        (execution: any) => execution.lastSweetSpot === '0'
      ) ||
      trade.executions?.some(
        (execution: any) => execution.lastSweetSpot === '0'
      ) ||
      trade.settlements?.length > 0 ||
      trade.cancellations?.length > 0
    )
  }

  const filteredTrades = trades.filter((trade) => {
    if (activeTab.title === 'My Trades') {
      return address && trade.user?.toLowerCase() === address.toLowerCase()
    }
    // For global trades, filter out completed trades
    return !isTradeCompleted(trade)
  })

  const ongoingTrades = trades.filter((trade) => {
    if (activeTab.title === 'My Trades') {
      return (
        address &&
        trade.user?.toLowerCase() === address.toLowerCase() &&
        !isTradeCompleted(trade)
      )
    }
    return filteredTrades.includes(trade)
  })

  const pastTrades = trades.filter((trade) => {
    if (activeTab.title === 'My Trades') {
      return (
        address &&
        trade.user?.toLowerCase() === address.toLowerCase() &&
        isTradeCompleted(trade)
      )
    }
    // For global trades, return all completed trades
    return isTradeCompleted(trade)
  })

  // Determine trade type for filtering
  const getTradeType = (
    trade: any
  ): 'normal' | 'instasettled' | 'cancelled' => {
    if (trade.cancellations?.length > 0) return 'cancelled'
    if (trade.isInstasettlable) return 'instasettled'
    return 'normal'
  }

  // Filter past trades based on selected filters (only for Global Trades)
  const filteredPastTrades =
    activeTab.title === 'Global Trades'
      ? pastTrades.filter((trade) => {
          const tradeType = getTradeType(trade)
          return tradeFilters[tradeType]
        })
      : pastTrades

  // Toggle filter
  const toggleFilter = (
    filterType: 'normal' | 'instasettled' | 'cancelled'
  ) => {
    setTradeFilters((prev) => ({
      ...prev,
      [filterType]: !prev[filterType],
    }))
    // Reset to page 1 when filters change
    setPastTradesPage(1)
  }

  // Fetch token list for price data
  const { tokens, isLoading: isLoadingTokens } = useTokenList()

  // Calculate total USD value of trades (using appropriate trades based on tab)
  const calculateTotalTradesValue = () => {
    const tradesToCalculate =
      activeTab.title === 'My Trades' ? ongoingTrades : filteredTrades
    if (
      !tradesToCalculate ||
      tradesToCalculate.length === 0 ||
      !tokens ||
      tokens.length === 0
    )
      return 0

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

    return tradesToCalculate.reduce((total, trade) => {
      const tokenIn = findTokenForTrade(trade.tokenIn)

      if (!tokenIn) return total

      const formattedAmountIn = formatUnits(
        BigInt(trade.amountIn),
        tokenIn.decimals
      )
      const amountInUsd = Number(formattedAmountIn) * (tokenIn.usd_price || 0)

      return total + amountInUsd
    }, 0)
  }

  // Log trades data whenever it changes
  useEffect(() => {
    if (trades.length > 0) {
      // console.log('Fetched trades:', trades)
    }
    if (error) {
      // console.error('Error fetching trades:', error)
    }
  }, [trades, error])

  const totalTradesValue = calculateTotalTradesValue()

  return (
    <Sidebar isOpen={isOpen} onClose={onClose} className={className}>
      {/* Loading bar */}
      {isRefetching && (
        <div className="absolute top-[2.5px] left-[10px] right-[10px] h-0.5 bg-black z-40 overflow-hidden">
          <div
            className="h-full bg-primary animate-loading-bar"
            style={{
              width: '100%',
              transform: 'translateX(-100%)',
            }}
          />
        </div>
      )}

      {/* close icon */}
      {!selectedStream && (
        <div
          onClick={onClose}
          className={cn(
            'bg-[#232624] cursor-pointer rounded-full p-1.5 absolute top-[2.3rem] -left-[0.7rem] z-50 group hover:bg-[#373D3F] transition-all duration-300',
            className
          )}
        >
          {/* <Image
              src={'/icons/close.svg'}
              alt="close"
              className="w-2"
              width={1000}
              height={1000}
              onClick={onClose}
            /> */}
          <X className="w-3 h-3 text-[#666666] group-hover:text-white transition-all duration-300" />
        </div>
      )}

      {/* main content */}
      <div className="relative max-h-[90vh] overflow-hidden overflow-y-auto scroll-hidden">
        {selectedStream ? (
          <>
            <StreamDetails
              onBack={() => setSelectedStream(null)}
              selectedStream={selectedStream}
              walletAddress={address}
              onClose={() => {
                setIsStreamSelected(false)
                setSelectedStream(null)
                onClose()
              }}
              isUser={
                selectedStream?.user?.toLowerCase() === address?.toLowerCase()
              }
              showBackIcon={showBackIcon}
              onRefetch={refetch}
            />
          </>
        ) : (
          <>
            <div className="flex justify-between mt-[2.5px] gap-2 h-full sticky bg-black top-0 py-6 z-40">
              <>
                <div className="flex gap-3 items-center">
                  <div className="relative w-10 h-10 rounded-full flex items-center justify-center border-primary border-[2px]">
                    {/* <Image
                      src="/icons/live-statistics.svg"
                      alt="logo"
                      className="w-6 h-6"
                      width={40}
                      height={40}
                    /> */}
                    <TypewriterIcon className="w-6 h-6 text-primary" />
                    {/* <div className="absolute w-[24px] h-[12px] bg-primaryRed -bottom-1.5 text-xs font-semibold uppercase flex items-center justify-center rounded-[2px]">
                      LIVE
                    </div> */}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-white text-[20px]">Global Trades</p>
                    {/* <RefreshIcon
                      className={cn(
                        'w-4 h-4 transition-colors duration-300',
                        isRefetching
                          ? 'text-primary animate-refresh-spin'
                          : 'text-white52'
                      )}
                    /> */}
                  </div>
                </div>
              </>
            </div>

            <div className="pb-6 mt-4">
              <div className="p-4 rounded-[15px] bg-white005">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col leading-tight gap-0.5 items-start">
                    <p className="text-white text-xl">Trades</p>
                    {isLoading || isLoadingTokens ? (
                      <>
                        <Skeleton className="h-6 w-16 mt-1" />
                      </>
                    ) : (
                      <>
                        <p className="text-[20px] text-white52">
                          {activeTab.title === 'My Trades'
                            ? ongoingTrades.length
                            : filteredTrades.length}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex flex-col leading-tight gap-0.5 items-start">
                    <p className="text-white text-xl">Volume</p>
                    {isLoading || isLoadingTokens ? (
                      <>
                        <Skeleton className="h-6 w-16 mt-1" />
                      </>
                    ) : (
                      <>
                        <p className="text-white52 text-[20px]">
                          $
                          {totalTradesValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-7">
                {/* Toggle tabs */}
                <div className="mb-4">
                  <Tabs
                    tabs={TRADE_TABS}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    tabHeight={32}
                    theme="secondary"
                  />
                </div>

                <p className="text-[20px] pb-3.5">Ongoing Trades</p>

                <div className="flex flex-col gap-2">
                  {!isLoading &&
                  (activeTab.title === 'My Trades'
                    ? ongoingTrades
                    : filteredTrades
                  ).length === 0 ? (
                    <div className="text-white52 text-center py-4">
                      {activeTab.title === 'My Trades' && !address
                        ? 'Connect wallet to view your trades'
                        : activeTab.title === 'My Trades'
                        ? 'No ongoing trades found for your wallet'
                        : 'No trades found'}
                    </div>
                  ) : (
                    <>
                      {(activeTab.title === 'My Trades'
                        ? ongoingTrades
                        : filteredTrades
                      ).map((trade) => (
                        <SwapStream
                          key={trade.id}
                          onClick={() => {
                            setIsStreamSelected(true)
                            setSelectedStream(trade)
                          }}
                          trade={trade}
                          isLoading={isLoading}
                          isUser={activeTab.title === 'My Trades'}
                        />
                      ))}
                      {isLoading &&
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
                                settlements: [],
                                cancellations: [],
                              }}
                              isLoading={true}
                              isUser={activeTab.title === 'My Trades'}
                            />
                          ))}
                    </>
                  )}
                </div>

                {/* Past Trades - My Trades (always visible) */}
                {activeTab.title === 'My Trades' && pastTrades.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[20px] pb-3.5">Past Trades</p>
                    <div className="flex flex-col gap-2">
                      {pastTrades.map((trade) => (
                        <SwapStream
                          key={trade.id}
                          onClick={() => {
                            setIsStreamSelected(true)
                            setSelectedStream(trade)
                          }}
                          trade={trade}
                          isLoading={isLoading}
                          isUser={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Trades - Global Trades (expandable & paginated) */}
                {activeTab.title === 'Global Trades' &&
                  pastTrades.length > 0 && (
                    <div className="mt-8">
                      <button
                        onClick={() =>
                          setIsPastTradesExpanded(!isPastTradesExpanded)
                        }
                        className="w-full flex items-center justify-between text-[20px] pb-3.5 hover:text-primary transition-colors"
                      >
                        <span>Past Trades ({pastTrades.length})</span>
                        <ChevronDown
                          className={cn(
                            'w-5 h-5 transition-transform duration-300',
                            isPastTradesExpanded && 'rotate-180'
                          )}
                        />
                      </button>

                      <div
                        className={cn(
                          'grid transition-all duration-300 ease-in-out',
                          isPastTradesExpanded
                            ? 'grid-rows-[1fr] opacity-100'
                            : 'grid-rows-[0fr] opacity-0'
                        )}
                      >
                        <div className="overflow-hidden">
                          {/* Filter Pills */}
                          <div className="mb-4">
                            <p className="text-white52 text-xs mb-2">
                              Filter by status:
                            </p>
                            <div className="flex gap-2">
                              {/* Regular/Normal trades pill */}
                              <button
                                onClick={() => toggleFilter('normal')}
                                className={cn(
                                  'flex items-center text-sm gap-1 pl-2 pr-3 py-1.5 rounded-full leading-none whitespace-nowrap transition-all duration-200',
                                  tradeFilters.normal
                                    ? 'bg-zinc-900 text-white'
                                    : 'bg-white005 text-white52'
                                )}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="text-xs">Regular</span>
                              </button>

                              {/* Instasettled pill */}
                              <button
                                onClick={() => toggleFilter('instasettled')}
                                className={cn(
                                  'flex items-center text-sm gap-1 pl-2 pr-3 py-1.5 rounded-full leading-none whitespace-nowrap transition-all duration-200',
                                  tradeFilters.instasettled
                                    ? 'bg-zinc-900 text-primary'
                                    : 'bg-white005 text-white52'
                                )}
                              >
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
                                    fill={
                                      tradeFilters.instasettled
                                        ? '#40f798'
                                        : 'currentColor'
                                    }
                                    fillOpacity="0.72"
                                  />
                                </svg>
                                <span className="text-xs">Instasettled</span>
                              </button>

                              {/* Cancelled pill */}
                              <button
                                onClick={() => toggleFilter('cancelled')}
                                className={cn(
                                  'flex items-center text-sm gap-1 pl-2 pr-3 py-1.5 rounded-full leading-none whitespace-nowrap transition-all duration-200',
                                  tradeFilters.cancelled
                                    ? 'bg-zinc-900 text-red-700'
                                    : 'bg-white005 text-white52'
                                )}
                              >
                                <XIcon className="w-3.5 h-3.5" />
                                <span className="text-xs">Cancelled</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            {filteredPastTrades.length === 0 ? (
                              <div className="text-white52 text-center py-8 text-sm">
                                No trades match the selected filters
                              </div>
                            ) : (
                              filteredPastTrades
                                .slice(
                                  (pastTradesPage - 1) * PAST_TRADES_PER_PAGE,
                                  pastTradesPage * PAST_TRADES_PER_PAGE
                                )
                                .map((trade, index) => (
                                  <div
                                    key={trade.id}
                                    className={cn(
                                      'transition-all duration-300 ease-out',
                                      isPastTradesExpanded
                                        ? 'translate-y-0 opacity-100'
                                        : 'translate-y-[-10px] opacity-0'
                                    )}
                                    style={{
                                      transitionDelay: isPastTradesExpanded
                                        ? `${index * 50}ms`
                                        : '0ms',
                                    }}
                                  >
                                    <SwapStream
                                      onClick={() => {
                                        setIsStreamSelected(true)
                                        setSelectedStream(trade)
                                      }}
                                      trade={trade}
                                      isLoading={isLoading}
                                      isUser={false}
                                    />
                                  </div>
                                ))
                            )}
                          </div>

                          {/* Pagination controls */}
                          {filteredPastTrades.length > PAST_TRADES_PER_PAGE && (
                            <div
                              className={cn(
                                'flex items-center justify-between mt-4 px-2 transition-all duration-300 ease-out',
                                isPastTradesExpanded
                                  ? 'translate-y-0 opacity-100'
                                  : 'translate-y-[-10px] opacity-0'
                              )}
                              style={{
                                transitionDelay: isPastTradesExpanded
                                  ? `${
                                      Math.min(
                                        filteredPastTrades.slice(
                                          (pastTradesPage - 1) *
                                            PAST_TRADES_PER_PAGE,
                                          pastTradesPage * PAST_TRADES_PER_PAGE
                                        ).length,
                                        PAST_TRADES_PER_PAGE
                                      ) * 50
                                    }ms`
                                  : '0ms',
                              }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPastTradesPage((prev) =>
                                    Math.max(1, prev - 1)
                                  )
                                }
                                disabled={pastTradesPage === 1}
                                className="text-xs"
                              >
                                Previous
                              </Button>
                              <span className="text-sm text-white52">
                                Page {pastTradesPage} of{' '}
                                {Math.ceil(
                                  filteredPastTrades.length /
                                    PAST_TRADES_PER_PAGE
                                )}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setPastTradesPage((prev) =>
                                    Math.min(
                                      Math.ceil(
                                        filteredPastTrades.length /
                                          PAST_TRADES_PER_PAGE
                                      ),
                                      prev + 1
                                    )
                                  )
                                }
                                disabled={
                                  pastTradesPage ===
                                  Math.ceil(
                                    filteredPastTrades.length /
                                      PAST_TRADES_PER_PAGE
                                  )
                                }
                                className="text-xs"
                              >
                                Next
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  )
}

export default GlobalStreamSidebar
