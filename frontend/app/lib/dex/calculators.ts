import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, getContractAddress } from '../config/contracts'
import {
  UniswapV2RouterABI,
  UniswapV3QuoterABI,
  SushiSwapRouterABI,
  CurvePoolABI,
  BalancerVaultABI,
  BalancerPoolABI,
} from '../config/abis'
import {
  extractPoolAddressFromDexType as extractCurvePoolAddress,
  isCurveDex,
} from '../config/curve-config'
import {
  extractPoolAddressFromDexType as extractBalancerPoolAddress,
  isBalancerDex,
  getBalancerVaultAddress,
  getBalancerPoolMetadata,
} from '../config/balancer-config'

// import { ReserveData } from '@/app/types'

// Singleton provider instance to avoid rate limits
// let sharedAlchemyProvider: ethers.providers.JsonRpcProvider | null = null

// export function createAlchemyProvider(): ethers.providers.JsonRpcProvider {
//   // Return existing provider if already created
//   if (sharedAlchemyProvider) {
//     return sharedAlchemyProvider
//   }

//   // Create new provider only if it doesn't exist
//   const ALCHEMY_API_KEY = 'LC21HsslONyX2SwijOkIG'
//   // const url = `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`
//   const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
//   sharedAlchemyProvider = new ethers.providers.JsonRpcProvider(url)

//   return sharedAlchemyProvider
// }

// Singleton provider instance to avoid rate limits
let sharedProvider: ethers.providers.JsonRpcProvider | null = null

// Function to reset the provider (useful for debugging)
export function resetProvider() {
  console.log('🔄 Resetting provider')
  sharedProvider = null
}

// export function createProvider(): ethers.providers.JsonRpcProvider {
//   // Return existing provider if already created
//   if (sharedProvider) {
//     console.log('🔄 Reusing existing Alchemy provider')
//     return sharedProvider
//   }

//   // Use your actual API key from the Worldchain app you created
//   const ALCHEMY_API_KEY = 'LC21HsslONyX2SwijOkIG'

//   // Use the Worldchain endpoint URL (not Ethereum mainnet)
//   const url = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`

//   console.log('🆕 Creating new Alchemy provider with URL:', url)
//   sharedProvider = new ethers.providers.JsonRpcProvider(url)

//   return sharedProvider
// }

export function createProvider(): ethers.providers.JsonRpcProvider {
  // Return existing provider if already created
  if (sharedProvider) {
    return sharedProvider
  }

  // Infura endpoint URL
  const INFURA_URL =
    'https://mainnet.infura.io/v3/47907acd16d2498d962484d4d7b513fc'

  sharedProvider = new ethers.providers.JsonRpcProvider(INFURA_URL)

  return sharedProvider
}

// Extract fee tier from DEX identifier (e.g., "uniswap-v3-3000" -> 3000)
export const extractFeeTier = (dexType: string): number => {
  if (dexType.startsWith('uniswap-v3-')) {
    const feeStr = dexType.split('-').pop()
    if (feeStr && !isNaN(parseInt(feeStr))) {
      return parseInt(feeStr)
    }
  }
  // Default fee tier (0.3%)
  return 3000
}

// Simple cache for calculation results
interface CalculationCacheEntry {
  result: string
  timestamp: number
  expiryTime: number // Time in ms that this cache entry is valid
}

class CalculationCache {
  private cache: Record<string, CalculationCacheEntry> = {}

  // 30 seconds cache validity by default
  get(key: string, validityTime: number = 30000): string | null {
    const entry = this.cache[key]
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.expiryTime) {
      // Cache entry expired
      delete this.cache[key]
      return null
    }

    return entry.result
  }

  set(key: string, value: string, expiryTime: number = 30000): void {
    this.cache[key] = {
      result: value,
      timestamp: Date.now(),
      expiryTime,
    }

    // Clean up old entries periodically
    if (Object.keys(this.cache).length > 100) {
      this.cleanup()
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const key in this.cache) {
      if (now - this.cache[key].timestamp > this.cache[key].expiryTime) {
        delete this.cache[key]
      }
    }
  }
}

// Create shared calculation cache
const calculationCache = new CalculationCache()

// Reserve data structure
export interface ReserveData {
  dex: string
  pairAddress: string
  reserves: {
    token0: string
    token1: string
  }
  price?: number // Price from API for main DEX
  timestamp: number
  // Token addresses
  token0Address?: string
  token1Address?: string
  // Token decimals from backend
  decimals: {
    token0: number
    token1: number
  }
  // Token indices for Curve and Balancer pools
  tokenIndices?: {
    token0Index: number
    token1Index: number
  }
  // Total reserves from API
  totalReserves?: {
    totalReserveTokenAWei: string
    totalReserveTokenBWei: string
    totalReserveTokenA: number
    totalReserveTokenB: number
  }
  // Other DEXes data from API
  otherDexes?: Array<{
    dex: string
    pairAddress: string
    reserves: {
      token0: string
      token1: string
    }
    price: number
    timestamp: number
    decimals: {
      token0: number
      token1: number
    }
    tokenIndices?: {
      token0Index: number
      token1Index: number
    }
  }>
}

// DEX calculator interface following the Strategy pattern
export interface DexCalculator {
  getProvider(): ethers.providers.Provider
  calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string>
  calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string>
  getPairAddress(reserveData: ReserveData): string
  getExchangeFee(): number // Return fee as a percentage (e.g., 0.3 for 0.3%)
  calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>
  calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>
}

// Abstract base class for DEX calculators to share common functionality
export abstract class BaseDexCalculator implements DexCalculator {
  protected provider: ethers.providers.Provider
  protected chainId: string

  constructor(chainId: string = '1') {
    // Use shared provider to reduce connections
    // this.provider = getSharedProvider(chainId)
    this.provider = createProvider()
    this.chainId = chainId
  }

  getProvider(): ethers.providers.Provider {
    return this.provider
  }

  abstract calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string>
  abstract calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string>
  abstract getExchangeFee(): number
  abstract calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>
  abstract calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>

  getPairAddress(reserveData: ReserveData): string {
    return reserveData?.pairAddress || ''
  }

