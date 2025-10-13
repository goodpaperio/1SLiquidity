import { ethers } from 'ethers'
import { PriceResult } from '../types/price'
import { ReserveResult } from '../types/reserves'
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex'
import { DecimalUtils } from '../utils/decimals'
import { TokenService } from '../services/token-service'

export class CurveService {
  private pool: ethers.Contract
  private provider: ethers.Provider
  private tokenService: TokenService
  private poolAddress: string

  constructor(provider: ethers.Provider, poolAddress: string) {
    this.provider = provider
    this.poolAddress = poolAddress
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
      // Get token indices in the pool
      const [tokenAIndex, tokenBIndex] = await this.getTokenIndices(
        tokenA,
        tokenB
      )

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
      } as ReserveResult
    } catch (error) {
      console.error('Error fetching Curve reserves:', error)
      return null
    }
  }

  /**
   * Get price for a token pair using Curve's get_dy function
   */
  async getPrice(tokenA: string, tokenB: string): Promise<PriceResult | null> {
    try {
      // Get token indices in the pool
      const [tokenAIndex, tokenBIndex] = await this.getTokenIndices(
        tokenA,
        tokenB
      )

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log('One or both tokens not found in Curve pool')
        return null
      }

      // Get token info for proper decimal handling
      const [tokenAInfo, tokenBInfo] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      // Calculate price using 1 unit of tokenA
      const amountIn = DecimalUtils.normalizeAmount('1', tokenAInfo.decimals)
      const amountOut = await this.pool.get_dy(
        tokenAIndex,
        tokenBIndex,
        amountIn
      )

      const price = DecimalUtils.calculatePrice(
        amountIn,
        amountOut,
        tokenAInfo.decimals,
        tokenBInfo.decimals
      )

      return {
        dex: 'curve',
        price,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('Curve price fetch failed:', error)
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
      // Get all coins in the pool (up to 8 tokens)
      const coins: string[] = []
      for (let i = 0; i < 8; i++) {
        try {
          const coin = await this.pool.coins(i)
          if (coin === COMMON.ZERO_ADDRESS) break
          coins.push(coin.toLowerCase())
        } catch (error) {
          // Reached end of coins
          break
        }
      }

      const tokenAIndex = coins.findIndex(
        (coin) => coin === tokenA.toLowerCase()
      )
      const tokenBIndex = coins.findIndex(
        (coin) => coin === tokenB.toLowerCase()
      )

      return [tokenAIndex, tokenBIndex]
    } catch (error) {
      console.error('Error getting token indices:', error)
      return [-1, -1]
    }
  }

  /**
   * Get pool information
   */
  async getPoolInfo(): Promise<{
    coins: string[]
    A: bigint
    fee: bigint
  } | null> {
    try {
      const coins: string[] = []
      for (let i = 0; i < 8; i++) {
        try {
          const coin = await this.pool.coins(i)
          if (coin === COMMON.ZERO_ADDRESS) break
          coins.push(coin)
        } catch (error) {
          break
        }
      }

      const [A, fee] = await Promise.all([this.pool.A(), this.pool.fee()])

      return {
        coins,
        A,
        fee,
      }
    } catch (error) {
      console.error('Error getting pool info:', error)
      return null
    }
  }
}
