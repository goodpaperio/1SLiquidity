'use client'

import { SEL_SECTION_TABS } from '@/app/lib/constants'
import { useToast } from '@/app/lib/context/toastProvider'
import { isNumberValid } from '@/app/lib/helper'
import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import Button from '../../button'
import NotifiSwapStream from '../../toasts/notifiSwapStream'
import DetailSection from '../detailSection'
import CoinBuySection from './coinBuySection'
import CoinSellSection from './coinSellSection'
import SwapBox from './swapBox'
import { useModal } from '@/app/lib/context/modalContext'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { motion, useAnimation, Variants } from 'framer-motion'
import { ChevronDown, RefreshCcw } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import TradingSettings from './TradeSettings'
import { useReserves } from '@/app/lib/hooks/useReserves'
import { useRefreshTimer } from '@/app/lib/hooks/useRefreshTimer'
import { useSwapCalculator } from '@/app/lib/hooks/useSwapCalculator'
import HotPairBox from './HotPair/HotPairBox'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { useWallet } from '@/app/lib/hooks/useWallet'
import { useCoreTrading } from '@/app/lib/hooks/useCoreTrading'
import { useDebouncedVolumeCalculation } from '@/app/lib/hooks/hotpairs/useEnhancedTokens'
import { useTrades } from '@/app/lib/hooks/useTrades'

const TIMER_DURATION = 10 // 10 seconds

