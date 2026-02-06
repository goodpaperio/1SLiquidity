import { ethers, providers } from 'ethers'
import { Contract } from 'ethers'
import { CONTRACT_ADDRESSES } from './config/contracts'
import { UniswapV2RouterABI, UniswapV3QuoterABI } from './config/abis'

interface GasCalculationResult {
  botGasLimit: bigint
  streamCount: number
}

interface Reserves {
  token0: string
  token1: string
}

interface TokenDecimals {
  token0: number
  token1: number
}

interface ReservesResponse {
  reserves: Reserves
  decimals: TokenDecimals
}

// Utility to normalize amount based on decimals
export function normalizeAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0')
  return BigInt(whole + paddedFraction)
}

// Helper function to calculate slippage in basis points
function calculateSlippage(
  volumeIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  const ZERO = BigInt(0)
  const TEN_THOUSAND = BigInt(10000)

  if (volumeIn === ZERO || reserveIn === ZERO || reserveOut === ZERO) {
    return 0
  }

  // k = reserveIn * reserveOut
  const k = reserveIn * reserveOut
  const denominator = reserveIn + volumeIn
  if (denominator === ZERO) {
    return 0
  }

  // volumeOut = reserveOut - (k / (reserveIn + volumeIn))
  const volumeOut = reserveOut - k / denominator

  // priceRatio = (volumeOut * reserveIn * 10000) / (volumeIn * reserveOut)
  // clamp negative slippage (better price) to 0
  const numerator = volumeOut * reserveIn * TEN_THOUSAND
  const denom = volumeIn * reserveOut
  if (denom === ZERO) {
    return 0
  }
  const priceRatio = Number(numerator / denom) // integer division, basis points
  if (priceRatio > 10000) {
    return 0
  }
  return 10000 - priceRatio
}

export function calculateSweetSpot(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  sellAmount: number
): number {
  const ZERO = BigInt(0)

  // Mirror backend StreamDaemon _sweetSpotAlgo v4
  if (reserveA === ZERO || reserveB === ZERO) {
    return 4
  }

  let sweetSpot = 1
  let effectiveVolume = tradeVolume / BigInt(sweetSpot)
  let slippage = calculateSlippage(effectiveVolume, reserveA, reserveB)

  // Minimum sweet spot of 4 if already within 10 bps
  if (slippage <= 10) {
    return 4
  }

  let lastSweetSpot = sweetSpot
  let lastSlippage = slippage

  // Iteratively double sweet spot until slippage <= 10 bps or cap
  while (slippage > 10 && sweetSpot < 1000) {
    lastSweetSpot = sweetSpot
    lastSlippage = slippage

    sweetSpot = sweetSpot * 2
    effectiveVolume = tradeVolume / BigInt(sweetSpot)
    if (effectiveVolume === ZERO) {
      break
    }
    slippage = calculateSlippage(effectiveVolume, reserveA, reserveB)
  }

  // Binary refinement if threshold crossed
  if (lastSlippage > 10 && slippage <= 10) {
    let low = lastSweetSpot
    let high = sweetSpot

    for (let i = 0; i < 5; i++) {
      const mid = Math.floor((low + high) / 2)
      const midVolume = tradeVolume / BigInt(mid)
      if (midVolume === ZERO) {
        break
      }
      const midSlippage = calculateSlippage(midVolume, reserveA, reserveB)
      if (midSlippage <= 10) {
        high = mid
        sweetSpot = mid
      } else {
        low = mid
      }
    }
  }

  // Clamp between 4 and 500
  if (sweetSpot <= 4) {
    sweetSpot = 4
  }
  if (sweetSpot > 500) {
    sweetSpot = 500
  }
  return sweetSpot
}

// Cache for ETH price to avoid too many API calls
let cachedEthPrice: bigint | null = null
let lastEthPriceFetch = 0
const ETH_PRICE_CACHE_MS = 60_000 // 1 minute

async function getEthPrice(): Promise<bigint> {
  const now = Date.now()
  if (cachedEthPrice && now - lastEthPriceFetch < ETH_PRICE_CACHE_MS) {
    return cachedEthPrice
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
    )
    if (!response.ok) {
      throw new Error('Failed to fetch ETH price')
    }
    const data = await response.json()
    const price = BigInt(Math.floor(data.ethereum.usd))
    cachedEthPrice = price
    lastEthPriceFetch = now
    return price
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    // Fallback to a reasonable default if API fails
    return BigInt(2000)
  }
}

async function calculateGasAllowance(
  provider: providers.Provider,
  streamCount: number
): Promise<bigint> {
  // Get current gas price
  const gasPrice = await provider.getFeeData()
  if (!gasPrice.gasPrice) {
    throw new Error('Failed to get gas price')
  }

  // Get current ETH price from CoinGecko
  const ETH_PRICE_USD = await getEthPrice()
  const ONE_DOLLAR_IN_WEI = BigInt(10) ** BigInt(18) / ETH_PRICE_USD // Convert $1 to wei
  const gasPriceBigInt = BigInt(gasPrice.gasPrice.toString())
  const nominalGas = ONE_DOLLAR_IN_WEI / gasPriceBigInt

  // Calculate total gas cost for all streams
  const totalGasCost = gasPriceBigInt * nominalGas * BigInt(streamCount)

  return totalGasCost
}