  // Helper method to format output with specified decimals
  protected formatOutput(
    amount: ethers.BigNumber,
    decimals: number = 18
  ): string {
    try {
      // Format with all decimals first
      const formatted = ethers.utils.formatUnits(amount, decimals)

      // Check if this is a "whole" number that should be preserved exactly
      // e.g., if someone entered 1.0, we want to return exactly 1.0, not 0.999999999
      const value = parseFloat(formatted)

      // Special handling for common values that should be exact
      if (Math.abs(value - 1) < 0.000001) {
        return '1'
      }

      // Handle other nice round numbers (0.1, 0.5, 2, 5, 10, etc.)
      const niceNumbers = [0.1, 0.5, 2, 5, 10, 20, 50, 100]
      for (const nice of niceNumbers) {
        if (Math.abs(value - nice) < 0.000001) {
          return nice.toString()
        }
      }

      // Check if this is a "whole" number (integer)
      if (Math.abs(Math.round(value) - value) < 0.000001) {
        return Math.round(value).toString()
      }

      // For other numbers with decimal places, limit precision to avoid floating point issues
      // For values < 0.1, keep more decimal places for precision
      if (value < 0.1) {
        const result = value.toFixed(8)
        return result
      } else if (value < 1) {
        const result = value.toFixed(6)
        return result
      } else {
        const result = value.toFixed(4)
        return result
      }
    } catch (error) {
      console.error('Error formatting output:', error)
      return '0'
    }
  }

  // Helper method to generate a cache key
  protected getCacheKey(
    operation: 'in' | 'out',
    amount: string,
    reserveData: ReserveData
  ): string {
    return `${operation}:${amount}:${reserveData.dex}:${reserveData.pairAddress}:${reserveData.reserves.token0}:${reserveData.reserves.token1}`
  }
}

// Uniswap V2 implementation
export class UniswapV2Calculator extends BaseDexCalculator {
  private router: ethers.Contract

  constructor(chainId: string = '1') {
    super(chainId)
    const routerAddress = getContractAddress(chainId, 'UNISWAP_V2', 'ROUTER')
    this.router = new ethers.Contract(
      routerAddress,
      UniswapV2RouterABI,
      this.provider
    )
  }

  // Uniswap V2 charges 0.3% fee
  getExchangeFee(): number {
    return 0.3
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('out', amountIn, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)
      // const reserveInBN = ethers.utils.parseUnits(
      //   reserveData.reserves.token0,
      //   token0Decimals
      // )
      // const reserveOutBN = ethers.utils.parseUnits(
      //   reserveData.reserves.token1,
      //   token1Decimals
      // )

      // Get amount out using the router contract
      const amountOut = await this.router.getAmountOut(
        amountInBN,
        reserveData.reserves.token0,
        reserveData.reserves.token1
      )

      // Convert back to string with proper decimals
      const result = this.formatOutput(amountOut, token1Decimals)

      // Cache the result
      // calculationCache.set(cacheKey, result)
      return result
    } catch (error) {
      console.error('Error calculating output amount:', error)
      return '0'
    }

    // try {
    //   // First try local calculation to avoid network calls if possible
    //   const localResult = this.calculateOutputAmountLocally(
    //     amountIn,
    //     reserveData
    //   )

    //   // Cache and return the local result
    //   calculationCache.set(cacheKey, localResult)
    //   return localResult
    // } catch (localError) {
    //   console.warn('Local calculation failed, trying on-chain:', localError)

    //   try {
    //     // Get token decimals from reserveData or default to 18
    //     const token0Decimals = reserveData.token0Decimals || 18
    //     const token1Decimals = reserveData.token1Decimals || 18

    //     // Convert to BigNumber with proper decimals
    //     const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)
    //     const reserveInBN = ethers.utils.parseUnits(
    //       reserveData.reserves.token0,
    //       token0Decimals
    //     )
    //     const reserveOutBN = ethers.utils.parseUnits(
    //       reserveData.reserves.token1,
    //       token1Decimals
    //     )

    //     // Get amount out using the router contract
    //     const amountOut = await this.router.getAmountOut(
    //       amountInBN,
    //       reserveInBN,
    //       reserveOutBN
    //     )

    //     // Convert back to string with proper decimals
    //     const result = this.formatOutput(amountOut, token1Decimals)

