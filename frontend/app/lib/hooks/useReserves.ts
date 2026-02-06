import { useState, useCallback, useEffect } from 'react'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { Token } from '@/app/types'
import { usePrefetchReserves } from './usePrefetchReserves'
import { useDynamicReserveCache } from './useDynamicReserveCache'

interface UseReservesProps {
  selectedTokenFrom: Token | null
  selectedTokenTo: Token | null
  chainId: string
}

export const useReserves = ({
  selectedTokenFrom,
  selectedTokenTo,
  chainId,
}: UseReservesProps) => {
  const [reserveData, setReserveData] = useState<ReserveData | null>(null)
  const [dexCalculator, setDexCalculator] = useState<DexCalculator | null>(null)
  const [isFetchingReserves, setIsFetchingReserves] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [shouldFetchFromBackend, setShouldFetchFromBackend] = useState(true)

  // Get prefetched reserves and dynamic cache
  const { prefetchedReserves, getPairKey: getPrefetchedPairKey } =
    usePrefetchReserves({ chainId })
  const { dynamicReserves, updateCache, getCachedReserves } =
    useDynamicReserveCache({ chainId })

  // Clear state when tokens change
  const clearState = useCallback(() => {
    setReserveData(null)
    setDexCalculator(null)
    setCalculationError(null)
  }, [])

  // Check if a token pair is in our prefetched list
  const checkPrefetchedPair = useCallback(
    (fromSymbol: string | undefined, toSymbol: string | undefined) => {
      if (!fromSymbol || !toSymbol) return null

      // Only check the exact pair key, no reverse lookup
      const directKey = getPrefetchedPairKey(fromSymbol, toSymbol)
      const directPair = prefetchedReserves[directKey]

      // Only return cached data if there's no error and it matches our exact order
      if (directPair?.error === null && directPair?.reserveData) {
        return directPair
      }

      return null
    },
    [prefetchedReserves, getPrefetchedPairKey]
  )

  // Effect to check both prefetched data and dynamic cache when tokens change
  useEffect(() => {
    if (!selectedTokenFrom || !selectedTokenTo) {
      setShouldFetchFromBackend(true)
      return
    }

    const fromSymbol = selectedTokenFrom.symbol
    const toSymbol = selectedTokenTo.symbol

    // First try prefetched cache - only exact matches
    const prefetchedPair = checkPrefetchedPair(fromSymbol, toSymbol)

    if (prefetchedPair?.reserveData && prefetchedPair?.dexCalculator) {
      setReserveData(prefetchedPair.reserveData)
      setDexCalculator(prefetchedPair.dexCalculator)
      setShouldFetchFromBackend(false)
      return
    }

    // Then check dynamic cache
    const dynamicCacheData = getCachedReserves(
      selectedTokenFrom,
      selectedTokenTo
    )

    if (dynamicCacheData?.reserveData && dynamicCacheData?.dexCalculator) {
      setReserveData(dynamicCacheData.reserveData)
      setDexCalculator(dynamicCacheData.dexCalculator)
      setShouldFetchFromBackend(false)
      return
    }

    setShouldFetchFromBackend(true)
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    checkPrefetchedPair,
    getCachedReserves,
  ])

  const fetchReserves = useCallback(async () => {
    if (!selectedTokenFrom || !selectedTokenTo) {
      clearState()
      setIsFetchingReserves(false)
      return
    }

    // Skip backend fetch if we're using cached data
    if (!shouldFetchFromBackend) {
      setIsFetchingReserves(false)
      return
    }

    setIsFetchingReserves(true)

    try {
      // Update dynamic cache and use the result
      const result = await updateCache(selectedTokenFrom, selectedTokenTo)

      if (result?.reserveData && result?.dexCalculator) {
        setReserveData(result.reserveData)
        setDexCalculator(result.dexCalculator)
        setCalculationError(null)
      } else if (result?.error) {
        console.error('Error from dynamic cache:', result.error)
        setCalculationError(result.error)
        setReserveData(null)
        setDexCalculator(null)
      }
    } catch (error: any) {
      console.error('Error fetching reserves:', error)
      setCalculationError('Error fetching liquidity data')
      setReserveData(null)
      setDexCalculator(null)
    } finally {
      setIsFetchingReserves(false)
    }
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    shouldFetchFromBackend,
    updateCache,
    clearState,
  ])

  // Fetch reserves when tokens change or when shouldFetchFromBackend changes
  useEffect(() => {
    if (selectedTokenFrom && selectedTokenTo) {
      fetchReserves()
    } else {
      clearState()
    }

    return () => {
      // Cleanup effect
      clearState()
    }
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    chainId,
    fetchReserves,
    clearState,
    shouldFetchFromBackend,
  ])

  return {
    reserveData,
    dexCalculator,
    isFetchingReserves,
    calculationError,
    fetchReserves,
    setCalculationError,
  }
}
