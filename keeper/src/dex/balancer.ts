import { ethers } from 'ethers'
import { CONTRACT_ABIS, COMMON } from '../config/dex'
import { DecimalUtils } from '../utils/decimals'
import { TokenService } from '../services/token-service'

export interface BalancerPoolInfo {
  poolId: string
  poolAddress: string
  tokens: string[]
  balances: string[]
  totalSupply: string
  swapFee: string
  poolType: string
}

interface BalancerPoolMetadata {
  poolId: string
  symbol: string
  name: string
  tokens: string[]
  tokenDecimals: number[]
  tokenNames: string[]
  tokenSymbols: string[]
  isActive: boolean
}

export class BalancerService {
  private provider: ethers.Provider
  private poolAddress: string
  private vaultAddress: string
  private tokenService: TokenService
  private metadata: BalancerPoolMetadata

  constructor(
    provider: ethers.Provider,
    poolAddress: string,
    metadata: BalancerPoolMetadata,
    vaultAddress: string = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
  ) {
    this.provider = provider
    this.poolAddress = poolAddress
    this.metadata = metadata
    this.vaultAddress = vaultAddress
    this.tokenService = TokenService.getInstance(provider)
  }

  // Helper method to convert Wei to normal value for price calculation
  private convertWeiToNormal(weiValue: bigint, decimals: number): number {
    const divisor = Math.pow(10, decimals)
    return Number(weiValue) / divisor
  }

  /**
   * Get token indices from metadata (no blockchain call needed)
   */
  private getTokenIndices(tokenA: string, tokenB: string): [number, number] {
    const tokens = this.metadata.tokens.map((t) => t.toLowerCase())

    const tokenAIndex = tokens.findIndex((token) => token === tokenA.toLowerCase())
    const tokenBIndex = tokens.findIndex((token) => token === tokenB.toLowerCase())

    return [tokenAIndex, tokenBIndex]
  }

  /**
   * Get pool information using metadata and fetching only balances
   */
  async getPoolInfo(): Promise<BalancerPoolInfo | null> {
    try {
      const vault = new ethers.Contract(
        this.vaultAddress,
        CONTRACT_ABIS.BALANCER.VAULT,
        this.provider
      )

      // Use poolId from metadata (no blockchain call needed)
      const poolId = this.metadata.poolId

      // Get pool balances from vault (only dynamic data we need)
      const [tokens, balances, lastChangeBlock] = await vault.getPoolTokens(
        poolId
      )

      // Get additional pool info from the pool contract (only if needed)
      let swapFee = '0'
      let poolType = 'Unknown'

      try {
        const pool = new ethers.Contract(
          this.poolAddress,
          CONTRACT_ABIS.BALANCER.POOL,
          this.provider
        )
        swapFee = await pool.getSwapFeePercentage()
      } catch (e) {
        // Some pools might not have this method
      }

      try {
        const pool = new ethers.Contract(
          this.poolAddress,
          CONTRACT_ABIS.BALANCER.POOL,
          this.provider
        )
        poolType = await pool.getPoolType()
      } catch (e) {
        // Some pools might not have this method
      }

      return {
        poolId,
        poolAddress: this.poolAddress,
        tokens: tokens.filter((token: string) => token !== COMMON.ZERO_ADDRESS),
        balances: balances.filter(
          (balance: string, index: number) =>
            tokens[index] !== COMMON.ZERO_ADDRESS
        ),
        totalSupply: '0', // Balancer doesn't have totalSupply like Uniswap
        swapFee,
        poolType,
      }
    } catch (error) {
      console.error(
        `Error getting Balancer pool info for ${this.poolAddress}:`,
        error
      )
      return null
    }
  }