const SELSection = () => {
  const [activeTab, setActiveTab] = useState(SEL_SECTION_TABS[0])
  const [sellAmount, setSellAmount] = useState(0)
  const [invaliSelldAmount, setInvalidSellAmount] = useState(false)
  const [invalidBuyAmount, setInvalidBuyAmount] = useState(false)
  const [swap, setSwap] = useState(false)
  const [isSwapOperation, setIsSwapOperation] = useState(false)
  const [pendingSwapAmount, setPendingSwapAmount] = useState<number | null>(
    null
  )
  const [isRefresh, setIsRefresh] = useState(false)
  const [forceRefreshKey, setForceRefreshKey] = useState(0) // Add this to force recalculation

  const [tradingSettings, setTradingSettings] = useState({
    usePriceBased: false, // Always false - only reserve-based trading is supported
    instasettlableValue: null as string | null,
    isInstasettlable: false,
    onlyInstasettle: false,
  })

  const { addToast } = useToast()
  const {
    selectedTokenFrom,
    selectedTokenTo,
    setSelectedTokenFrom,
    setSelectedTokenTo,
  } = useModal()
  const { address, isConnected } = useAppKitAccount()
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false)
  const [isInsufficientLiquidity, setIsInsufficientLiquidity] = useState(false)
  const { placeTrade, loading, placeTradeDummy } = useCoreTrading()
  const { getSigner, isConnected: isConnectedWallet } = useWallet()
  const { refetch: refetchTrades } = useTrades({
    first: 100,
    skip: 0,
  })

  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]

  // Get token list for setting defaults
  const { tokens } = useTokenList()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const lastTokenChangeRef = useRef<{ from: string | null; to: string | null }>(
    {
      from: selectedTokenFrom?.token_address || null,
      to: selectedTokenTo?.token_address || null,
    }
  )

  // useEffect(() => {
  //   return () => {
  //     // Reset token states when component unmounts
  //     setSelectedTokenFrom(null)
  //     setSelectedTokenTo(null)
  //   }
  // }, [setSelectedTokenFrom, setSelectedTokenTo])

  // Set default tokens on mount if no tokens are selected
  // useEffect(() => {
  //   if (!selectedTokenFrom && !selectedTokenTo && tokens.length > 0) {
  //     const usdt = tokens.find((token) => token.symbol.toLowerCase() === 'usdt')
  //     const weth = tokens.find((token) => token.symbol.toLowerCase() === 'weth')

  //     if (usdt && weth) {
  //       console.log('Setting default tokens:', {
  //         from: usdt.symbol,
  //         to: weth.symbol,
  //         chainId,
  //       })
  //       setSelectedTokenFrom(usdt)
  //       setSelectedTokenTo(weth)
  //     }
  //   }
  // }, [
  //   selectedTokenFrom,
  //   selectedTokenTo,
  //   tokens,
  //   chainId,
  //   setSelectedTokenFrom,
  //   setSelectedTokenTo,
  // ])

  // Handle URL search parameters for token pair selection (higher priority than defaults)
  useEffect(() => {
    const fromSymbol = searchParams.get('from')
    const toSymbol = searchParams.get('to')

    if ((fromSymbol || toSymbol) && tokens.length > 0) {
      let fromToken = null
      let toToken = null

      if (fromSymbol) {
        fromToken = tokens.find(
          (token) => token.symbol.toLowerCase() === fromSymbol.toLowerCase()
        )
      }

      if (toSymbol) {
        toToken = tokens.find(
          (token) => token.symbol.toLowerCase() === toSymbol.toLowerCase()
        )
      }

      // Only set tokens if we found valid matches and they're different
      if (
        fromToken &&
        toToken &&
        fromToken.token_address !== toToken.token_address
      ) {
        console.log('Setting tokens from URL params:', {
          from: fromToken.symbol,
          to: toToken.symbol,
        })
        setSelectedTokenFrom(fromToken)
        setSelectedTokenTo(toToken)

        // Clean up URL parameters after setting tokens to avoid conflicts
        const url = new URL(window.location.href)
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        router.replace(url.pathname, { scroll: false })
      } else if (fromToken && !toToken) {
        // If only 'from' token is valid, set it and keep existing 'to' token or set default
        setSelectedTokenFrom(fromToken)
        if (!selectedTokenTo) {
          const defaultTo = tokens.find(
            (token) =>
              token.symbol.toLowerCase() === 'weth' &&
              token.token_address !== fromToken.token_address
          )
          if (defaultTo) setSelectedTokenTo(defaultTo)
        }

        // Clean up URL parameters
        const url = new URL(window.location.href)
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        router.replace(url.pathname, { scroll: false })
      } else if (!fromToken && toToken) {
        // If only 'to' token is valid, set it and keep existing 'from' token or set default
        setSelectedTokenTo(toToken)
        if (!selectedTokenFrom) {
          const defaultFrom = tokens.find(
            (token) =>
              token.symbol.toLowerCase() === 'usdt' &&
              token.token_address !== toToken.token_address
          )
          if (defaultFrom) setSelectedTokenFrom(defaultFrom)
        }

        // Clean up URL parameters
        const url = new URL(window.location.href)
        url.searchParams.delete('from')
        url.searchParams.delete('to')
        router.replace(url.pathname, { scroll: false })
      }
    }
  }, [
    searchParams,
    tokens,
    setSelectedTokenFrom,
    setSelectedTokenTo,
    router,
    selectedTokenFrom,
    selectedTokenTo,
  ])

  // Get our reserves hook functionality
  const {
    reserveData,
    dexCalculator,
    isFetchingReserves,
    calculationError: reserveError,
    fetchReserves,
  } = useReserves({
    selectedTokenFrom,
    selectedTokenTo,
    chainId,
  })

  const {
    buyAmount,
    isCalculating,
    calculationError: swapError,
    botGasLimit,
    streamCount: localStreamCount,
    estTime,
    slippageSavings: localSlippageSavings,
    setCalculationError,
  } = useSwapCalculator({
    sellAmount,
    dexCalculator,
    reserveData: reserveData as any,
    isSwapOperation,
    selectedTokenTo,
    isRefresh,
    forceRefreshKey, // Add this prop
  })

  // Use API-based slippage calculation with debouncing
  const volumeCalculation = useDebouncedVolumeCalculation({
    tokenA: selectedTokenFrom?.token_address,
    tokenB: selectedTokenTo?.token_address,
    volume: sellAmount,
    tokenBUsdPrice: selectedTokenTo?.usd_price || 1,
    debounceMs: 300,
  })

  // Use API slippage savings if available, otherwise fall back to local calculation
  const slippageSavings = useMemo(() => {
    if (volumeCalculation.result?.slippageSavingsUsd !== undefined) {
      return volumeCalculation.result.slippageSavingsUsd
    }
    return localSlippageSavings
  }, [volumeCalculation.result, localSlippageSavings])

  // Use API sweetSpot as streamCount if available, otherwise fall back to local calculation
  const streamCount = useMemo(() => {
    if (volumeCalculation.result?.sweetSpot !== undefined) {
      return volumeCalculation.result.sweetSpot
    }
    return localStreamCount
  }, [volumeCalculation.result, localStreamCount])

  // Trigger API calculation when sellAmount changes
  useEffect(() => {
    if (
      sellAmount > 0 &&
      selectedTokenFrom &&
      selectedTokenTo &&
      !isSwapOperation
    ) {
      volumeCalculation.calculate(sellAmount)
    }
  }, [
    sellAmount,
    selectedTokenFrom?.token_address,
    selectedTokenTo?.token_address,
    isSwapOperation,
  ])

  // Use React Query to handle periodic reserve refreshing
  // useQuery({
  //   queryKey: [
  //     'refreshReserves',
  //     selectedTokenFrom?.token_address,
  //     selectedTokenTo?.token_address,
  //   ],
  //   queryFn: async () => {
  //     console.log('React Query triggering reserve refresh')
  //     if (!isFetchingReserves && !isCalculating) {
  //       await fetchReserves()
  //       // If we have a sell amount, trigger a refresh to recalculate with new reserves
  //       if (sellAmount > 0 && !isSwapOperation) {
  //         console.log(
  //           'Triggering refresh after reserve fetch due to existing sell amount:',
  //           sellAmount
  //         )
  //         handleRefresh()
  //       }
  //     }
  //     return null
  //   },
  //   enabled: !!selectedTokenFrom && !!selectedTokenTo && !isCalculating,
  //   refetchInterval: 60000, // 1 minute
  //   refetchIntervalInBackground: false,
  //   refetchOnWindowFocus: true,
  //   retry: false, // Don't retry since useReserves handles that
  // })

  const handleRefresh = useCallback(() => {
    if (dexCalculator && reserveData) {
      setIsRefresh(true)
    } else {
    }
  }, [dexCalculator, reserveData, sellAmount])

  const { timeRemaining, timerActive } = useRefreshTimer({
    duration: TIMER_DURATION,
    onRefresh: handleRefresh,
    isActive:
      sellAmount > 0 &&
      !!selectedTokenFrom &&
      !!selectedTokenTo &&
      !!reserveData && // Only start timer when we have initial data
      !!dexCalculator && // Make sure we have the calculator
      !isSwapOperation,
    sellAmount,
    isCalculating: isCalculating || isFetchingReserves,
  })

  // Reset isRefresh when calculation completes
  useEffect(() => {
    if (!isCalculating) {
      // console.log('Calculation complete, resetting isRefresh')
      setIsRefresh(false)
    }
  }, [isCalculating])

  // Reset isRefresh when tokens change
  useEffect(() => {
    setIsRefresh(false)
  }, [selectedTokenFrom, selectedTokenTo])

  // Reset isRefresh when sell amount changes (not during refresh)
  useEffect(() => {
    if (!isRefresh) {
      setIsRefresh(false)
    }
  }, [sellAmount])

  // Combine errors from both hooks
  const calculationError = reserveError || swapError

  useEffect(() => {
    setInvalidSellAmount(!isNumberValid(sellAmount))
    setInvalidBuyAmount(!isNumberValid(buyAmount))
  }, [sellAmount, buyAmount])

  // Check for insufficient liquidity (95% threshold)
  useEffect(() => {
    if (sellAmount > 0 && reserveData?.totalReserves?.totalReserveTokenA) {
      const totalReserveTokenA = reserveData.totalReserves.totalReserveTokenA
      const liquidityThreshold = totalReserveTokenA * 0.95
      setIsInsufficientLiquidity(sellAmount >= liquidityThreshold)
    } else {
      setIsInsufficientLiquidity(false)
    }
  }, [sellAmount, reserveData])

  // Reset sell amount when tokens change
  useEffect(() => {
    if (sellAmount > 0) {
      setSellAmount(0)
    }
  }, [selectedTokenFrom, selectedTokenTo])

  // Add an effect to handle pending swap amount
  useEffect(() => {
    if (pendingSwapAmount !== null && !isFetchingReserves) {
      // Only set the sell amount if we're not fetching reserves
      setSellAmount(pendingSwapAmount)
      setPendingSwapAmount(null)
      setIsSwapOperation(false)
    }
  }, [isFetchingReserves, pendingSwapAmount])

  // Reset values when tokens change
  useEffect(() => {
    const currentFrom = selectedTokenFrom?.token_address || null
    const currentTo = selectedTokenTo?.token_address || null
    const lastFrom = lastTokenChangeRef.current.from
    const lastTo = lastTokenChangeRef.current.to

    // Only reset if one token changed but not both (swap changes both)
    if (
      (currentFrom !== lastFrom && currentTo === lastTo) ||
      (currentFrom === lastFrom && currentTo !== lastTo)
    ) {
      setSellAmount(0)
      setInvalidSellAmount(false)
      setInvalidBuyAmount(false)
      // Force recalculation by updating the key
      if (!isSwapOperation) {
        setForceRefreshKey((prev) => prev + 1)
      }
    }

    // Update the ref with current values
    lastTokenChangeRef.current = {
      from: currentFrom,
      to: currentTo,
    }
  }, [selectedTokenFrom, selectedTokenTo, isSwapOperation])

  const handleSwap = (): void => {
    setIsSwapOperation(true)

    // Store current values before swap
    const currentBuyAmount = buyAmount

    // First reset amounts to prevent stale calculations
    setSellAmount(0)
    setForceRefreshKey((prev) => prev + 1) // Force recalculation

    // Swap tokens
    const tempToken = selectedTokenFrom
    setSelectedTokenFrom(selectedTokenTo)
    setSelectedTokenTo(tempToken)

    // Store the amount to set after reserves are fetched
    if (currentBuyAmount > 0) {
      setPendingSwapAmount(currentBuyAmount)
    } else {
      setIsSwapOperation(false)
    }
  }

  const handleSellAmountChange = (val: any) => {
    if (val === sellAmount) return

    if (val === 0 || val === '0' || val === '') {
      setSellAmount(0)
      return
    }

    setSellAmount(val)
  }

  const handleBuyAmountChange = (val: any) => {
    // Buy field is read-only in this implementation
    return
  }

  const controls = useAnimation()

  useEffect(() => {
    controls.start('visible')
  }, [controls])

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0.2,
      },
    },
  }

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

  const handlePlaceTrade = async () => {
    console.log('handlePlaceTrade called', isConnectedWallet)

    if (isConnectedWallet) {
      const signer = getSigner()

      if (signer) {
        // const res = await placeTradeDummy(
        //   {
        //     tokenInObj: selectedTokenFrom,
        //     tokenOutObj: selectedTokenTo,
        //     tokenIn: selectedTokenFrom?.token_address || '',
        //     tokenOut: selectedTokenTo?.token_address || '',
        //     amountIn: sellAmount.toString(),
        //     minAmountOut: buyAmount.toString(),
        //     isInstasettlable: false,
        //     usePriceBased: false,
        //   },
        //   signer,
        //   'error'
        // )

        const res = await placeTrade(
          {
            tokenInObj: selectedTokenFrom,
            tokenOutObj: selectedTokenTo,
            tokenIn: selectedTokenFrom?.token_address || '',
            tokenOut: selectedTokenTo?.token_address || '',
            amountIn: sellAmount.toString(),
            minAmountOut: buyAmount.toString(),
            isInstasettlable: tradingSettings.isInstasettlable,
            usePriceBased: false,
            instasettleBps: tradingSettings.instasettlableValue || '0',
            onlyInstasettle: tradingSettings.onlyInstasettle,
          },
          signer
        )
        if (res.success) {
          setSellAmount(0)
          // Refetch trades to update the global sidebar
          if (refetchTrades) {
            await refetchTrades()
          }
        }
      }
    }
  }

  return (
    <div className="w-full flex flex-col justify-center items-center">
      {pathname === '/' && (
        <div className="flex flex-col items-center justify-center gap-2">
          <motion.h1
            className="text-5xl md:text-6xl font-bold text-white text-center"
            initial="hidden"
            animate={controls}
            variants={titleVariants}
          >
            Stream Your Trades.
          </motion.h1>
          <motion.h2
            className="text-3xl md:text-5xl font-bold mb-10 sm:mb-16 text-white text-center"
            initial="hidden"
            animate={controls}
            variants={titleVariants}
          >
            Save 10's of $1000s. In Minutes
          </motion.h2>
        </div>
      )}
      <motion.div
        className="md:min-w-[500px] max-w-[500px] w-[95vw] p-2"
        initial="hidden"
        animate={controls}
        variants={containerVariants}
      >
        <div className="w-full flex justify-between gap-2 mb-4">
          <HotPairBox />
          <div className="flex items-center gap-2">
            {timerActive && (
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2 bg-white hover:bg-tabsGradient bg-opacity-[12%] px-2 py-1 rounded-full">
                  <div className="text-sm text-white/70">Auto refresh in</div>
                  <div className="relative w-6 h-6">
                    <svg className="w-6 h-6 transform -rotate-90">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-white/10"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray="62.83"
                        strokeDashoffset={
                          62.83 * (1 - timeRemaining / TIMER_DURATION)
                        }
                        className="text-primary transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {timeRemaining}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <TradingSettings
              onSettingsChange={useCallback(
                (settings: {
                  usePriceBased: boolean
                  instasettlableValue: string | null
                  isInstasettlable: boolean
                  onlyInstasettle: boolean
                }) => setTradingSettings(settings),
                []
              )}
            />
          </div>
        </div>

        <div className="w-full mt-4 flex flex-col relative gap-[23px]">
          {swap ? (
            <CoinBuySection
              amount={buyAmount}
              setAmount={handleBuyAmountChange}
              inValidAmount={invalidBuyAmount}
              swap={swap}
              disabled={true}
              isLoading={false}
            />
          ) : (
            <CoinSellSection
              amount={sellAmount}
              setAmount={handleSellAmountChange}
              inValidAmount={invaliSelldAmount}
              disabled={isFetchingReserves}
              isInsufficientBalance={isInsufficientBalance}
              setIsInsufficientBalance={setIsInsufficientBalance}
            />
          )}
          <div
            onClick={
              !selectedTokenFrom ||
              !selectedTokenTo ||
              isFetchingReserves ||
              isCalculating
                ? () => {}
                : handleSwap
            }
            className={`absolute items-center flex border-[2px] border-opacity-[1.5] bg-black justify-center rounded-[6px] right-[calc(50%_-_42px)] top-[calc(50%_-_2rem)] rotate-45 z-50 ${
              !selectedTokenFrom ||
              !selectedTokenTo ||
              isFetchingReserves ||
              isCalculating
                ? 'cursor-not-allowed'
                : 'cursor-pointer'
            }
            ${
              sellAmount > 0 && !invaliSelldAmount && selectedTokenFrom
                ? 'border-[#40f798] border-r-[#1F1F1F] border-b-[#1F1F1F]'
                : 'border-[#1F1F1F]'
            }
            
            `}
          >
            <div className="w-[25.3px] h-[22.8px] absolute bg-black -rotate-45 -z-30 -left-[14px] top-[50.8px]" />
            <div className="w-[26.4px] h-[22.8px] absolute bg-black -rotate-45 -z-30 -right-[11.8px] -top-[13.2px]" />
            <SwapBox
              active={sellAmount > 0 || buyAmount > 0}
              disabled={
                !selectedTokenFrom ||
                !selectedTokenTo ||
                isFetchingReserves ||
                isCalculating
              }
            />
          </div>
          {swap ? (
            <CoinSellSection
              amount={sellAmount}
              setAmount={handleSellAmountChange}
              inValidAmount={invaliSelldAmount}
              swap={swap}
              disabled={isFetchingReserves}
            />
          ) : (
            <CoinBuySection
              amount={buyAmount}
              setAmount={handleBuyAmountChange}
              inValidAmount={invalidBuyAmount}
              swap={swap}
              disabled={true}
              isLoading={isCalculating}
            />
          )}
        </div>

        {/* {calculationError && (
          <div className="mt-2 p-2 bg-red-900/30 text-red-400 rounded-lg text-sm">
            {calculationError}
          </div>
        )} */}

        <div className="w-full mt-[14px] mb-[20px]">
          {isConnected && pathname === '/' ? (
            <Button
              text={
                isConnected && isInsufficientBalance && !isFetchingReserves
                  ? 'Insufficient Balance'
                  : isFetchingReserves
                  ? 'Fetching reserves...'
                  : calculationError
                  ? calculationError
                  : isInsufficientLiquidity
                  ? 'Insufficient Liquidity'
                  : 'STREAM'
              }
              theme="gradient"
              onClick={
                sellAmount > 0 && buyAmount > 0
                  ? () => handlePlaceTrade()
                  : () => {}
                // !(sellAmount > 0 && buyAmount > 0)
                //   ? () => addToast(<NotifiSwapStream />)
                //   : () => {}
              }
              error={
                invaliSelldAmount ||
                invalidBuyAmount ||
                !!calculationError ||
                isInsufficientLiquidity
              }
              disabled={
                !selectedTokenFrom ||
                !selectedTokenTo ||
                !!calculationError ||
                isFetchingReserves ||
                !(sellAmount > 0 && buyAmount > 0) ||
                (isConnected && isInsufficientBalance)
              }
              loading={isFetchingReserves || loading}
            />
          ) : (
            <Button
              text={
                isFetchingReserves
                  ? 'Fetching reserves...'
                  : calculationError
                  ? calculationError
                  : 'Connect Wallet'
              }
              error={
                invaliSelldAmount ||
                invalidBuyAmount ||
                !!calculationError ||
                isInsufficientLiquidity
              }
              onClick={() => {
                if (pathname === '/') {
                  router.push('/swaps')
                } else {
                  // open() // This line was commented out in the original file
                }
              }}
              disabled={isFetchingReserves}
              loading={isFetchingReserves || loading}
            />
          )}
        </div>

        {buyAmount > 0 &&
          sellAmount > 0 &&
          selectedTokenFrom &&
          selectedTokenTo && (
            <DetailSection
              sellAmount={`${swap ? buyAmount : sellAmount}`}
              buyAmount={`${swap ? sellAmount : buyAmount}`}
              inValidAmount={invaliSelldAmount || invalidBuyAmount}
              reserves={reserveData}
              botGasLimit={botGasLimit}
              streamCount={streamCount}
              tokenFromSymbol={selectedTokenFrom?.symbol || ''}
              tokenToSymbol={selectedTokenTo?.symbol || ''}
              tokenToUsdPrice={selectedTokenTo?.usd_price || 0}
              estTime={estTime}
              isCalculating={isCalculating}
              isFetchingReserves={isFetchingReserves}
              slippageSavings={slippageSavings}
              usePriceBased={tradingSettings.usePriceBased}
              priceAccuracyNODECA={
                volumeCalculation.result?.priceAccuracyNODECA
              }
              priceAccuracyDECA={volumeCalculation.result?.priceAccuracyDECA}
            />
          )}

        {/* {pathname === '/' && (
          <div className="flex flex-col items-center justify-center z-20">
            <motion.div
              className="flex flex-col items-center cursor-pointer"
              animate={{
                y: [0, -5, 0],
                color: [
                  'rgba(255,255,255,1)',
                  'rgba(156,163,175,0.7)',
                  'rgba(255,255,255,1)',
                ],
                textShadow: [
                  '0 0 5px rgba(255,255,255,0.5)',
                  '0 0 2px rgba(255,255,255,0.2)',
                  '0 0 5px rgba(255,255,255,0.5)',
                ],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
              }}
              onClick={() => {
                window.scrollTo({
                  top: window.innerHeight,
                  behavior: 'smooth',
                })
              }}
            >
              <p className="text-center mb-1 text-lg font-medium tracking-wide">
                Explore our features
              </p>
              <ChevronDown
                size={28}
                strokeWidth={2}
                className="drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]"
              />
            </motion.div>
          </div>
        )} */}
      </motion.div>
    </div>
  )
}

export default SELSection
