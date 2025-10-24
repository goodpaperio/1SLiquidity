import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()
export default class DatabaseService {
  private static instance: DatabaseService
  private prisma: PrismaClient | null = null

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  // Getter for prisma client
  public get client(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.prisma
  }

  public async connect(): Promise<void> {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      })

      try {
        await this.prisma.$connect()
        console.log('✅ Database connected successfully')
      } catch (error) {
        console.error('❌ Failed to connect to database:', error)
        throw error
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect()
      this.prisma = null
      console.log('🔌 Database disconnected')
    }
  }

  /**
   * Upsert a single liquidity data record
   * Updates if exists (based on tokenAAddress + tokenBAddress), creates if doesn't exist
   */
  public async upsertLiquidityData(data: any): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database not connected')
    }

    try {
      await this.prisma.liquidityData.upsert({
        where: {
          tokenAAddress_tokenBAddress: {
            tokenAAddress: data.tokenAAddress.toLowerCase(),
            tokenBAddress: data.tokenBAddress.toLowerCase(),
          },
        },
        update: {
          timestamp: data.timestamp,
          tokenASymbol: data.tokenASymbol.toLowerCase(),
          tokenAName: data.tokenAName,
          tokenADecimals: data.tokenADecimals,
          tokenBSymbol: data.tokenBSymbol.toLowerCase(),
          tokenBDecimals: data.tokenBDecimals,
          marketCap: data.marketCap,

          // DEX reserves
          reservesAUniswapV2: data.reservesAUniswapV2,
          reservesBUniswapV2: data.reservesBUniswapV2,
          reservesASushiswap: data.reservesASushiswap,
          reservesBSushiswap: data.reservesBSushiswap,
          reservesAUniswapV3_500: data.reservesAUniswapV3_500,
          reservesBUniswapV3_500: data.reservesBUniswapV3_500,
          reservesAUniswapV3_3000: data.reservesAUniswapV3_3000,
          reservesBUniswapV3_3000: data.reservesBUniswapV3_3000,
          reservesAUniswapV3_10000: data.reservesAUniswapV3_10000,
          reservesBUniswapV3_10000: data.reservesBUniswapV3_10000,
          reservesABalancer: data.reservesABalancer,
          reservesBBalancer: data.reservesBBalancer,
          reservesACurve: data.reservesACurve,
          reservesBCurve: data.reservesBCurve,

          // Total depth fields
          reserveAtotaldepthWei: data.reserveAtotaldepthWei,
          reserveAtotaldepth: data.reserveAtotaldepth,
          reserveBtotaldepthWei: data.reserveBtotaldepthWei,
          reserveBtotaldepth: data.reserveBtotaldepth,

          updatedAt: new Date(),
        },
        create: {
          timestamp: data.timestamp,
          tokenAAddress: data.tokenAAddress.toLowerCase(),
          tokenASymbol: data.tokenASymbol.toLowerCase(),
          tokenAName: data.tokenAName,
          tokenADecimals: data.tokenADecimals,
          tokenBAddress: data.tokenBAddress.toLowerCase(),
          tokenBSymbol: data.tokenBSymbol.toLowerCase(),
          tokenBDecimals: data.tokenBDecimals,
          marketCap: data.marketCap,

          // DEX reserves
          reservesAUniswapV2: data.reservesAUniswapV2,
          reservesBUniswapV2: data.reservesBUniswapV2,
          reservesASushiswap: data.reservesASushiswap,
          reservesBSushiswap: data.reservesBSushiswap,
          reservesAUniswapV3_500: data.reservesAUniswapV3_500,
          reservesBUniswapV3_500: data.reservesBUniswapV3_500,
          reservesAUniswapV3_3000: data.reservesAUniswapV3_3000,
          reservesBUniswapV3_3000: data.reservesBUniswapV3_3000,
          reservesAUniswapV3_10000: data.reservesAUniswapV3_10000,
          reservesBUniswapV3_10000: data.reservesBUniswapV3_10000,
          reservesABalancer: data.reservesABalancer,
          reservesBBalancer: data.reservesBBalancer,
          reservesACurve: data.reservesACurve,
          reservesBCurve: data.reservesBCurve,

          // Total depth fields
          reserveAtotaldepthWei: data.reserveAtotaldepthWei,
          reserveAtotaldepth: data.reserveAtotaldepth,
          reserveBtotaldepthWei: data.reserveBtotaldepthWei,
          reserveBtotaldepth: data.reserveBtotaldepth,

          // Slippage savings
          slippageSavings: data.slippageSavings,
          percentageSavings: data.percentageSavings,

          // Price accuracy
          priceAccuracyDECA: data.priceAccuracyDECA,
          priceAccuracyNODECA: data.priceAccuracyNODECA,

          // Highest liquidity DEX
          highestLiquidityADex: data.highestLiquidityADex,
        },
      })
    } catch (error) {
      console.error('❌ Error upserting liquidity data:', error)
      throw error
    }
  }

  /**
   * Upsert multiple liquidity data records in batch
   * More efficient than individual upserts for large datasets
   */
  public async upsertBatchLiquidityData(dataArray: any[]): Promise<void> {
    if (!this.prisma) {
      throw new Error('Database not connected')
    }

    try {
      // Use transaction for batch operations to ensure data consistency
      await this.prisma.$transaction(
        async (tx: any) => {
          for (const data of dataArray) {
            await tx.liquidityData.upsert({
              where: {
                tokenAAddress_tokenBAddress: {
                  tokenAAddress: data.tokenAAddress.toLowerCase(),
                  tokenBAddress: data.tokenBAddress.toLowerCase(),
                },
              },
              update: {
                timestamp: data.timestamp,
                tokenASymbol: data.tokenASymbol.toLowerCase(),
                tokenAName: data.tokenAName,
                tokenADecimals: data.tokenADecimals,
                tokenBSymbol: data.tokenBSymbol.toLowerCase(),
                tokenBDecimals: data.tokenBDecimals,
                marketCap: data.marketCap,

                // DEX reserves
                reservesAUniswapV2: data.reservesAUniswapV2,
                reservesBUniswapV2: data.reservesBUniswapV2,
                reservesASushiswap: data.reservesASushiswap,
                reservesBSushiswap: data.reservesBSushiswap,
                reservesAUniswapV3_500: data.reservesAUniswapV3_500,
                reservesBUniswapV3_500: data.reservesBUniswapV3_500,
                reservesAUniswapV3_3000: data.reservesAUniswapV3_3000,
                reservesBUniswapV3_3000: data.reservesBUniswapV3_3000,
                reservesAUniswapV3_10000: data.reservesAUniswapV3_10000,
                reservesBUniswapV3_10000: data.reservesBUniswapV3_10000,
                reservesABalancer: data.reservesABalancer,
                reservesBBalancer: data.reservesBBalancer,
                reservesACurve: data.reservesACurve,
                reservesBCurve: data.reservesBCurve,

                // Total depth fields
                reserveAtotaldepthWei: data.reserveAtotaldepthWei,
                reserveAtotaldepth: data.reserveAtotaldepth,
                reserveBtotaldepthWei: data.reserveBtotaldepthWei,
                reserveBtotaldepth: data.reserveBtotaldepth,

                // Slippage savings
                slippageSavings: data.slippageSavings,
                percentageSavings: data.percentageSavings,

                // Price accuracy
                priceAccuracyDECA: data.priceAccuracyDECA,
                priceAccuracyNODECA: data.priceAccuracyNODECA,

                // Highest liquidity DEX
                highestLiquidityADex: data.highestLiquidityADex,

                updatedAt: new Date(),
              },
              create: {
                timestamp: data.timestamp,
                tokenAAddress: data.tokenAAddress.toLowerCase(),
                tokenASymbol: data.tokenASymbol.toLowerCase(),
                tokenAName: data.tokenAName,
                tokenADecimals: data.tokenADecimals,
                tokenBAddress: data.tokenBAddress.toLowerCase(),
                tokenBSymbol: data.tokenBSymbol.toLowerCase(),
                tokenBDecimals: data.tokenBDecimals,
                marketCap: data.marketCap,

                // DEX reserves
                reservesAUniswapV2: data.reservesAUniswapV2,
                reservesBUniswapV2: data.reservesBUniswapV2,
                reservesASushiswap: data.reservesASushiswap,
                reservesBSushiswap: data.reservesBSushiswap,
                reservesAUniswapV3_500: data.reservesAUniswapV3_500,
                reservesBUniswapV3_500: data.reservesBUniswapV3_500,
                reservesAUniswapV3_3000: data.reservesAUniswapV3_3000,
                reservesBUniswapV3_3000: data.reservesBUniswapV3_3000,
                reservesAUniswapV3_10000: data.reservesAUniswapV3_10000,
                reservesBUniswapV3_10000: data.reservesBUniswapV3_10000,
                reservesABalancer: data.reservesABalancer,
                reservesBBalancer: data.reservesBBalancer,
                reservesACurve: data.reservesACurve,
                reservesBCurve: data.reservesBCurve,

                // Total depth fields
                reserveAtotaldepthWei: data.reserveAtotaldepthWei,
                reserveAtotaldepth: data.reserveAtotaldepth,
                reserveBtotaldepthWei: data.reserveBtotaldepthWei,
                reserveBtotaldepth: data.reserveBtotaldepth,

                // Slippage savings
                slippageSavings: data.slippageSavings,
                percentageSavings: data.percentageSavings,

                // Price accuracy
                priceAccuracyDECA: data.priceAccuracyDECA,
                priceAccuracyNODECA: data.priceAccuracyNODECA,

                // Highest liquidity DEX
                highestLiquidityADex: data.highestLiquidityADex,
              },
            })
          }
        },
        {
          timeout: 60000, // 60 second timeout for large batches
        }
      )

      console.log(
        `✅ Successfully upserted ${dataArray.length} liquidity records`
      )
    } catch (error) {
      console.error('❌ Error upserting batch liquidity data:', error)
      throw error
    }
  }

  /**
   * Get liquidity data for a specific token pair
   */
  public async getLiquidityData(
    tokenAAddress: string,
    tokenBAddress: string
  ): Promise<any | null> {
    if (!this.prisma) {
      throw new Error('Database not connected')
    }

    console.log('tokenAAddress', tokenAAddress)
    console.log('tokenBAddress', tokenBAddress)
    try {
      return await this.prisma.liquidityData.findUnique({
        where: {
          tokenAAddress_tokenBAddress: {
            tokenAAddress: tokenAAddress.toLowerCase(),
            tokenBAddress: tokenBAddress.toLowerCase(),
          },
        },
      })
    } catch (error) {
      console.error('❌ Error getting liquidity data:', error)
      throw error
    }
  }

  /**
   * Get all liquidity data for a specific token (as token A or B)
   */
  public async getTokenLiquidityData(tokenAddress: string): Promise<any[]> {
    if (!this.prisma) {
      throw new Error('Database not connected')
    }

    try {
      return await this.prisma.liquidityData.findMany({
        where: {
          OR: [
            { tokenAAddress: tokenAddress.toLowerCase() },
            { tokenBAddress: tokenAddress.toLowerCase() },
          ],
        },
        orderBy: [
          { reserveAtotaldepth: 'desc' },
          { reserveBtotaldepth: 'desc' },
        ],
      })
    } catch (error) {
      console.error('❌ Error getting token liquidity data:', error)
      throw error
    }
  }

  /**
   * Get top tokens by total depth
   */
  public async getTopTokensByDepth(limit: number = 100): Promise<any[]> {
    if (!this.prisma) {
      throw new Error('Database not connected')
    }

    try {
      return await this.prisma.liquidityData.findMany({
        take: limit,
        orderBy: [{ reserveAtotaldepth: 'desc' }],
        where: {
          reserveAtotaldepth: {
            gt: 0,
          },
        },
      })
    } catch (error) {
      console.error('❌ Error getting top tokens by depth:', error)
      throw error
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<any> {
    if (!this.prisma) {
      throw new Error('Database not connected')
    }

    try {
      const [totalRecords, uniqueTokensA, uniqueTokensB, avgDepthA, avgDepthB] =
        await Promise.all([
          this.prisma.liquidityData.count(),
          this.prisma.liquidityData.groupBy({
            by: ['tokenAAddress'],
            _count: true,
          }),
          this.prisma.liquidityData.groupBy({
            by: ['tokenBAddress'],
            _count: true,
          }),
          this.prisma.liquidityData.aggregate({
            _avg: { reserveAtotaldepth: true },
            where: { reserveAtotaldepth: { gt: 0 } },
          }),
          this.prisma.liquidityData.aggregate({
            _avg: { reserveBtotaldepth: true },
            where: { reserveBtotaldepth: { gt: 0 } },
          }),
        ])

      return {
        totalRecords,
        uniqueTokensA: uniqueTokensA.length,
        uniqueTokensB: uniqueTokensB.length,
        averageDepthA: avgDepthA._avg.reserveAtotaldepth,
        averageDepthB: avgDepthB._avg.reserveBtotaldepth,
      }
    } catch (error) {
      console.error('❌ Error getting database stats:', error)
      throw error
    }
  }

  /**
   * Legacy method for backward compatibility - now uses upsert
   * @deprecated Use upsertBatchLiquidityData instead
   */
  public async saveBatchLiquidityData(dataArray: any[]): Promise<void> {
    console.warn(
      '⚠️  saveBatchLiquidityData is deprecated, using upsertBatchLiquidityData instead'
    )
    return this.upsertBatchLiquidityData(dataArray)
  }
}
