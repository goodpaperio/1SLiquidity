import { ethers } from 'ethers'
import {
  UniswapV2Service,
  UniswapV3Service,
  SushiSwapService,
  CurveService,
  BalancerService,
} from '../dex'
import { ReserveResult } from '../types/reserves'
import { TokenInfo } from '../types/token'
import { TokenService } from './token-service'
import { CONTRACT_ADDRESSES } from '../config/dex'
import { CurvePoolFilter, createCurvePoolFilter } from './curve-pool-filter'
import {
  BalancerPoolFilter,
  createBalancerPoolFilter,
} from './balancer-pool-filter'

export type DexType =
  | 'uniswap-v2'
  | 'uniswap-v3-500'
  | 'uniswap-v3-3000'
  | 'uniswap-v3-10000'
  | 'sushiswap'
  | 'curve'
  | 'balancer'

export class ReservesAggregator {
  private uniswapV2: UniswapV2Service
  private uniswapV3_500: UniswapV3Service
  private uniswapV3_3000: UniswapV3Service
  private uniswapV3_10000: UniswapV3Service
  private sushiswap: SushiSwapService
  private curveServices: Map<string, CurveService>
  private curvePoolFilter: CurvePoolFilter | null = null
  private balancerServices: Map<string, BalancerService>
  private balancerPoolFilter: BalancerPoolFilter | null = null
  private tokenService: TokenService
  private provider: ethers.Provider

  constructor(provider: ethers.Provider) {
    this.provider = provider
    this.uniswapV2 = new UniswapV2Service(provider)
    this.uniswapV3_500 = new UniswapV3Service(provider)
    this.uniswapV3_3000 = new UniswapV3Service(provider)
    this.uniswapV3_10000 = new UniswapV3Service(provider)
    this.sushiswap = new SushiSwapService(provider)
    this.curveServices = new Map()
    this.balancerServices = new Map()
    this.tokenService = TokenService.getInstance(provider)

    // Balancer and Curve services will be initialized dynamically when pool filters are set up
  }

  /**
   * Initialize Curve pool filter with metadata
   * Call this after loading CURVE_POOL_METADATA
   */
  initializeCurvePoolFilter(poolMetadata: Record<string, any>) {
    this.curvePoolFilter = createCurvePoolFilter(poolMetadata)

    // Initialize Curve services for all pools in metadata
    Object.keys(poolMetadata).forEach((poolAddress) => {
      this.curveServices.set(
        poolAddress,
        new CurveService(this.provider, poolAddress)
      )
    })

    console.log(
      `Initialized ${Object.keys(poolMetadata).length} Curve services`
    )
  }

  /**
   * Initialize Balancer pool filter with metadata
   * Call this after loading BALANCER_POOL_METADATA
   */
  initializeBalancerPoolFilter(poolMetadata: Record<string, any>) {
    this.balancerPoolFilter = createBalancerPoolFilter(poolMetadata)

    // Initialize Balancer services for all pools in metadata
    Object.keys(poolMetadata).forEach((poolAddress) => {
      this.balancerServices.set(
        poolAddress,
        new BalancerService(this.provider, poolAddress)
      )
    })

    console.log(
      `Initialized ${Object.keys(poolMetadata).length} Balancer services`
    )
  }