// Utility to fetch and cache average block time
let cachedBlockTime: number | null = null
let lastBlockTimeFetch = 0
const BLOCK_TIME_CACHE_MS = 60_000 // 1 minute

export async function getAverageBlockTime(
  provider: any,
  numBlocks: number = 20
): Promise<number> {
  try {
    // console.log('Getting average block time with provider:', provider)
    const now = Date.now()
    if (cachedBlockTime && now - lastBlockTimeFetch < BLOCK_TIME_CACHE_MS) {
      console.log('Using cached block time:', cachedBlockTime)
      return cachedBlockTime
    }

    // console.log('Fetching latest block number...')
    const latestBlock = await provider.getBlockNumber()
    // console.log('Latest block:', latestBlock)

    // console.log('Fetching latest block details...')
    const latest = await provider.getBlock(latestBlock)
    // console.log('Latest block details:', latest)

    // console.log('Fetching earlier block details...')
    const first = await provider.getBlock(latestBlock - numBlocks)
    // console.log('Earlier block details:', first)

    if (!latest || !first) {
      console.log('Missing block details, using fallback time of 12s')
      return 12 // fallback to 12s
    }

    const avg = (latest.timestamp - first.timestamp) / numBlocks
    // console.log('Calculated average block time:', avg)

    cachedBlockTime = avg
    lastBlockTimeFetch = now
    return avg
  } catch (error) {
    console.error('Error in getAverageBlockTime:', error)
    return 12 // fallback to 12s on error
  }
}

export async function calculateGasAndStreams(
  provider: providers.Provider,
  tradeVolume: string,
  reserves: ReservesResponse,
  sellAmount: number
): Promise<GasCalculationResult> {
  try {
    const reserve0 = BigInt(reserves.reserves.token0)
    const reserve1 = BigInt(reserves.reserves.token1)

    // Convert trade volume to BigInt using token decimals
    const tradeVolumeBN = normalizeAmount(tradeVolume, reserves.decimals.token0)

    // Calculate sweet spot
    const sweetSpot = calculateSweetSpot(
      tradeVolumeBN,
      reserve0,
      reserve1,
      reserves.decimals.token0,
      reserves.decimals.token1,
      sellAmount
    )
    console.log('sweetSpot ===>', sweetSpot)

    // Calculate gas allowance
    const gasAllowance = await calculateGasAllowance(provider, sweetSpot)

    return {
      botGasLimit: gasAllowance,
      streamCount: sweetSpot,
    }
  } catch (error) {
    console.error('Error in calculateGasAndStreams:', error)
    throw error
  }
}

export async function calculateSlippageSavings(
  provider: providers.Provider,
  tradeVolume: bigint,
  dex: string,
  feeTier: number,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  tokenIn: string,
  tokenOut: string,
  sweetSpot: number
): Promise<{ savings: number; percentageSavings: number }> {
  try {
    if (dex === 'uniswap-v2' || dex === 'sushiswap') {
      // Calculate getAmountsOut from UniswapV2Router
      const routerAddress =
        dex === 'uniswap-v2'
          ? CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER
          : CONTRACT_ADDRESSES.SUSHISWAP.ROUTER

      const router = new Contract(routerAddress, UniswapV2RouterABI, provider)

      // Get quote for full amount
      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      )
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      )
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB

      // Scale up the sweet spot quote
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

      const savings = scaledSweetSpotAmountOutInETH - amountOutInETH
      // const percentageSavings = (savings / amountOutInETH) * 100
      const raw = savings / amountOutInETH
      let percentageSavings = (1 - raw) * 100
      // Clamp between 0–100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      // Format to 3 decimals
      percentageSavings = Number(percentageSavings.toFixed(3))

      return { savings, percentageSavings }
    }

    if (dex.startsWith('uniswap-v3')) {
      // Calculate getAmountsOut from UniswapV3Quoter
      const quoter = new Contract(
        CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        UniswapV3QuoterABI,
        provider
      )

      // Get quote for full amount
      const data = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume, 0]
      )

      const result = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data,
      })

      const dexQuoteAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        result
      )[0]

      const dexQuoteAmountOutInETH = Number(dexQuoteAmountOut) / 10 ** decimalsB

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotQuote = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume / BigInt(sweetSpot), 0]
      )

      const sweetSpotQuoteResult = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data: sweetSpotQuote,
      })

      const sweetSpotQuoteAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        sweetSpotQuoteResult
      )[0]

      const sweetSpotQuoteAmountOutInETH =
        Number(sweetSpotQuoteAmountOut) / 10 ** decimalsB
      const scaledSweetSpotQuoteAmountOutInETH =
        sweetSpotQuoteAmountOutInETH * sweetSpot

      const savings =
        scaledSweetSpotQuoteAmountOutInETH - dexQuoteAmountOutInETH
      // const percentageSavings = (savings / dexQuoteAmountOutInETH) * 100

      const raw = savings / dexQuoteAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      // Clamp between 0–100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      // Format to 3 decimals
      percentageSavings = Number(percentageSavings.toFixed(3))

      return { savings, percentageSavings }
    }

    return { savings: 0, percentageSavings: 0 }
  } catch (error) {
    console.error('Error calculating slippage savings:', error)
    return { savings: 0, percentageSavings: 0 }
  }
}
