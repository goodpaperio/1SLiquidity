import { ethers } from 'ethers'
import { PriceResult } from '../types/price'
import { ReserveResult } from '../types/reserves'
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex'
import { DecimalUtils } from '../utils/decimals'
import { TokenService } from '../services/token-service'

interface CurvePoolMetadata {
  name: string
  isMeta: boolean
  tokens: string[]
  underlyingTokens: string[]
  A: string
  fee: string
  adminFee: string
}

export class CurveService {
  private pool: ethers.Contract
  private provider: ethers.Provider
  private tokenService: TokenService
  private poolAddress: string
  private metadata: CurvePoolMetadata

  constructor(
    provider: ethers.Provider,
    poolAddress: string,
    metadata: CurvePoolMetadata
  ) {
    this.provider = provider
    this.poolAddress = poolAddress
    this.metadata = metadata
    this.tokenService = TokenService.getInstance(provider)
    this.pool = new ethers.Contract(
      poolAddress,
      CONTRACT_ABIS.CURVE.POOL,
      provider
    )
  }

  // Helper method to convert Wei to normal value for price calculation
  private convertWeiToNormal(weiValue: bigint, decimals: number): number {
    const divisor = Math.pow(10, decimals)
    return Number(weiValue) / divisor
  }

  /**
   * Get reserves for a Curve pool
   * Curve pools use indices instead of token addresses
   * This method maps token addresses to indices and returns reserves
   */
  async getReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    try {
      // Get token indices from metadata (no blockchain call needed)
      const [tokenAIndex, tokenBIndex] = this.getTokenIndices(tokenA, tokenB)

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log('One or both tokens not found in Curve pool')
        return null
      }

      // Get balances for both tokens
      const [balanceA, balanceB] = await Promise.all([
        this.pool.balances(tokenAIndex),
        this.pool.balances(tokenBIndex),
      ])

      // Get token decimals
      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      // Calculate price: reservesTokenB / reservesTokenA (in normalized values)
      const reservesTokenAinEth = this.convertWeiToNormal(
        BigInt(balanceA.toString()),
        token0Info.decimals
      )
      const reservesTokenBinEth = this.convertWeiToNormal(
        BigInt(balanceB.toString()),
        token1Info.decimals
      )
      const price = reservesTokenBinEth / reservesTokenAinEth

      console.log('Curve reserves:', {
        tokenA: balanceA.toString(),
        tokenB: balanceB.toString(),
        tokenAIndex,
        tokenBIndex,
        price: price,
      })

      return {
        dex: 'curve',
        pairAddress: this.poolAddress,
        reserves: {
          token0: balanceA.toString(),
          token1: balanceB.toString(),
        },
        price: price,
        timestamp: Date.now(),
        tokenIndices: {
          token0Index: tokenAIndex,
          token1Index: tokenBIndex,
        },
      } as ReserveResult
    } catch (error) {
      console.error('Error fetching Curve reserves:', error)
      return null
    }
  }

  /**
   * Get price for a token pair using Curve's get_dy function
   * @param amountIn - Amount of tokenA to use for price calculation (default: 1)
   */
  async getPrice(tokenA: string, tokenB: string, amountIn: number | string = 1): Promise<PriceResult | null> {
    try {
      // Get token indices from metadata (no blockchain call needed)
      const [tokenAIndex, tokenBIndex] = this.getTokenIndices(tokenA, tokenB)

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log('One or both tokens not found in Curve pool')
        return null
      }

      // Get token info for proper decimal handling
      const [tokenAInfo, tokenBInfo] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      // Calculate price using specified amount of tokenA
      const amountInNormalized = DecimalUtils.normalizeAmount(String(amountIn), tokenAInfo.decimals)
      const amountOut = await this.pool.get_dy(
        tokenAIndex,
        tokenBIndex,
        amountInNormalized
      )

      const price = DecimalUtils.calculatePrice(
        amountInNormalized,
        amountOut,
        tokenAInfo.decimals,
        tokenBInfo.decimals
      )

      return {
        dex: 'curve',
        price,
        timestamp: Date.now(),
        tokenIndices: {
          token0Index: tokenAIndex,
          token1Index: tokenBIndex,
        },
      }
    } catch (error) {
      console.error('Curve price fetch failed:', error)
      return null
    }
  }

  /**
   * Get token indices in the Curve pool using metadata
   * Returns [tokenAIndex, tokenBIndex] or [-1, -1] if not found
   */
  private getTokenIndices(tokenA: string, tokenB: string): [number, number] {
    // Use metadata tokens (already contains the token addresses)
    const coins = this.metadata.tokens.map((t) => t.toLowerCase())

    const tokenAIndex = coins.findIndex((coin) => coin === tokenA.toLowerCase())
    const tokenBIndex = coins.findIndex((coin) => coin === tokenB.toLowerCase())

    return [tokenAIndex, tokenBIndex]
  }

  /**
   * Get pool information from metadata (no blockchain call needed)
   */
  getPoolInfo(): {
    name: string
    coins: string[]
    underlyingTokens: string[]
    isMeta: boolean
    A: string
    fee: string
    adminFee: string
  } {
    return {
      name: this.metadata.name,
      coins: this.metadata.tokens,
      underlyingTokens: this.metadata.underlyingTokens,
      isMeta: this.metadata.isMeta,
      A: this.metadata.A,
      fee: this.metadata.fee,
      adminFee: this.metadata.adminFee,
    }
  }
}