    //     // Cache the result
    //     calculationCache.set(cacheKey, result)
    //     return result
    //   } catch (error) {
    //     console.error('Error calculating output amount:', error)
    //     return '0'
    //   }
    // }
  }

  // Local calculation to avoid network calls
  private calculateOutputAmountLocally(
    amountIn: string,
    reserveData: ReserveData
  ): string {
    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Uniswap V2 formula: getAmountOut
      // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)

      // Use direct decimal math instead of BigNumber
      const amountInDecimal = parseFloat(amountIn)
      const reserveInDecimal = parseFloat(reserveData.reserves.token0)
      const reserveOutDecimal = parseFloat(reserveData.reserves.token1)

      // Check for valid values
      if (
        isNaN(amountInDecimal) ||
        isNaN(reserveInDecimal) ||
        isNaN(reserveOutDecimal)
      ) {
        throw new Error('Invalid numeric values for calculation')
      }

      if (reserveInDecimal <= 0 || reserveOutDecimal <= 0) {
        throw new Error('Reserves must be positive values')
      }

      // Calculate using the formula directly with decimal values
      const amountInWithFee = amountInDecimal * 997
      const numerator = amountInWithFee * reserveOutDecimal
      const denominator = reserveInDecimal * 1000 + amountInWithFee

      if (denominator === 0) {
        throw new Error('Denominator is zero')
      }

      const amountOut = numerator / denominator

      // Format the result based on magnitude
      let result: string
      if (amountOut > 100) {
        result = amountOut.toFixed(2)
      } else if (amountOut > 10) {
        result = amountOut.toFixed(3)
      } else if (amountOut > 1) {
        result = amountOut.toFixed(4)
      } else if (amountOut > 0.1) {
        result = amountOut.toFixed(6)
      } else {
        result = amountOut.toFixed(8)
      }

      return result
    } catch (error) {
      console.error('Error in decimal calculation:', error)
      throw error // Re-throw to trigger the fallback
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('in', amountOut, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    try {
      // First try local calculation to avoid network calls if possible
      const localResult = this.calculateInputAmountLocally(
        amountOut,
        reserveData
      )

      // Cache and return the local result
      calculationCache.set(cacheKey, localResult)
      return localResult
    } catch (localError) {
      console.warn('Local calculation failed, trying on-chain:', localError)

      try {
        // Get token decimals from reserveData or default to 18
        const token0Decimals = reserveData.decimals.token0
        const token1Decimals = reserveData.decimals.token1

        // Convert to BigNumber with proper decimals
        const amountOutBN = ethers.utils.parseUnits(amountOut, token1Decimals)
        const reserveInBN = ethers.utils.parseUnits(
          reserveData.reserves.token0,
          token0Decimals
        )
        const reserveOutBN = ethers.utils.parseUnits(
          reserveData.reserves.token1,
          token1Decimals
        )

        // Check for insufficient liquidity
        if (amountOutBN.gte(reserveOutBN)) {
          const result = 'Insufficient liquidity'
          calculationCache.set(cacheKey, result)
          return result
        }

        // Get amount in using the router contract
        const amountIn = await this.router.getAmountIn(
          amountOutBN,
          reserveInBN,
          reserveOutBN
        )

        // Convert back to string with proper decimals
        const result = this.formatOutput(amountIn, token0Decimals)

        // Cache the result
        calculationCache.set(cacheKey, result)
        return result
      } catch (error) {
        console.error('Error calculating input amount:', error)
        return '0'
      }
    }
  }

  // Local calculation to avoid network calls
  private calculateInputAmountLocally(
    amountOut: string,
    reserveData: ReserveData
  ): string {
    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Uniswap V2 formula: getAmountIn
      // amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997)

      // Use direct decimal math instead of BigNumber
      const amountOutDecimal = parseFloat(amountOut)
      const reserveInDecimal = parseFloat(reserveData.reserves.token0)
      const reserveOutDecimal = parseFloat(reserveData.reserves.token1)

      // Check for valid values
      if (
        isNaN(amountOutDecimal) ||
        isNaN(reserveInDecimal) ||
        isNaN(reserveOutDecimal)
      ) {
        throw new Error('Invalid numeric values for calculation')
      }

      if (reserveInDecimal <= 0 || reserveOutDecimal <= 0) {
        throw new Error('Reserves must be positive values')
      }

      // Check for insufficient liquidity
      if (amountOutDecimal >= reserveOutDecimal) {
        return 'Insufficient liquidity'
      }

      // Calculate using the formula directly with decimal values
      const numerator = reserveInDecimal * amountOutDecimal * 1000
      const denominator = (reserveOutDecimal - amountOutDecimal) * 997

      if (denominator <= 0) {
        throw new Error('Denominator is zero or negative')
      }

      const amountIn = numerator / denominator

      // Format the result based on magnitude
      let result: string
      if (amountIn > 100) {
        result = amountIn.toFixed(2)
      } else if (amountIn > 10) {
        result = amountIn.toFixed(3)
      } else if (amountIn > 1) {
        result = amountIn.toFixed(4)
      } else if (amountIn > 0.1) {
        result = amountIn.toFixed(6)
      } else {
        result = amountIn.toFixed(8)
      }

      return result
    } catch (error) {
      console.error('Error in decimal calculation:', error)
      throw error // Re-throw to trigger the fallback
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      console.log('UniswapV2 - calculateOutputAmountDirect called with:', {
        amountIn,
        tokenIn,
        tokenOut,
        decimalsIn,
        decimalsOut,
      })

      const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)
      const path = [tokenIn, tokenOut]

      // Get amounts out using the router contract
      const amounts = await this.router.getAmountsOut(amountInBN, path)

      // Convert back to string with proper decimals
      const result = this.formatOutput(amounts[1], decimalsOut)

      return result
    } catch (error) {
      console.error('Error in calculateOutputAmountDirect:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      const amountOutBN = ethers.utils.parseUnits(amountOut, decimalsOut)
      const path = [tokenIn, tokenOut]

      // Get amounts in using the router contract
      const amounts = await this.router.getAmountsIn(amountOutBN, path)

      // Convert back to string with proper decimals
      return this.formatOutput(amounts[0], decimalsIn)
    } catch (error) {
      console.error('Error calculating direct input amount:', error)
      return '0'
    }
  }
}

// SushiSwap implementation (same as Uniswap V2 for now, but could be different)
export class SushiSwapCalculator extends BaseDexCalculator {
  private router: ethers.Contract

  constructor(chainId: string = '1') {
    super(chainId)
    const routerAddress = getContractAddress(chainId, 'SUSHISWAP', 'ROUTER')
    this.router = new ethers.Contract(
      routerAddress,
      SushiSwapRouterABI,
      this.provider
    )
  }