  /**
   * Get reserves for a specific token pair
   */
  async getReserves(
    tokenA: string,
    tokenB: string
  ): Promise<{
    reserves: { token0: string; token1: string }
    dex: string
    pairAddress: string
    timestamp: number
    price: number
    tokenIndices: {
      token0Index: number
      token1Index: number
    }
  } | null> {
    try {
      // Get token indices from metadata (no blockchain call needed)
      const [tokenAIndex, tokenBIndex] = this.getTokenIndices(tokenA, tokenB)

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log(
          `Tokens not found in pool ${this.poolAddress}: ${tokenA}, ${tokenB}`
        )
        return null
      }

      // Get balances from vault (only dynamic data we need)
      const vault = new ethers.Contract(
        this.vaultAddress,
        CONTRACT_ABIS.BALANCER.VAULT,
        this.provider
      )
      const [tokens, balances] = await vault.getPoolTokens(this.metadata.poolId)

      // Get token decimals
      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      // Calculate price: reservesTokenB / reservesTokenA (in normalized values)
      const reservesTokenAinEth = this.convertWeiToNormal(
        BigInt(balances[tokenAIndex]),
        token0Info.decimals
      )
      const reservesTokenBinEth = this.convertWeiToNormal(
        BigInt(balances[tokenBIndex]),
        token1Info.decimals
      )
      const price = reservesTokenBinEth / reservesTokenAinEth

      console.log('Balancer reserves:', {
        token0: balances[tokenAIndex].toString(),
        token1: balances[tokenBIndex].toString(),
        price: price,
      })

      // Return reserves in the order they appear in the pool
      return {
        reserves: {
          token0: balances[tokenAIndex].toString(),
          token1: balances[tokenBIndex].toString(),
        },
        price: price,
        dex: `balancer-${this.poolAddress}`,
        pairAddress: this.metadata.poolId, // Use poolId from metadata
        timestamp: Date.now(),
        tokenIndices: {
          token0Index: tokenAIndex,
          token1Index: tokenBIndex,
        },
      }
    } catch (error) {
      console.error(
        `Error getting Balancer reserves for ${tokenA}/${tokenB}:`,
        error
      )
      return null
    }
  }

  /**
   * Get price for a token pair using Balancer's queryBatchSwap
   * This uses the actual swap calculation considering pool weights, fees, and AMM mechanics
   * @param amountIn - Amount of tokenA to use for price calculation (default: 1)
   */
  async getPrice(
    tokenA: string,
    tokenB: string,
    amountIn: number | string = 1
  ): Promise<{
    price: string;
    dex: string;
    timestamp: number;
    tokenIndices: {
      token0Index: number
      token1Index: number
    }
  } | null> {
    try {
      // Get token indices from metadata (no blockchain call needed)
      const [tokenAIndex, tokenBIndex] = this.getTokenIndices(tokenA, tokenB)

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log(
          `Tokens not found in pool ${this.poolAddress}: ${tokenA}, ${tokenB}`
        )
        return null
      }

      // Get token decimals
      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      // Normalize amountIn to proper decimals for tokenA
      const amountInNormalized = DecimalUtils.normalizeAmount(String(amountIn), token0Info.decimals)

      // Create vault contract
      const vault = new ethers.Contract(
        this.vaultAddress,
        CONTRACT_ABIS.BALANCER.VAULT,
        this.provider
      )

      // Assets array must contain all pool tokens in the order they appear in the pool
      // This is required for Balancer's queryBatchSwap to work correctly
      const assets = this.metadata.tokens

      // Set up funds struct (not used for query, but required)
      const funds = {
        sender: ethers.ZeroAddress,
        fromInternalBalance: false,
        recipient: ethers.ZeroAddress,
        toInternalBalance: false,
      }

      // Set up swap struct for queryBatchSwap
      // Note: indices reference positions in the assets array (all pool tokens)
      const swaps = [
        {
          poolId: this.metadata.poolId,
          assetInIndex: tokenAIndex,
          assetOutIndex: tokenBIndex,
          amount: amountInNormalized.toString(),
          userData: '0x',
        },
      ]

      // Encode the function call data
      const data = vault.interface.encodeFunctionData('queryBatchSwap', [
        0, // SwapKind.GIVEN_IN
        swaps,
        assets,
        funds,
      ])

      // Use provider.call() to make a static call instead of sending a transaction
      const result = await this.provider.call({
        to: this.vaultAddress,
        data,
      })

      // Decode the result
      const deltas = vault.interface.decodeFunctionResult('queryBatchSwap', result)[0]

      // deltas array corresponds to the assets array indices
      // The delta at tokenAIndex should be positive (amount in)
      // The delta at tokenBIndex should be negative (amount out)
      if (deltas.length < tokenBIndex + 1 || deltas[tokenBIndex] >= 0n) {
        console.log(`No valid quote from Balancer pool ${this.poolAddress}`)
        return null
      }

      // Negate the delta to get positive amount out (as shown in dummy implementation)
      // deltas[tokenBIndex] will be negative, so multiply by -1 to get positive
      const amountOut = BigInt(deltas[tokenBIndex]) * BigInt(-1)

      // Calculate price using the quote
      const price = DecimalUtils.calculatePrice(
        amountInNormalized,
        amountOut,
        token0Info.decimals,
        token1Info.decimals
      )

      return {
        price,
        dex: `balancer-${this.poolAddress}`,
        timestamp: Date.now(),
        tokenIndices: {
          token0Index: tokenAIndex,
          token1Index: tokenBIndex,
        },
      }
    } catch (error) {
      console.error(
        `Error getting Balancer price for ${tokenA}/${tokenB}:`,
        error
      )
      return null
    }
  }

  /**
   * Check if a pool contains both tokens using metadata
   */
  hasTokens(tokenA: string, tokenB: string): boolean {
    const tokens = this.metadata.tokens.map((t) => t.toLowerCase())

    const hasTokenA = tokens.some(
      (token) => token === tokenA.toLowerCase()
    )
    const hasTokenB = tokens.some(
      (token) => token === tokenB.toLowerCase()
    )

    return hasTokenA && hasTokenB
  }
}