  // Helper method for fetching with retries
  private async fetchWithRetry(
    fetchFn: () => Promise<ReserveResult | null>,
    name: string,
    maxRetries = 1, // Reduced from 2 to 1
    delay = 2000 // Increased from 1000 to 2000
  ): Promise<ReserveResult | null> {
    let retries = 0
    const startTime = Date.now()

    while (retries <= maxRetries) {
      try {
        const attemptStartTime = Date.now()
        console.log(
          `${name} - Attempt ${retries + 1}/${maxRetries + 1} starting...`
        )

        // Longer timeout since we're making fewer calls
        const result = await Promise.race([
          fetchFn(),
          new Promise<ReserveResult | null>((_, reject) =>
            setTimeout(
              () => reject(new Error(`${name} call timeout after 20s`)),
              20000
            )
          ),
        ])

        const attemptEndTime = Date.now()
        console.log(
          `${name} - Attempt ${retries + 1} completed in ${attemptEndTime - attemptStartTime
          }ms`
        )

        if (result === null) {
          console.log(`${name} returned null (no pool found)`)
        } else {
          console.log(
            `${name} successful after ${retries + 1} attempts, total time: ${attemptEndTime - startTime
            }ms`
          )
        }
        return result
      } catch (error) {
        const attemptEndTime = Date.now()
        console.error(
          `${name} fetch error (attempt ${retries + 1}/${maxRetries + 1
          }) after ${attemptEndTime - startTime}ms:`,
          error instanceof Error ? error.message : error
        )

        if (retries === maxRetries) {
          const totalTime = Date.now() - startTime
          console.error(
            `Failed to fetch ${name} after ${maxRetries + 1
            } attempts, total time: ${totalTime}ms`
          )
          return null // Return null instead of throwing to continue with other DEXes
        }

        console.log(
          `Retrying ${name} fetch (${retries + 1
          }/${maxRetries}) after ${delay}ms delay...`
        )
        retries++
        // Shorter delay between retries
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    return null
  }

  private normalizeTo18Decimals(value: bigint, fromDecimals: number): bigint {
    if (fromDecimals === 18) return value
    if (fromDecimals > 18) {
      return value / BigInt(10n ** BigInt(fromDecimals - 18))
    }
    return value * BigInt(10n ** BigInt(18 - fromDecimals))
  }

  private calculateGeometricMean(
    reserves: { token0: string; token1: string },
    decimals: { token0: number; token1: number }
  ): bigint {
    // Convert reserves to BigInt
    const reserve0 = BigInt(reserves.token0)
    const reserve1 = BigInt(reserves.token1)

    const normalizedReserve0 = this.normalizeTo18Decimals(
      reserve0,
      decimals.token0
    )
    const normalizedReserve1 = this.normalizeTo18Decimals(
      reserve1,
      decimals.token1
    )

    // Calculate geometric mean
    // sqrt(a * b) = sqrt(a) * sqrt(b)
    const sqrtReserve0 = this.sqrt(normalizedReserve0)
    const sqrtReserve1 = this.sqrt(normalizedReserve1)

    return sqrtReserve0 * sqrtReserve1
  }

  private sqrt(value: bigint): bigint {
    if (value < 0n)
      throw new Error('Cannot calculate square root of negative number')
    if (value < 2n) return value

    let x = value
    let y = (x + 1n) / 2n
    while (y < x) {
      x = y
      y = (x + value / x) / 2n
    }
    return x
  }

  async getReservesFromDex(
    tokenA: string,
    tokenB: string,
    dex: DexType
  ): Promise<ReserveResult | null> {
    // Get token decimals
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB),
    ])

    let reserves: ReserveResult | null = null