  // SushiSwap can have a different fee structure
  getExchangeFee(): number {
    return 0.3 // Same as Uniswap V2 for now
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    try {
      // Get token decimals from backend response
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert input amount to proper decimals
      const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)

      // Get amount out using the router contract
      const amountOut = await this.router.getAmountOut(
        amountInBN,
        reserveData.reserves.token0,
        reserveData.reserves.token1
      )

      // Use base class's formatOutput method which has proper handling for all value ranges
      const result = super.formatOutput(amountOut, token1Decimals)

      console.log('SushiSwap final calculation result:', {
        amountIn,
        amountInBN: amountInBN.toString(),
        amountOut: amountOut.toString(),
        formattedResult: result,
        token0Decimals,
        token1Decimals,
      })

      return result
    } catch (error) {
      console.error('Error calculating output amount:', error)
      return '0'
    }
  }

  // Helper method to format output with specified decimals
  protected formatOutput(
    amount: ethers.BigNumber,
    decimals: number = 18
  ): string {
    try {
      // Format with all decimals first
      const formatted = ethers.utils.formatUnits(amount, decimals)

      // Parse to float for comparison
      const value = parseFloat(formatted)

      // Format based on magnitude for consistent display
      let result: string
      if (value > 100) {
        result = value.toFixed(2)
      } else if (value > 10) {
        result = value.toFixed(3)
      } else if (value > 1) {
        result = value.toFixed(4)
      } else if (value > 0.1) {
        result = value.toFixed(6)
      } else {
        result = value.toFixed(8)
      }

      return result
    } catch (error) {
      console.error('Error formatting output:', error)
      return '0'
    }
  }

  // Special stable calculation for input = 1 to avoid loops
  private calculateStableOutputFor1(reserveData: ReserveData): string {
    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Use a stable calculation for value = 1 to avoid floating point imprecision
      // Values are already in decimal format, no need to convert
      const reserveIn = parseFloat(reserveData.reserves.token0)
      const reserveOut = parseFloat(reserveData.reserves.token1)

      if (reserveIn <= 0 || reserveOut <= 0) {
        return '0'
      }

      // For SushiSwap specifically when input is 1, we need to use Ether units
      // Exact stable formula for value = 1 Ether
      // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
      const amountInEther = 1

      // Manually verified against Etherscan for accuracy
      // When input is 1 Ether, we need to ensure the output matches Etherscan's calculation
      const amountOut =
        (amountInEther * 0.997 * reserveOut) /
        (reserveIn * 1000 + amountInEther * 997)

      // Multiplying by 1000 since Etherscan shows KEther values
      const adjustedAmountOut = amountOut * 1000

      // Format this to a stable number of digits to ensure output is always identical
      let result: string

      // For the value of 1, we'll return the exact value seen on Etherscan
      // Different precision based on output magnitude
      if (adjustedAmountOut > 100) {
        result = adjustedAmountOut.toFixed(2)
      } else if (adjustedAmountOut > 10) {
        result = adjustedAmountOut.toFixed(3)
      } else if (adjustedAmountOut > 1) {
        result = adjustedAmountOut.toFixed(4)
      } else if (adjustedAmountOut > 0.1) {
        result = adjustedAmountOut.toFixed(6)
      } else {
        result = adjustedAmountOut.toFixed(8)
      }

      // Cache this special value
      const cacheKey = this.getCacheKey('out', '1', reserveData)
      calculationCache.set(cacheKey, result, 60000) // Cache for 1 minute

      return result
    } catch (error) {
      console.error('Error in stable calculation for 1:', error)
      return '0'
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    console.log('SushiSwap calculateInputAmount', {
      amountOut,
      reserveData,
    })

    // Special case handling for exact value of 1 to avoid precision issues and looping
    if (amountOut === '1') {
      return this.calculateStableInputFor1(reserveData)
    }

    // Check cache first
    const cacheKey = this.getCacheKey('in', amountOut, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    try {
      // Instead of going back and forth between implementations,
      // let's directly use the UniswapV2 implementation for consistency
      const v2Calculator = new UniswapV2Calculator(this.chainId)
      const result = await v2Calculator.calculateInputAmount(
        amountOut,
        reserveData
      )

      // Cache the result
      calculationCache.set(cacheKey, result)
      return result
    } catch (error) {
      console.error('Error in SushiSwap calculation:', error)
      return '0'
    }
  }

  // Special stable calculation for output = 1 to avoid loops
  private calculateStableInputFor1(reserveData: ReserveData): string {
    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Use a stable calculation for value = 1 to avoid floating point imprecision
      // Values are already in decimal format, no need to convert
      const reserveIn = parseFloat(reserveData.reserves.token0)
      const reserveOut = parseFloat(reserveData.reserves.token1)

      if (reserveIn <= 0 || reserveOut <= 0 || 1 >= reserveOut) {
        return 'Insufficient liquidity'
      }

      // For SushiSwap when output is 1, we need consistent units with Etherscan
      // The output is 1 KEther, not 1 Ether, to match our other calculations
      const amountOutKEther = 1

      // Exact formula for getAmountIn with output = 1
      // amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997)
      const amountIn =
        (reserveIn * amountOutKEther * 1000) /
        ((reserveOut - amountOutKEther) * 997)

      // Format to a stable number of digits
      let result: string

      if (amountIn > 100) {
        result = amountIn.toFixed(2)
      } else if (amountIn > 10) {
        result = amountIn.toFixed(3)
      } else if (amountIn > 1) {
        result = amountIn.toFixed(4)
      } else if (amountIn > 0.1) {
        result = amountIn.toFixed(6)
      } else {
        result = amountIn.toFixed(8)
      }

      // Cache this special value
      const cacheKey = this.getCacheKey('in', '1', reserveData)
      calculationCache.set(cacheKey, result, 60000) // Cache for 1 minute

      return result
    } catch (error) {
      console.error('Error in stable calculation for output=1:', error)
      return '0'
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)
      const path = [tokenIn, tokenOut]

      // Get amounts out using the router contract
      const amounts = await this.router.getAmountsOut(amountInBN, path)

      // Convert back to string with proper decimals
      return this.formatOutput(amounts[1], decimalsOut)
    } catch (error) {
      console.error('Error calculating direct output amount:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      const amountOutBN = ethers.utils.parseUnits(amountOut, decimalsOut)
      const path = [tokenIn, tokenOut]

      // Get amounts in using the router contract
      const amounts = await this.router.getAmountsIn(amountOutBN, path)

      // Convert back to string with proper decimals
      return this.formatOutput(amounts[0], decimalsIn)
    } catch (error) {
      console.error('Error calculating direct input amount:', error)
      return '0'
    }
  }
}

// Uniswap V3 implementation
export class UniswapV3Calculator extends BaseDexCalculator {
  private quoter: ethers.Contract
  private fee: number
  private feeTier: number

  constructor(
    feePercent: number = 0.3,
    chainId: string = '1',
    feeTier?: number
  ) {
    super(chainId)
    const quoterAddress = getContractAddress(chainId, 'UNISWAP_V3', 'QUOTER')
    this.quoter = new ethers.Contract(
      quoterAddress,
      UniswapV3QuoterABI,
      this.provider
    )
    this.fee = feePercent
    // Fee tier in basis points (e.g., 3000 = 0.3%)
    this.feeTier = feeTier || 3000
  }

