'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import PairCard from './PairCard'
import LoadingPairCard from './LoadingPairCard'
import { useEnhancedTopTokens } from '@/app/lib/hooks/hotpairs/useEnhancedTokens'
import { useEffect, useState } from 'react'
import { formatNumberAdvanced } from '@/lib/utils'

export default function TopPairsCarousel({
  activeHotPair,
  setActiveHotPair,
}: {
  activeHotPair: any
  setActiveHotPair: any
}) {
  // State for sorted pairs with slippageSavingsUsd
  const [sortedPairs, setSortedPairs] = useState<any[]>([])

  // Fetch top tokens using React Query
  const {
    data: topTokensData,
    isLoading: isLoading,
    isError: isErrorTopTokens,
    error: topTokensError,
    refetch: refetchTopTokens,
  } = useEnhancedTopTokens({
    limit: 1000,
    metric: 'slippageSavings', // You can change this based on your needs
    enabled: true,
  })

  // const sortedPairs = topTokensData?.data.sort((a: any, b: any) => {
  //   const valueA = a.slippageSavings * (a.tokenBUsdPrice || 1)
  //   const valueB = b.slippageSavings * (b.tokenBUsdPrice || 1)
  //   return valueB - valueA // Descending order (b - a)
  // })

  // Update sorted pairs when data changes
  useEffect(() => {
    if (topTokensData?.data) {
      const pairsWithUsdValue = topTokensData.data.map((pair: any) => ({
        ...pair,
        slippageSavingsUsd: pair.slippageSavings * (pair.tokenBUsdPrice || 1),
      }))

      const sorted = pairsWithUsdValue.sort((a: any, b: any) => {
        return b.slippageSavingsUsd - a.slippageSavingsUsd // Descending order
      })

      setSortedPairs(sorted)
    }
  }, [topTokensData])

  // Auto-select first pair when data loads
  useEffect(() => {
    if (sortedPairs.length > 0 && !activeHotPair) {
      handleSetActiveHotPair(sortedPairs[0])
    }
  }, [sortedPairs, activeHotPair])

  // Enhanced setActiveHotPair that includes slippageSavingsUsd
  const handleSetActiveHotPair = (pair: any) => {
    const enhancedPair = {
      ...pair,
      slippageSavingsUsd: formatNumberAdvanced(
        pair.slippageSavingsUsd ||
          pair.slippageSavings * (pair.tokenBUsdPrice || 1)
      ),
    }
    setActiveHotPair(enhancedPair)
  }

  return (
    <div className="dark bg-gray-950 my-20">
      <div
        className="mx-auto max-w-6xl rounded-lg border border-[#003E49] p-8"
        style={{
          background:
            'linear-gradient(90deg, rgba(0, 10, 16, 0.7) 0%, rgba(0, 22, 28, 0.49) 100%)',
        }}
      >
        <h1 className="text-3xl font-bold text-white mb-8">Top Savers</h1>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {isLoading
              ? Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <CarouselItem
                      key={index}
                      className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                    >
                      <LoadingPairCard />
                    </CarouselItem>
                  ))
              : sortedPairs?.map((pair: any, index: number) => {
                  return (
                    <CarouselItem
                      key={index}
                      className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                    >
                      <div className="cursor-pointer">
                        <PairCard
                          pair={pair}
                          onClick={setActiveHotPair}
                          isActive={
                            activeHotPair?.tokenAAddress ===
                              pair.tokenAAddress &&
                            activeHotPair?.tokenBAddress === pair.tokenBAddress
                          }
                        />
                      </div>
                    </CarouselItem>
                  )
                })}
          </CarouselContent>
          <CarouselPrevious className="-left-12 bg-[#0c3526] border-neutral-900 text-white hover:bg-[#40FAAC] hover:text-black z-[55555]" />
          <CarouselNext className="-right-12 bg-[#114532] border-neutral-900 text-white hover:bg-[#40FAAC] hover:text-black z-[55555]" />
        </Carousel>
      </div>
    </div>
  )
}