    switch (dex) {
      case 'uniswap-v2':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV2.getReserves(tokenA, tokenB),
          'Uniswap V2'
        )
        break
      case 'uniswap-v3-500':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
          'Uniswap V3 (500)'
        )
        break
      case 'uniswap-v3-3000':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
          'Uniswap V3 (3000)'
        )
        break
      case 'uniswap-v3-10000':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
          'Uniswap V3 (10000)'
        )
        break
      case 'sushiswap':
        reserves = await this.fetchWithRetry(
          () => this.sushiswap.getReserves(tokenA, tokenB),
          'SushiSwap'
        )
        break
      case 'curve':
        if (this.curvePoolFilter) {
          // Use smart filtering to find the best Curve pool
          const candidatePools = this.curvePoolFilter.findBestPools(
            tokenA,
            tokenB,
            1
          )
          if (candidatePools.length === 0) {
            console.log(`No suitable Curve pools found for ${tokenA}/${tokenB}`)
            return null
          }

          const bestPoolAddress = candidatePools[0]
          const curveService = this.curveServices.get(bestPoolAddress)
          if (!curveService) {
            console.log(`Curve service not found for pool ${bestPoolAddress}`)
            return null
          }

          reserves = await this.fetchWithRetry(
            () => curveService.getReserves(tokenA, tokenB),
            `Curve ${bestPoolAddress}`
          )

          if (reserves) {
            reserves.dex = `curve-${bestPoolAddress}`
          }
        } else {
          console.log(
            'Curve pool filter not initialized - skipping Curve pools'
          )
          return null
        }
        break
      case 'balancer':
        if (this.balancerPoolFilter) {
          // Use smart filtering to find the best Balancer pool
          const candidatePools = await this.balancerPoolFilter.findBestPools(
            tokenA,
            tokenB,
            1
          )
          if (candidatePools.length === 0) {
            console.log(
              `No suitable Balancer pools found for ${tokenA}/${tokenB}`
            )
            return null
          }

          const bestPoolAddress = candidatePools[0]
          const balancerService = this.balancerServices.get(bestPoolAddress)
          if (!balancerService) {
            console.log(
              `Balancer service not found for pool ${bestPoolAddress}`
            )
            return null
          }

          const balancerResult = await balancerService.getReserves(
            tokenA,
            tokenB
          )
          if (balancerResult) {
            reserves = {
              dex: balancerResult.dex,
              pairAddress: balancerResult.pairAddress,
              reserves: balancerResult.reserves,
              decimals: {
                token0: token0Info.decimals,
                token1: token1Info.decimals,
              },
              price: 0,
              timestamp: balancerResult.timestamp,
            }
          }
        } else {
          console.log(
            'Balancer pool filter not initialized - skipping Balancer pools'
          )
          return null
        }
        break
      default:
        throw new Error(`Unsupported DEX type: ${dex}`)
    }

    if (reserves) {
      // Add decimals information to the result
      return {
        ...reserves,
        decimals: {
          token0: token0Info.decimals,
          token1: token1Info.decimals,
        },
      }
    }

    return null
  }

  async getAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    return new Promise((resolve, reject) => {
      // Set a timeout to ensure we respond before Lambda times out
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout: Operation took too long'))
      }, 80000) // 80 seconds to allow Lambda to respond cleanly (API Gateway limit is 89s)

      // Attempt to fetch reserves
      this._fetchAllReserves(tokenA, tokenB)
        .then((result) => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  // private async _fetchAllReservesOld(
  //   tokenA: string,
  //   tokenB: string
  // ): Promise<ReserveResult | null> {
  //   const startTime = Date.now()
  //   console.log(
  //     `Starting reserves fetch for ${tokenA}-${tokenB} at ${new Date().toISOString()}`
  //   )

  //   // Get token decimals
  //   const tokenStartTime = Date.now()
  //   const [token0Info, token1Info] = await Promise.all([
  //     this.tokenService.getTokenInfo(tokenA),
  //     this.tokenService.getTokenInfo(tokenB),
  //   ])
  //   const tokenEndTime = Date.now()
  //   console.log(`Token info fetch took ${tokenEndTime - tokenStartTime}ms`)

  //   const results: { result: ReserveResult; meanReserves: bigint }[] = []

  //   // Fetch from only Uniswap V2 and SushiSwap in parallel
  //   console.log('Fetching Uniswap V2 and SushiSwap reserves in parallel...')
  //   const dexFetchStartTime = Date.now()

  //   // const [
  //   //   uniswapV3_500Reserves,
  //   //   uniswapV3_3000Reserves,
  //   //   uniswapV3_10000Reserves,
  //   //   uniswapV2Reserves,
  //   //   sushiswapReserves,
  //   // ] = await Promise.allSettled([
  //   //   this.fetchWithRetry(
  //   //     () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
  //   //     'Uniswap V3 (500)'
  //   //   ),
  //   //   this.fetchWithRetry(
  //   //     () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
  //   //     'Uniswap V3 (3000)'
  //   //   ),
  //   //   this.fetchWithRetry(
  //   //     () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
  //   //     'Uniswap V3 (10000)'
  //   //   ),
  //   //   this.fetchWithRetry(
  //   //     () => this.uniswapV2.getReserves(tokenA, tokenB),
  //   //     'Uniswap V2'
  //   //   ),
  //   //   this.fetchWithRetry(
  //   //     () => this.sushiswap.getReserves(tokenA, tokenB),
  //   //     'SushiSwap'
  //   //   ),
  //   // ])

  //   const [uniswapV2Reserves, sushiswapReserves] = await Promise.allSettled([
  //     this.fetchWithRetry(
  //       () => this.uniswapV2.getReserves(tokenA, tokenB),
  //       'Uniswap V2'
  //     ),
  //     this.fetchWithRetry(
  //       () => this.sushiswap.getReserves(tokenA, tokenB),
  //       'SushiSwap'
  //     ),
  //   ])

  //   const dexFetchEndTime = Date.now()
  //   console.log(`All DEX fetches took ${dexFetchEndTime - dexFetchStartTime}ms`)

  //   // Process results and calculate totals
  //   let totalReserveTokenA = 0n
  //   let totalReserveTokenB = 0n

  //   const processResults = (
  //     result: PromiseSettledResult<ReserveResult | null>,
  //     dexName: string
  //   ) => {
  //     if (result.status === 'fulfilled' && result.value) {
  //       const meanReserves = this.calculateGeometricMean(
  //         result.value.reserves,
  //         { token0: token0Info.decimals, token1: token1Info.decimals }
  //       )
  //       console.log(
  //         `${dexName} success - Mean reserves: ${meanReserves.toString()}`
  //       )
  //       results.push({
  //         result: result.value,
  //         meanReserves,
  //       })

  //       // Add to total reserves
  //       totalReserveTokenA += BigInt(result.value.reserves.token0)
  //       totalReserveTokenB += BigInt(result.value.reserves.token1)
  //     } else {
  //       console.log(`${dexName} failed or returned null`)
  //     }
  //   }

  //   // processResults(uniswapV3_500Reserves, 'Uniswap V3 (500)')
  //   // processResults(uniswapV3_3000Reserves, 'Uniswap V3 (3000)')
  //   // processResults(uniswapV3_10000Reserves, 'Uniswap V3 (10000)')
  //   processResults(uniswapV2Reserves, 'Uniswap V2')
  //   processResults(sushiswapReserves, 'SushiSwap')

  //   const totalTime = Date.now() - startTime
  //   console.log(`Total fetch operation took ${totalTime}ms`)

  //   // Add short delay before making more calls to avoid rate limits
  //   await new Promise((resolve) => setTimeout(resolve, 500))

  //   // Try Curve pools for the token pair with smart filtering
  //   console.log('Fetching Curve reserves...')
  //   if (this.curvePoolFilter) {
  //     // Use smart filtering to find relevant pools
  //     const candidatePools = this.curvePoolFilter.findBestPools(
  //       tokenA,
  //       tokenB,
  //       5
  //     )
  //     console.log(
  //       `Found ${candidatePools.length} candidate Curve pools for ${tokenA}/${tokenB}`
  //     )

  //     for (const poolAddress of candidatePools) {
  //       const curveService = this.curveServices.get(poolAddress)
  //       if (!curveService) continue

  //       try {
  //         const curveReserves = await this.fetchWithRetry(
  //           () => curveService.getReserves(tokenA, tokenB),
  //           `Curve ${poolAddress}`
  //         )
  //         if (curveReserves) {
  //           const meanReserves = this.calculateGeometricMean(
  //             curveReserves.reserves,
  //             { token0: token0Info.decimals, token1: token1Info.decimals }
  //           )
  //           console.log(
  //             `Curve ${poolAddress} meanReserves:`,
  //             meanReserves.toString()
  //           )
  //           // Update the dex name to include pool address
  //           curveReserves.dex = `curve-${poolAddress}`
  //           results.push({
  //             result: curveReserves,
  //             meanReserves: meanReserves,
  //           })
  //         }
  //       } catch (error) {
  //         console.log(`Curve ${poolAddress} reserves fetch failed:`, error)
  //       }
  //     }
  //   } else {
  //     console.log('Curve pool filter not initialized - skipping Curve pools')
  //   }

  //   // Add short delay before making more calls to avoid rate limits
  //   await new Promise((resolve) => setTimeout(resolve, 500))

  //   // Try Balancer pools for the token pair with smart filtering
  //   console.log('Fetching Balancer reserves...')
  //   if (this.balancerPoolFilter) {
  //     // Use smart filtering to find relevant pools
  //     const candidatePools = await this.balancerPoolFilter.findBestPools(
  //       tokenA,
  //       tokenB,
  //       5
  //     )
  //     console.log(
  //       `Found ${candidatePools.length} candidate Balancer pools for ${tokenA}/${tokenB}`
  //     )

  //     for (const poolAddress of candidatePools) {
  //       const balancerService = this.balancerServices.get(poolAddress)
  //       if (!balancerService) continue

  //       try {
  //         const balancerResult = await balancerService.getReserves(
  //           tokenA,
  //           tokenB
  //         )
  //         if (balancerResult) {
  //           const balancerReserves = {
  //             dex: balancerResult.dex,
  //             pairAddress: balancerResult.pairAddress,
  //             reserves: balancerResult.reserves,
  //             decimals: {
  //               token0: token0Info.decimals,
  //               token1: token1Info.decimals,
  //             },
  //             timestamp: balancerResult.timestamp,
  //           }
  //           const meanReserves = this.calculateGeometricMean(
  //             balancerReserves.reserves,
  //             { token0: token0Info.decimals, token1: token1Info.decimals }
  //           )
  //           // console.log(`Balancer ${poolAddress} meanReserves:`, meanReserves.toString());
  //           results.push({
  //             result: balancerReserves,
  //             meanReserves: meanReserves,
  //           })
  //         }
  //       } catch (error) {
  //         console.log(`Balancer ${poolAddress} reserves fetch failed:`, error)
  //       }
  //     }
  //   } else {
  //     console.log(
  //       'Balancer pool filter not initialized - skipping Balancer pools'
  //     )
  //   }

  //   if (results.length === 0) {
  //     console.log('No valid reserves found from any DEX')
  //     return null
  //   }

  //   // Find the result with highest liquidity
  //   const deepestPool = results.reduce((prev, current) => {
  //     return current.meanReserves > prev.meanReserves ? current : prev
  //   })

  //   console.log('Selected deepest pool with liquidity:', deepestPool.result)
  //   console.log('Total reserves across all DEXes:', {
  //     totalReserveTokenA: totalReserveTokenA.toString(),
  //     totalReserveTokenB: totalReserveTokenB.toString(),
  //   })
  //   console.log(
  //     `Complete reserves fetch for ${tokenA}-${tokenB} took ${totalTime}ms`
  //   )

  //   return {
  //     ...deepestPool.result,
  //     decimals: {
  //       token0: token0Info.decimals,
  //       token1: token1Info.decimals,
  //     },
  //     totalReserves: {
  //       // Wei values (original)
  //       totalReserveTokenAWei: totalReserveTokenA.toString(),
  //       totalReserveTokenBWei: totalReserveTokenB.toString(),
  //       // Normal values (converted)
  //       totalReserveTokenA: this.convertWeiToNormal(
  //         totalReserveTokenA,
  //         token0Info.decimals
  //       ),
  //       totalReserveTokenB: this.convertWeiToNormal(
  //         totalReserveTokenB,
  //         token1Info.decimals
  //       ),
  //     },
  //   }
  // }

  private async _fetchAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    const startTime = Date.now()
    console.log(
      `Starting reserves fetch for ${tokenA}-${tokenB} at ${new Date().toISOString()}`
    )

    // Get token decimals
    const tokenStartTime = Date.now()
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB),
    ])
    const tokenEndTime = Date.now()
    console.log(`Token info fetch took ${tokenEndTime - tokenStartTime}ms`)

    const results: { result: ReserveResult; meanReserves: bigint }[] = []

    // Fetch from Uniswap V2, V3, and SushiSwap in parallel
    console.log('Fetching Uniswap V2, V3, and SushiSwap reserves in parallel...')
    const dexFetchStartTime = Date.now()

    const [
      uniswapV3_500Reserves,
      uniswapV3_3000Reserves,
      uniswapV3_10000Reserves,
      uniswapV2Reserves,
      sushiswapReserves,
    ] = await Promise.allSettled([
      this.fetchWithRetry(
        () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
        'Uniswap V3 (500)'
      ),
      this.fetchWithRetry(
        () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
        'Uniswap V3 (3000)'
      ),
      this.fetchWithRetry(
        () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
        'Uniswap V3 (10000)'
      ),
      this.fetchWithRetry(
        () => this.uniswapV2.getReserves(tokenA, tokenB),
        'Uniswap V2'
      ),
      this.fetchWithRetry(
        () => this.sushiswap.getReserves(tokenA, tokenB),
        'SushiSwap'
      ),
    ])

    const dexFetchEndTime = Date.now()
    console.log(`All DEX fetches took ${dexFetchEndTime - dexFetchStartTime}ms`)

    // Process results and calculate totals
    let totalReserveTokenA = 0n
    let totalReserveTokenB = 0n

    const processResults = (
      result: PromiseSettledResult<ReserveResult | null>,
      dexName: string
    ) => {
      if (result.status === 'fulfilled' && result.value) {
        const meanReserves = this.calculateGeometricMean(
          result.value.reserves,
          { token0: token0Info.decimals, token1: token1Info.decimals }
        )
        console.log(
          `${dexName} success - Mean reserves: ${meanReserves.toString()}`
        )

        // Add decimals to the result
        const resultWithDecimals = {
          ...result.value,
          decimals: {
            token0: token0Info.decimals,
            token1: token1Info.decimals,
          },
        }

        results.push({
          result: resultWithDecimals,
          meanReserves,
        })

        // Add to total reserves
        totalReserveTokenA += BigInt(result.value.reserves.token0)
        totalReserveTokenB += BigInt(result.value.reserves.token1)
      } else {
        console.log(`${dexName} failed or returned null`)
      }
    }

    processResults(uniswapV3_500Reserves, 'Uniswap V3 (500)')
    processResults(uniswapV3_3000Reserves, 'Uniswap V3 (3000)')
    processResults(uniswapV3_10000Reserves, 'Uniswap V3 (10000)')
    processResults(uniswapV2Reserves, 'Uniswap V2')
    processResults(sushiswapReserves, 'SushiSwap')

    const totalTime = Date.now() - startTime
    console.log(`Total fetch operation took ${totalTime}ms`)

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Try Curve pools for the token pair with smart filtering
    console.log('Fetching Curve reserves...')
    if (this.curvePoolFilter) {
      // Use smart filtering to find relevant pools
      const candidatePools = this.curvePoolFilter.findBestPools(
        tokenA,
        tokenB,
        5
      )
      console.log(
        `Found ${candidatePools.length} candidate Curve pools for ${tokenA}/${tokenB}`
      )

      for (const poolAddress of candidatePools) {
        const curveService = this.curveServices.get(poolAddress)
        if (!curveService) continue

        try {
          const curveReserves = await this.fetchWithRetry(
            () => curveService.getReserves(tokenA, tokenB),
            `Curve ${poolAddress}`
          )
          if (curveReserves) {
            const meanReserves = this.calculateGeometricMean(
              curveReserves.reserves,
              { token0: token0Info.decimals, token1: token1Info.decimals }
            )
            console.log(
              `Curve ${poolAddress} meanReserves:`,
              meanReserves.toString()
            )
            // Update the dex name to include pool address
            curveReserves.dex = `curve-${poolAddress}`

            // Add decimals to the result
            const resultWithDecimals = {
              ...curveReserves,
              decimals: {
                token0: token0Info.decimals,
                token1: token1Info.decimals,
              },
            }

            results.push({
              result: resultWithDecimals,
              meanReserves: meanReserves,
            })

            // Add to total reserves
            totalReserveTokenA += BigInt(curveReserves.reserves.token0)
            totalReserveTokenB += BigInt(curveReserves.reserves.token1)
          }
        } catch (error) {
          console.log(`Curve ${poolAddress} reserves fetch failed:`, error)
        }
      }
    } else {
      console.log('Curve pool filter not initialized - skipping Curve pools')
    }

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Try Balancer pools for the token pair with smart filtering
    console.log('Fetching Balancer reserves...')
    if (this.balancerPoolFilter) {
      // Use smart filtering to find relevant pools
      const candidatePools = await this.balancerPoolFilter.findBestPools(
        tokenA,
        tokenB,
        5
      )
      console.log(
        `Found ${candidatePools.length} candidate Balancer pools for ${tokenA}/${tokenB}`
      )

      for (const poolAddress of candidatePools) {
        const balancerService = this.balancerServices.get(poolAddress)
        if (!balancerService) continue

        try {
          const balancerResult = await balancerService.getReserves(
            tokenA,
            tokenB
          )
          if (balancerResult) {
            const balancerReserves = {
              dex: balancerResult.dex,
              pairAddress: balancerResult.pairAddress,
              reserves: balancerResult.reserves,
              decimals: {
                token0: token0Info.decimals,
                token1: token1Info.decimals,
              },
              price: 0,
              timestamp: balancerResult.timestamp,
            }
            const meanReserves = this.calculateGeometricMean(
              balancerReserves.reserves,
              { token0: token0Info.decimals, token1: token1Info.decimals }
            )

            results.push({
              result: balancerReserves,
              meanReserves: meanReserves,
            })

            // Add to total reserves
            totalReserveTokenA += BigInt(balancerResult.reserves.token0)
            totalReserveTokenB += BigInt(balancerResult.reserves.token1)
          }
        } catch (error) {
          console.log(`Balancer ${poolAddress} reserves fetch failed:`, error)
        }
      }
    } else {
      console.log(
        'Balancer pool filter not initialized - skipping Balancer pools'
      )
    }

    if (results.length === 0) {
      console.log('No valid reserves found from any DEX')
      return null
    }

    // Find the result with highest liquidity
    const deepestPool = results.reduce((prev, current) => {
      return current.meanReserves > prev.meanReserves ? current : prev
    })

    // Create otherDexes array with all results except the deepest pool
    const otherDexes = results
      .filter(
        (r) =>
          r.result.dex !== deepestPool.result.dex ||
          r.result.pairAddress !== deepestPool.result.pairAddress
      )
      .map((r) => r.result)

    console.log('Selected deepest pool with liquidity:', deepestPool.result)
    console.log('Total reserves across all DEXes:', {
      totalReserveTokenA: totalReserveTokenA.toString(),
      totalReserveTokenB: totalReserveTokenB.toString(),
    })
    console.log(
      `Complete reserves fetch for ${tokenA}-${tokenB} took ${totalTime}ms`
    )

    return {
      ...deepestPool.result,
      decimals: {
        token0: token0Info.decimals,
        token1: token1Info.decimals,
      },
      totalReserves: {
        // Wei values (original)
        totalReserveTokenAWei: totalReserveTokenA.toString(),
        totalReserveTokenBWei: totalReserveTokenB.toString(),
        // Normal values (converted)
        totalReserveTokenA: this.convertWeiToNormal(
          totalReserveTokenA,
          token0Info.decimals
        ),
        totalReserveTokenB: this.convertWeiToNormal(
          totalReserveTokenB,
          token1Info.decimals
        ),
      },
      otherDexes: otherDexes,
    }
  }

  // Helper function to convert Wei to normal value
  private convertWeiToNormal(weiValue: bigint, decimals: number): string {
    const divisor = BigInt(10 ** decimals)
    const wholePart = weiValue / divisor
    const fractionalPart = weiValue % divisor

    if (fractionalPart === 0n) {
      return wholePart.toString()
    }

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    const trimmedFractional = fractionalStr.replace(/0+$/, '')

    return trimmedFractional
      ? `${wholePart}.${trimmedFractional}`
      : wholePart.toString()
  }
}