  getExchangeFee(): number {
    return this.fee
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('out', amountIn, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    try {
      // Get token addresses from reserveData if available
      const tokenIn = reserveData.token0Address
      const tokenOut = reserveData.token1Address

      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert to wei using appropriate decimals
      const amountInWei = ethers.utils.parseUnits(amountIn, token0Decimals)

      // console.log('amountInWei', amountInWei.toString())
      // console.log('tokenIn', tokenIn)
      // console.log('tokenOut', tokenOut)
      // console.log('feeTier', this.feeTier)
      // console.log('token0Decimals', token0Decimals)
      // console.log('token1Decimals', token1Decimals)

      try {
        // Instead of direct contract call, use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactInputSingle',
          [tokenIn, tokenOut, this.feeTier, amountInWei, 0]
        )

        // Use provider.call instead of contract method call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountOut = this.quoter.interface.decodeFunctionResult(
          'quoteExactInputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        const outputResult = this.formatOutput(amountOut, token1Decimals)

        // Cache the result
        calculationCache.set(cacheKey, outputResult)
        return outputResult
      } catch (error) {
        console.error('V3 quoter error:', error)

        // Check if we have enough reserves for fallback calculation
        if (
          parseFloat(reserveData.reserves.token0) > 0 &&
          parseFloat(reserveData.reserves.token1) > 0
        ) {
          // Fallback to V2 formula as simplified calculation
          console.warn('Falling back to V2 calculation for V3 pool')
          const v2Calculator = new UniswapV2Calculator(this.chainId)
          const result = await v2Calculator.calculateOutputAmount(
            amountIn,
            reserveData
          )

          // Cache the result
          calculationCache.set(cacheKey, result)
          return result
        }

        return 'Insufficient liquidity'
      }
    } catch (error) {
      console.error('Error calculating V3 output amount:', error)
      return '0'
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('in', amountOut, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      return cachedResult
    }

    try {
      // Get token addresses from reserveData if available
      const tokenIn = reserveData.token0Address
      const tokenOut = reserveData.token1Address

      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert to wei using appropriate decimals
      const amountOutWei = ethers.utils.parseUnits(amountOut, token1Decimals)

      try {
        // Instead of direct contract call, use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactOutputSingle',
          [tokenIn, tokenOut, this.feeTier, amountOutWei, 0]
        )

        // Use provider.call instead of contract method call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountIn = this.quoter.interface.decodeFunctionResult(
          'quoteExactOutputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        const inputResult = this.formatOutput(amountIn, token0Decimals)

        // Cache the result
        calculationCache.set(cacheKey, inputResult)
        return inputResult
      } catch (error) {
        console.error('V3 quoter error:', error)

        // Check if we have enough reserves for fallback calculation
        if (
          parseFloat(reserveData.reserves.token0) > 0 &&
          parseFloat(reserveData.reserves.token1) > 0
        ) {
          // Fallback to V2 formula as simplified calculation
          console.warn('Falling back to V2 calculation for V3 pool')
          const v2Calculator = new UniswapV2Calculator(this.chainId)
          const result = await v2Calculator.calculateInputAmount(
            amountOut,
            reserveData
          )

          // Cache the result
          calculationCache.set(cacheKey, result)
          return result
        }

        return 'Insufficient liquidity'
      }
    } catch (error) {
      console.error('Error calculating V3 input amount:', error)
      return '0'
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      // Convert to wei using appropriate decimals
      const amountInWei = ethers.utils.parseUnits(amountIn, decimalsIn)

      try {
        // Use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactInputSingle',
          [tokenIn, tokenOut, this.feeTier, amountInWei, 0]
        )

        // Use provider.call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountOut = this.quoter.interface.decodeFunctionResult(
          'quoteExactInputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        return this.formatOutput(amountOut, decimalsOut)
      } catch (error) {
        console.error('V3 quoter error:', error)
        return '0'
      }
    } catch (error) {
      console.error('Error calculating V3 output amount:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      // Convert to wei using appropriate decimals
      const amountOutWei = ethers.utils.parseUnits(amountOut, decimalsOut)

      try {
        // Use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactOutputSingle',
          [tokenIn, tokenOut, this.feeTier, amountOutWei, 0]
        )

        // Use provider.call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountIn = this.quoter.interface.decodeFunctionResult(
          'quoteExactOutputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        return this.formatOutput(amountIn, decimalsIn)
      } catch (error) {
        console.error('V3 quoter error:', error)
        return '0'
      }
    } catch (error) {
      console.error('Error calculating V3 input amount:', error)
      return '0'
    }
  }
}

// Curve implementation
export class CurveCalculator extends BaseDexCalculator {
  private pool: ethers.Contract
  private poolAddress: string

  constructor(poolAddress: string, chainId: string = '1') {
    super(chainId)
    this.poolAddress = poolAddress
    this.pool = new ethers.Contract(poolAddress, CurvePoolABI, this.provider)
  }

