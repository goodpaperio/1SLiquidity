'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import SettingsIcon from '@/app/shared/icons/Settings'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'
import { cn } from '@/lib/utils'
import HotPairButton from './button'
import { FireIcon } from './fire-icon'
import { InfoIcon } from '@/app/lib/icons'
import CryptoCard2 from './CryptoCard2'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { useModal } from '@/app/lib/context/modalContext'
import { useRouter } from 'next/navigation'
import { useEnhancedTopTokens } from '@/app/lib/hooks/hotpairs/useEnhancedTokens'
import LoadingPairCard from '@/app/components/hotpairs/LoadingPairCard'
import CryptoCardSkeleton from './CryptoCardSkeleton'

const hotPairs = [
  {
    // icon1: '/tokens/leo.png',
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/weth.webp',
    // pair: 'LEO / USDT',
    pair: 'USDT / WETH',
    price: 1000,
    vol: 1000,
    win: 10,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: true,
  },
  {
    // icon1: '/tokens/aave.webp',
    // icon2: '/tokens/eth.svg',
    // pair: 'AAVE / ETH',
    icon1: '/tokens/usdc.svg',
    icon2: '/tokens/weth.webp',
    pair: 'USDC / WETH',
    price: 2000,
    vol: 1000,
    win: 20,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    // icon1: '/tokens/etc.png',
    // icon2: '/tokens/usdt.webp',
    // pair: 'ETC / USDT',
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/usdc.svg',
    pair: 'USDT / USDC',
    price: 3000,
    vol: 1000,
    win: 15,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
]

export default function HotPairBox() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const { isMobile, isXl, isDesktop, isTablet } = useScreenSize()
  const { tokens } = useTokenList()
  const {
    selectedTokenFrom,
    selectedTokenTo,
    setSelectedTokenFrom,
    setSelectedTokenTo,
  } = useModal()

  const [hotPairsState, setHotPairsState] = useState([])

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

  const {
    data: topTokensData,
    isLoading: isLoading,
    isError: isErrorTopTokens,
    error: topTokensError,
    refetch: refetchTopTokens,
  } = useEnhancedTopTokens({
    limit: 1000,
    metric: 'slippageSavings',
    enabled: true,
  })

  const sortedPairs = topTokensData?.data.sort((a: any, b: any) => {
    const valueA = a.slippageSavings * (a.tokenBUsdPrice || 1)
    const valueB = b.slippageSavings * (b.tokenBUsdPrice || 1)
    return valueB - valueA // Descending order (b - a)
  })

  useEffect(() => {
    return () => {
      // Reset token states when component unmounts
      setSelectedTokenFrom(null)
      setSelectedTokenTo(null)
    }
  }, [setSelectedTokenFrom, setSelectedTokenTo])

  useEffect(() => {
    if (
      !selectedTokenFrom &&
      !selectedTokenTo &&
      tokens.length > 0 &&
      topTokensData
    ) {
      const sortedPairs = topTokensData?.data.sort((a: any, b: any) => {
        const valueA = a.slippageSavings * (a.tokenBUsdPrice || 1)
        const valueB = b.slippageSavings * (b.tokenBUsdPrice || 1)
        return valueB - valueA // Descending order (b - a)
      })

      const tokenA = tokens.find(
        (token) =>
          token.symbol.toLowerCase() ===
          sortedPairs?.[0]?.tokenASymbol?.toLowerCase()
      )
      const tokenB = tokens.find(
        (token) =>
          token.symbol.toLowerCase() ===
          sortedPairs?.[0]?.tokenBSymbol?.toLowerCase()
      )

      if (tokenA && tokenB) {
        setSelectedTokenFrom(tokenA)
        setSelectedTokenTo(tokenB)
      }
    }
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    tokens,
    setSelectedTokenFrom,
    setSelectedTokenTo,
    topTokensData,
  ])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(isXl)
    }, 400)

    return () => clearTimeout(timer)
  }, [isXl])

  // Close dropdown when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (
  //       dropdownRef.current &&
  //       buttonRef.current &&
  //       !dropdownRef.current.contains(event.target as Node) &&
  //       !buttonRef.current.contains(event.target as Node)
  //     ) {
  //       setIsOpen(false)
  //     }
  //   }

  //   document.addEventListener('mousedown', handleClickOutside)
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside)
  //   }
  // }, [])

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  const handleSelectPair = (pair: any, index: number) => {
    const fromToken = tokens.find(
      (t) => t.symbol?.toLowerCase() === pair.tokenASymbol.toLowerCase()
    )
    const toToken = tokens.find(
      (t) => t.symbol?.toLowerCase() === pair.tokenBSymbol.toLowerCase()
    )

    if (fromToken && toToken) {
      setSelectedTokenFrom(fromToken)
      setSelectedTokenTo(toToken)

      setIsOpen(false)
    }
  }

  return (
    <div className="relative inline-block z-[5555555]">
      <HotPairButton
        ref={buttonRef}
        onClick={toggleDropdown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        isOpen={isOpen}
        isHovered={isHovered}
        className="group cursor-pointer"
      />

      {/* Dropdown Menu - Absolutely Positioned */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
              'absolute z-50 overflow-hidden',
              isXl
                ? 'origin-right right-full top-0 mr-6'
                : 'origin-top left-0 top-full mt-2'
            )}
          >
            <Card className="w-[350px] bg-zinc-900 border-zinc-800 text-white rounded-xl border-2">
              <CardContent className="p-4 space-y-5">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <FireIcon
                        className="transition-all duration-300 w-5 h-5"
                        isActive={isHovered || isOpen}
                      />
                      <h2 className="text-xl font-medium text-center flex-1">
                        HOT PAIRS
                      </h2>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-5 w-5 cursor-help block" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                          <p>Hot pair info</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center text-gray-400 group-hover:text-white hover:bg-[#827a7a33] group cursor-pointer group p-[0.15rem] rounded-md transition-all duration-300"
                  >
                    <X className="h-4 w-4 text-[#3F4542] group-hover:text-white transition-all duration-300" />
                  </div>
                  {/*  */}
                  {/* <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="h-5 w-5 cursor-help block" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                        <p>Hot pair info</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider> */}
                </div>

                <div className="flex flex-col gap-4">
                  {isLoading
                    ? Array(3)
                        .fill(0)
                        .map((_, index) => (
                          <div key={index} className="">
                            <CryptoCardSkeleton />
                          </div>
                        ))
                    : sortedPairs
                        ?.slice(0, 3)
                        .map((pair: any, index: number) => (
                          <div
                            key={index}
                            onClick={() => handleSelectPair(pair, index)}
                            className="cursor-pointer"
                          >
                            <CryptoCard2
                              pair={pair}
                              isActive={
                                selectedTokenFrom?.symbol?.toLowerCase() ===
                                  pair.tokenASymbol?.toLowerCase() &&
                                selectedTokenTo?.symbol?.toLowerCase() ===
                                  pair.tokenBSymbol?.toLowerCase()
                              }
                            />
                          </div>
                        ))}
                </div>
                <div className="flex w-full justify-center items-center group">
                  <div
                    className="flex items-center justify-center gap-2 cursor-pointer text-zinc-400 group-hover:text-white hover:text-white"
                    onClick={() => router.push('/hotpairs')}
                  >
                    <span>View all pairs</span>
                    <ArrowRight className="h-4 w-4 " />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
