import Image from 'next/image'
import React, { useMemo, useCallback } from 'react'
import { ReserveData } from '@/app/lib/dex/calculators'
import { formatNumberSmart } from '@/app/lib/utils/number'

interface DexData {
  name: string
  price: string
  reserves: string
  isBest?: boolean
}

interface DexSummaryProps {
  reserves?: ReserveData | null
  tokenFromSymbol?: string
  tokenToSymbol?: string
  usePriceBased?: boolean
}

const DexSummary: React.FC<DexSummaryProps> = ({
  reserves,
  tokenFromSymbol,
  tokenToSymbol,
  usePriceBased = true,
}) => {
  const dexLogoConfig = useMemo(
    () => ({
      curve: '/assets/curve.png',
      uniswap: '/assets/uniswap.png',
      sushiswap: '/assets/sushiswap.png',
      balancer: '/assets/balancer-dex.png',
    }),
    []
  )

  // Memoize getDexLogo function
  const getDexLogo = useCallback(
    (dexName: string): string => {
      const lowercaseName = dexName.toLowerCase()

      // Check for partial matches in the dex name
      if (lowercaseName.includes('curve')) return dexLogoConfig.curve
      if (lowercaseName.includes('uniswap')) return dexLogoConfig.uniswap
      if (lowercaseName.includes('sushiswap')) return dexLogoConfig.sushiswap
      if (lowercaseName.includes('balancer')) return dexLogoConfig.balancer

      // Fallback to exact match or default
      return (
        dexLogoConfig[lowercaseName as keyof typeof dexLogoConfig] ||
        '/icons/default-token.svg'
      )
    },
    [dexLogoConfig]
  )

  // Process dex names - remove addresses but keep versions if version <= 6 chars
  const getCleanDexName = useCallback((dexIdentifier: string): string => {
    // Remove any 0x... address parts
    let cleanIdentifier = dexIdentifier.replace(/0x[a-fA-F0-9]{40}/g, '').trim()

    const parts = cleanIdentifier.toLowerCase().split('-')
    if (parts.length > 1) {
      const baseName = parts[0]
      const version = parts[1]

      // Format versions (e.g., "uniswap-v3" -> "Uniswap V3")
      let formattedBase = ''
      if (baseName.includes('curve')) formattedBase = 'Curve'
      else if (baseName.includes('uniswap')) formattedBase = 'Uniswap'
      else if (baseName.includes('sushiswap')) formattedBase = 'SushiSwap'
      else if (baseName.includes('balancer')) formattedBase = 'Balancer'
      else formattedBase = baseName.charAt(0).toUpperCase() + baseName.slice(1)

      return `${formattedBase} ${version.toUpperCase()}`
    }

    const lowerDex = cleanIdentifier.toLowerCase()
    if (lowerDex.includes('curve')) return 'Curve'
    if (lowerDex.includes('uniswap')) return 'Uniswap'
    if (lowerDex.includes('sushiswap')) return 'SushiSwap'
    if (lowerDex.includes('balancer')) return 'Balancer'

    return cleanIdentifier.charAt(0).toUpperCase() + cleanIdentifier.slice(1)
  }, [])

  const formatReserves = useCallback(
    (
      reserves: { token0: string; token1: string },
      decimals: { token0: number; token1: number }
    ): string => {
      const token0Amount =
        parseFloat(reserves.token0) / Math.pow(10, decimals.token0)
      const token1Amount =
        parseFloat(reserves.token1) / Math.pow(10, decimals.token1)

      const formatNumber = (num: number): string => {
        if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
        return num.toFixed(2)
      }

      const token0Symbol = tokenFromSymbol || 'Token0'
      const token1Symbol = tokenToSymbol || 'Token1'

      return `${formatNumber(token0Amount)}\u00A0${token0Symbol}/${formatNumber(
        token1Amount
      )}\u00A0${token1Symbol}`
    },
    [tokenFromSymbol, tokenToSymbol]
  )

  const hasValidReserves = useCallback(
    (reserves: { token0: string; token1: string }): boolean => {
      const token0Amount = parseFloat(reserves.token0)
      const token1Amount = parseFloat(reserves.token1)
      return token0Amount > 0 && token1Amount > 0
    },
    []
  )

  const dexData = useMemo((): DexData[] => {
    // Return empty array if no reserves data is available
    if (!reserves || !tokenFromSymbol || !tokenToSymbol) {
      return []
    }

    const dexDataArray: Array<{
      name: string
      price: string
      reserves: string
      priceValue: number
      isBest: boolean
      isMainDex: boolean
    }> = []

    if (hasValidReserves(reserves.reserves)) {
      const mainDexPrice = reserves?.price || 0
      dexDataArray.push({
        name: getCleanDexName(reserves.dex),
        price:
          mainDexPrice > 0 ? `$${formatNumberSmart(mainDexPrice)}` : '$0.00',
        reserves: formatReserves(reserves.reserves, reserves.decimals),
        priceValue: mainDexPrice,
        isBest: true, // Main dex is always the best
        isMainDex: true,
      })
    }

    const otherDexGroups: Record<
      string,
      {
        dex: string
        price: number
        reserves: { token0: string; token1: string }
        decimals: { token0: number; token1: number }
        bestPrice: number
      }
    > = {}

    if (reserves.otherDexes) {
      reserves.otherDexes.forEach((dex) => {
        // Skip dexes with zero reserves or zero price
        if (!hasValidReserves(dex.reserves) || dex.price === 0) {
          return
        }

        const cleanName = getCleanDexName(dex.dex)
        const currentPrice = dex.price || 0

        if (cleanName === getCleanDexName(reserves.dex)) {
          return
        }

        if (
          !otherDexGroups[cleanName] ||
          currentPrice < otherDexGroups[cleanName].bestPrice
        ) {
          otherDexGroups[cleanName] = {
            ...dex,
            bestPrice: currentPrice,
          }
        }
      })
    }

    Object.entries(otherDexGroups).forEach(([name, data]) => {
      dexDataArray.push({
        name,
        price: `$${formatNumberSmart(data.bestPrice)}`,
        reserves: formatReserves(data.reserves, data.decimals),
        priceValue: data.bestPrice,
        isBest: false,
        isMainDex: false,
      })
    })

    // Sort by price (highest first), but keep main dex at top
    dexDataArray.sort((a, b) => {
      if (a.isMainDex) return -1
      if (b.isMainDex) return 1
      return a.priceValue - b.priceValue
    })

    return dexDataArray.map(({ priceValue, isMainDex, ...rest }) => rest)
  }, [
    reserves,
    tokenFromSymbol,
    tokenToSymbol,
    hasValidReserves,
    getCleanDexName,
    formatReserves,
  ])

  // Hide component if no DEX data is available
  if (dexData.length === 0) {
    return null
  }

  return (
    <div className="w-full flex flex-col gap-4 py-4">
      <div className="grid grid-cols-[3fr_1.8fr] sm:grid-cols-[2fr_2.5fr] gap-0.5 sm:gap-2 text-[14px] font-medium">
        <div className="text-white72">DEX Sources</div>
        {/* Price column commented out - only showing reserves now */}
        {/* <div
          className={`text-center ${
            usePriceBased
              ? 'bg-gradient-to-r from-[#00ff85] to-[#00ccff] bg-clip-text text-transparent'
              : 'text-white72'
          }`}
        >
          Price
        </div> */}
        <div
          className={`text-right ${
            !usePriceBased
              ? 'bg-gradient-to-r from-[#00ff85] to-[#00ccff] bg-clip-text text-transparent'
              : 'text-white72'
          }`}
        >
          Reserves
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {dexData.map((dex, index) => (
          <div
            key={index}
            className="grid grid-cols-[3fr_1.8fr] sm:grid-cols-[2fr_2.5fr] gap-0.5 sm:gap-2 items-center"
          >
            <div className="flex items-center gap-1.5">
              {dex.isBest && (
                <span className="text-[#40f798] text-[14px]">Best:</span>
              )}
              <div className="relative">
                <Image
                  src={getDexLogo(dex.name)}
                  alt={dex.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              </div>
              <span
                className={`text-[14px] ${
                  dex.isBest ? 'text-[#40f798]' : 'text-white'
                }`}
              >
                {dex.name}
              </span>
            </div>

            {/* Price display commented out - only showing reserves now */}
            {/* <div
              className={`text-center text-[14px] ${
                dex.isBest ? 'text-[#40f798]' : 'text-white'
              }`}
            >
              {dex.price}
            </div> */}

            <div
              className={`text-right text-[14px] leading-tight ${
                dex.isBest ? 'text-[#40f798]' : 'text-white'
              }`}
            >
              <div className="sm:hidden">
                {/* Mobile: Split reserves into two lines */}
                <div>{dex.reserves.split('/')[0]}</div>
                <div>{dex.reserves.split('/')[1]}</div>
              </div>
              <div className="hidden sm:block">
                {/* Desktop: Show on one line */}
                {dex.reserves}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DexSummary