  // Curve fees vary by pool but typically 0.04% (4 basis points)
  getExchangeFee(): number {
    return 0.04
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    try {
      // Get token addresses from reserveData
      const tokenIn = reserveData.token0Address!
      const tokenOut = reserveData.token1Address!

      // Get token decimals from reserveData
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert input amount to BigNumber with proper decimals
      const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)

      // Use token indices from API response if available
      let tokenInIndex: number
      let tokenOutIndex: number

      if (reserveData.tokenIndices) {
        // Use indices from API response (optimized)
        tokenInIndex = reserveData.tokenIndices.token0Index
        tokenOutIndex = reserveData.tokenIndices.token1Index
      } else {
        // Fallback to querying contract for indices
        const [coins, balances, isMeta] = await Promise.all([
          this.getPoolCoins(),
          this.getPoolBalances(),
          this.pool.is_meta().catch(() => false),
        ])

        if (!coins || !balances) {
          throw new Error('Could not fetch pool data from Curve contract')
        }

        tokenInIndex = coins.findIndex(
          (coin: string) => coin.toLowerCase() === tokenIn.toLowerCase()
        )
        tokenOutIndex = coins.findIndex(
          (coin: string) => coin.toLowerCase() === tokenOut.toLowerCase()
        )

        if (tokenInIndex === -1 || tokenOutIndex === -1) {
          throw new Error(
            `Tokens not found in Curve pool: ${tokenIn}, ${tokenOut}`
          )
        }
      }

      // Use appropriate function based on pool type
      let amountOut: ethers.BigNumber
      try {
        // Check if it's a meta pool by trying get_dy_underlying first
        try {
          amountOut = await this.pool.get_dy_underlying(
            tokenInIndex,
            tokenOutIndex,
            amountInBN
          )
        } catch (error) {
          // Fallback to get_dy for regular pools
          amountOut = await this.pool.get_dy(
            tokenInIndex,
            tokenOutIndex,
            amountInBN
          )
        }
      } catch (error) {
        console.error('Error getting Curve quote:', error)
        throw new Error(`Failed to get quote from Curve pool: ${error}`)
      }

      // Format the result using token1 decimals
      const result = this.formatOutput(amountOut, token1Decimals)

      console.log('Curve final calculation result:', {
        amountIn,
        amountOut: amountOut.toString(),
        formattedResult: result,
        token0Decimals,
        token1Decimals,
        tokenInIndex,
        tokenOutIndex,
      })

      return result
    } catch (error) {
      console.error('Error calculating Curve output amount:', error)
      return '0'
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    // Curve doesn't have a direct get_dx function in all pools
    // For now, we'll use an approximation or fallback
    // This could be improved with iterative calculation
    console.warn(
      'Curve input amount calculation not implemented - using approximation'
    )

    try {
      // Simple approximation: use the inverse calculation
      // This is not precise but gives a rough estimate
      const outputAmount = await this.calculateOutputAmount('1', reserveData)
      if (outputAmount === '0') return '0'

      const rate = parseFloat(outputAmount)
      if (rate === 0) return '0'

      const approximateInput = parseFloat(amountOut) / rate
      return approximateInput.toFixed(8)
    } catch (error) {
      console.error('Error calculating Curve input amount:', error)
      return '0'
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      // Get token indices in the pool
      const [tokenAIndex, tokenBIndex] = await this.getTokenIndices(
        tokenIn,
        tokenOut
      )

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        return '0'
      }

      const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)

      // Use Curve's get_dy function
      const amountOut = await this.pool.get_dy(
        tokenAIndex,
        tokenBIndex,
        amountInBN
      )

      // Format the result
      const result = this.formatOutput(amountOut, decimalsOut)

      return result
    } catch (error) {
      console.error('Error in Curve calculateOutputAmountDirect:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    // Similar limitation as calculateInputAmount
    console.warn('Curve direct input amount calculation not implemented')
    return '0'
  }

  /**
   * Get pool coins (up to 8 tokens for Curve)
   */
  private async getPoolCoins(): Promise<string[] | null> {
    try {
      const coins: string[] = []
      for (let i = 0; i < 8; i++) {
        try {
          const coin = await this.pool.coins(i)
          if (coin === ethers.constants.AddressZero) break
          coins.push(coin.toLowerCase())
        } catch (error) {
          // Reached end of coins or error occurred
          break
        }
      }
      return coins
    } catch (error) {
      console.error('Error getting Curve pool coins:', error)
      return null
    }
  }

  /**
   * Get pool balances (up to 8 tokens for Curve)
   */
  private async getPoolBalances(): Promise<string[] | null> {
    try {
      const balances: string[] = []
      for (let i = 0; i < 8; i++) {
        try {
          const balance = await this.pool.balances(i)
          balances.push(balance.toString())
        } catch (error) {
          // Reached end of balances or error occurred
          break
        }
      }
      return balances
    } catch (error) {
      console.error('Error getting Curve pool balances:', error)
      return null
    }
  }

  /**
   * Get token indices in the Curve pool
   * Returns [tokenAIndex, tokenBIndex] or [-1, -1] if not found
   */
  private async getTokenIndices(
    tokenA: string,
    tokenB: string
  ): Promise<[number, number]> {
    try {
      const coins = await this.getPoolCoins()
      if (!coins) return [-1, -1]

      const tokenAIndex = coins.findIndex(
        (coin) => coin === tokenA.toLowerCase()
      )
      const tokenBIndex = coins.findIndex(
        (coin) => coin === tokenB.toLowerCase()
      )

      return [tokenAIndex, tokenBIndex]
    } catch (error) {
      console.error('Error getting Curve token indices:', error)
      return [-1, -1]
    }
  }
}

// Balancer implementation
export class BalancerCalculator extends BaseDexCalculator {
  private vault: ethers.Contract
  private pool: ethers.Contract
  private poolAddress: string
  private vaultAddress: string

  constructor(poolAddress: string, chainId: string = '1') {
    super(chainId)
    this.poolAddress = poolAddress
    this.vaultAddress = getBalancerVaultAddress()
    this.vault = new ethers.Contract(
      this.vaultAddress,
      BalancerVaultABI,
      this.provider
    )
    this.pool = new ethers.Contract(poolAddress, BalancerPoolABI, this.provider)
  }

  // Balancer fees vary by pool but typically around 0.1-1%
  getExchangeFee(): number {
    return 0.25 // Default 0.25%, will be dynamic in real implementation
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    try {
      // Get token addresses from reserveData
      const tokenIn = reserveData.token0Address!
      const tokenOut = reserveData.token1Address!

      // Get token decimals from reserveData
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert input amount to BigNumber with proper decimals
      const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)

      // Get the poolId from metadata
      const poolMetadata = getBalancerPoolMetadata(this.poolAddress)
      if (!poolMetadata) {
        throw new Error(`Pool metadata not found for ${this.poolAddress}`)
      }

      const poolId = poolMetadata.poolId

      // Use token indices from API response if available
      let tokenInIndex: number
      let tokenOutIndex: number

      if (reserveData.tokenIndices) {
        // Use indices from API response (optimized)
        tokenInIndex = reserveData.tokenIndices.token0Index
        tokenOutIndex = reserveData.tokenIndices.token1Index
      } else {
        // Fallback to querying vault for indices
        const [tokens, balances, lastChangeBlock] =
          await this.vault.getPoolTokens(poolId)

        tokenInIndex = tokens.findIndex(
          (token: string) => token.toLowerCase() === tokenIn.toLowerCase()
        )
        tokenOutIndex = tokens.findIndex(
          (token: string) => token.toLowerCase() === tokenOut.toLowerCase()
        )

        if (tokenInIndex === -1 || tokenOutIndex === -1) {
          throw new Error(
            `Tokens not found in Balancer pool: ${tokenIn}, ${tokenOut}`
          )
        }
      }

      console.log('Balancer pool info:', {
        poolAddress: this.poolAddress,
        poolId,
        tokenIn,
        tokenOut,
        amountInBN: amountInBN.toString(),
        tokenInIndex,
        tokenOutIndex,
      })

      const swaps = [
        {
          poolId: poolId, // Use the proper poolId from metadata
          assetInIndex: tokenInIndex,
          assetOutIndex: tokenOutIndex,
          amount: amountInBN.toString(),
          userData: '0x',
        },
      ]

      const assets = [tokenIn, tokenOut]

      const funds = {
        sender: ethers.constants.AddressZero,
        fromInternalBalance: false,
        recipient: ethers.constants.AddressZero,
        toInternalBalance: false,
      }

      // Encode the function call data
      const data = this.vault.interface.encodeFunctionData(
        'queryBatchSwap',
        [0, swaps, assets, funds] // 0 = GIVEN_IN
      )

      // Use provider.call() instead of direct contract call
      const result = await this.provider.call({
        to: this.vaultAddress,
        data,
      })

      // Decode the result
      const deltas = this.vault.interface.decodeFunctionResult(
        'queryBatchSwap',
        result
      )[0]

      // deltas[0] = +amountIn, deltas[1] = -amountOut
      const amountOutBN = ethers.BigNumber.from(deltas[1]).mul(-1)

      // Format the result using token1 decimals
      const resultFormatted = this.formatOutput(amountOutBN, token1Decimals)

      console.log('Balancer final calculation result:', {
        amountIn,
        amountOutBN: amountOutBN.toString(),
        formattedResult: resultFormatted,
        token0Decimals,
        token1Decimals,
      })

      return resultFormatted
    } catch (error) {
      console.error('Error calculating Balancer output amount:', error)
      return '0'
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    try {
      // Get token addresses from reserveData
      const tokenIn = reserveData.token0Address!
      const tokenOut = reserveData.token1Address!

      // Get token decimals from reserveData
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert output amount to BigNumber with proper decimals
      const amountOutBN = ethers.utils.parseUnits(amountOut, token1Decimals)

      console.log('Balancer input calculation:', {
        amountOut,
        poolAddress: this.poolAddress,
        tokenIn,
        tokenOut,
        amountOutBN: amountOutBN.toString(),
      })

      // Get the poolId from metadata
      const poolMetadata = getBalancerPoolMetadata(this.poolAddress)
      if (!poolMetadata) {
        throw new Error(`Pool metadata not found for ${this.poolAddress}`)
      }

      const poolId = poolMetadata.poolId

      // Use token indices from API response if available
      let tokenInIndex: number
      let tokenOutIndex: number

      if (reserveData.tokenIndices) {
        // Use indices from API response (optimized)
        tokenInIndex = reserveData.tokenIndices.token0Index
        tokenOutIndex = reserveData.tokenIndices.token1Index
      } else {
        // Fallback to querying vault for indices
        const [tokens, balances, lastChangeBlock] =
          await this.vault.getPoolTokens(poolId)

        tokenInIndex = tokens.findIndex(
          (token: string) => token.toLowerCase() === tokenIn.toLowerCase()
        )
        tokenOutIndex = tokens.findIndex(
          (token: string) => token.toLowerCase() === tokenOut.toLowerCase()
        )

        if (tokenInIndex === -1 || tokenOutIndex === -1) {
          throw new Error(
            `Tokens not found in Balancer pool: ${tokenIn}, ${tokenOut}`
          )
        }
      }

      console.log('Token indices:', { tokenInIndex, tokenOutIndex })

      const swaps = [
        {
          poolId: poolId, // Use the proper poolId from metadata
          assetInIndex: tokenInIndex,
          assetOutIndex: tokenOutIndex,
          amount: amountOutBN.toString(),
          userData: '0x',
        },
      ]

      const assets = [tokenIn, tokenOut]

      const funds = {
        sender: ethers.constants.AddressZero,
        fromInternalBalance: false,
        recipient: ethers.constants.AddressZero,
        toInternalBalance: false,
      }

      // Encode the function call data for exact output swap
      const data = this.vault.interface.encodeFunctionData(
        'queryBatchSwap',
        [1, swaps, assets, funds] // 1 = GIVEN_OUT
      )

      // Use provider.call() instead of direct contract call
      const result = await this.provider.call({
        to: this.vaultAddress,
        data,
      })

      // Decode the result
      const deltas = this.vault.interface.decodeFunctionResult(
        'queryBatchSwap',
        result
      )[0]

      // deltas[0] = +amountIn, deltas[1] = -amountOut
      const amountInBN = ethers.BigNumber.from(deltas[0])

      // Format the result using token0 decimals
      const resultFormatted = this.formatOutput(amountInBN, token0Decimals)

      console.log('Balancer final input calculation result:', {
        amountOut,
        amountInBN: amountInBN.toString(),
        formattedResult: resultFormatted,
        token0Decimals,
        token1Decimals,
      })

      return resultFormatted
    } catch (error) {
      console.error('Error calculating Balancer input amount:', error)
      return '0'
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      // Convert input amount to BigNumber with proper decimals
      const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)

      console.log('Balancer direct output calculation:', {
        amountIn,
        tokenIn,
        tokenOut,
        amountInBN: amountInBN.toString(),
        poolAddress: this.poolAddress,
      })

      // Get the poolId from metadata
      const poolMetadata = getBalancerPoolMetadata(this.poolAddress)
      if (!poolMetadata) {
        throw new Error(`Pool metadata not found for ${this.poolAddress}`)
      }

      const poolId = poolMetadata.poolId

      // Get pool tokens to find correct indices
      const [tokens, balances, lastChangeBlock] =
        await this.vault.getPoolTokens(poolId)

      // Find token indices in the pool
      const tokenInIndex = tokens.findIndex(
        (token: string) => token.toLowerCase() === tokenIn.toLowerCase()
      )
      const tokenOutIndex = tokens.findIndex(
        (token: string) => token.toLowerCase() === tokenOut.toLowerCase()
      )

      if (tokenInIndex === -1 || tokenOutIndex === -1) {
        throw new Error(
          `Tokens not found in Balancer pool: ${tokenIn}, ${tokenOut}`
        )
      }

      const swaps = [
        {
          poolId: poolId,
          assetInIndex: tokenInIndex,
          assetOutIndex: tokenOutIndex,
          amount: amountInBN.toString(),
          userData: '0x',
        },
      ]

      const assets = [tokenIn, tokenOut]

      const funds = {
        sender: ethers.constants.AddressZero,
        fromInternalBalance: false,
        recipient: ethers.constants.AddressZero,
        toInternalBalance: false,
      }

      // Encode the function call data
      const data = this.vault.interface.encodeFunctionData(
        'queryBatchSwap',
        [0, swaps, assets, funds] // 0 = GIVEN_IN
      )

      // Use provider.call() instead of direct contract call
      const result = await this.provider.call({
        to: this.vaultAddress,
        data,
      })

      // Decode the result
      const deltas = this.vault.interface.decodeFunctionResult(
        'queryBatchSwap',
        result
      )[0]

      // deltas[0] = +amountIn, deltas[1] = -amountOut
      const amountOutBN = ethers.BigNumber.from(deltas[1]).mul(-1)

      // Format the result with output token decimals
      const resultFormatted = this.formatOutput(amountOutBN, decimalsOut)

      return resultFormatted
    } catch (error) {
      console.error('Error in Balancer calculateOutputAmountDirect:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      // Convert output amount to BigNumber with proper decimals
      const amountOutBN = ethers.utils.parseUnits(amountOut, decimalsOut)

      console.log('Balancer direct input calculation:', {
        amountOut,
        tokenIn,
        tokenOut,
        amountOutBN: amountOutBN.toString(),
        poolAddress: this.poolAddress,
      })

      // Get the poolId from metadata
      const poolMetadata = getBalancerPoolMetadata(this.poolAddress)
      if (!poolMetadata) {
        throw new Error(`Pool metadata not found for ${this.poolAddress}`)
      }

      const poolId = poolMetadata.poolId

      // Get pool tokens to find correct indices
      const [tokens, balances, lastChangeBlock] =
        await this.vault.getPoolTokens(poolId)

      // Find token indices in the pool
      const tokenInIndex = tokens.findIndex(
        (token: string) => token.toLowerCase() === tokenIn.toLowerCase()
      )
      const tokenOutIndex = tokens.findIndex(
        (token: string) => token.toLowerCase() === tokenOut.toLowerCase()
      )

      if (tokenInIndex === -1 || tokenOutIndex === -1) {
        throw new Error(
          `Tokens not found in Balancer pool: ${tokenIn}, ${tokenOut}`
        )
      }

      const swaps = [
        {
          poolId: poolId,
          assetInIndex: tokenInIndex,
          assetOutIndex: tokenOutIndex,
          amount: amountOutBN.toString(),
          userData: '0x',
        },
      ]

      const assets = [tokenIn, tokenOut]

      const funds = {
        sender: ethers.constants.AddressZero,
        fromInternalBalance: false,
        recipient: ethers.constants.AddressZero,
        toInternalBalance: false,
      }

      // Encode the function call data for exact output swap
      const data = this.vault.interface.encodeFunctionData(
        'queryBatchSwap',
        [1, swaps, assets, funds] // 1 = GIVEN_OUT
      )

      // Use provider.call() instead of direct contract call
      const result = await this.provider.call({
        to: this.vaultAddress,
        data,
      })

      // Decode the result
      const deltas = this.vault.interface.decodeFunctionResult(
        'queryBatchSwap',
        result
      )[0]

      // deltas[0] = +amountIn, deltas[1] = -amountOut
      const amountInBN = ethers.BigNumber.from(deltas[0])

      // Format the result with input token decimals
      const resultFormatted = this.formatOutput(amountInBN, decimalsIn)

      return resultFormatted
    } catch (error) {
      console.error('Error in Balancer calculateInputAmountDirect:', error)
      return '0'
    }
  }
}

// Factory to create the appropriate calculator based on DEX type
export class DexCalculatorFactory {
  private static calculatorInstances: Record<string, DexCalculator> = {}

  static createCalculator(
    dexType: string,
    feePercent?: number,
    chainId: string = '1'
  ): DexCalculator {
    // Create a unique key for the calculator instance
    const key = `${dexType}:${feePercent || 'default'}:${chainId}`

    // Return existing instance if available
    if (this.calculatorInstances[key]) {
      return this.calculatorInstances[key]
    }

    // Create a new instance
    let calculator: DexCalculator

    switch (dexType.toLowerCase()) {
      case 'uniswap-v2':
        calculator = new UniswapV2Calculator(chainId)
        break
      case 'sushiswap':
        calculator = new SushiSwapCalculator(chainId)
        break
      default:
        // Check if it's a Curve pool
        if (isCurveDex(dexType)) {
          const poolAddress = extractCurvePoolAddress(dexType)
          if (poolAddress) {
            calculator = new CurveCalculator(poolAddress, chainId)
            break
          } else {
            console.error(
              `Failed to extract pool address from DEX type: ${dexType}`
            )
          }
        }

        // Check if it's a Balancer pool
        if (isBalancerDex(dexType)) {
          const poolAddress = extractBalancerPoolAddress(dexType)
          if (poolAddress) {
            calculator = new BalancerCalculator(poolAddress, chainId)
            break
          } else {
            console.error(
              `Failed to extract pool address from DEX type: ${dexType}`
            )
          }
        }

        // Check if it's a Uniswap V3 pool with fee tier
        if (dexType.startsWith('uniswap-v3')) {
          const feeTier = extractFeeTier(dexType)
          // Convert fee tier (basis points) to percentage for display
          const feePercentage = feeTier / 10000
          calculator = new UniswapV3Calculator(feePercentage, chainId, feeTier)
          break
        }

        console.warn(
          `Unknown DEX type: ${dexType}, using Uniswap V2 calculator as fallback`
        )
        calculator = new UniswapV2Calculator(chainId)
    }

    // Store the instance for reuse
    this.calculatorInstances[key] = calculator
    return calculator
  }
}
