// src/api/server.ts
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import DatabaseService from '../services/database-service'
import { calculateVolumeMetrics } from '../functions/volume-metrics'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(helmet()) // Security headers
app.use(cors()) // Enable CORS
app.use(express.json()) // Parse JSON bodies

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
})
app.use('/api/', limiter)

// Database connection
let dbService: DatabaseService

// Error handler interface
interface ApiError extends Error {
  statusCode?: number
}

// Error handling middleware
const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', err)

  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  })
}

// Async wrapper to handle promise rejections
const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }

// Validation helpers
const validateEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

const validatePagination = (
  page: string | undefined,
  limit: string | undefined
) => {
  const pageNum = page ? parseInt(page) : 1
  const limitNum = limit ? parseInt(limit) : 20

  if (pageNum < 1 || pageNum > 1000) {
    throw { statusCode: 400, message: 'Page must be between 1 and 1000' }
  }

  if (limitNum < 1 || limitNum > 100) {
    throw { statusCode: 400, message: 'Limit must be between 1 and 100' }
  }

  return { page: pageNum, limit: limitNum }
}


// API Routes

// 1. Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Liquidity Data API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
})

// 2. Get all liquidity pairs with pagination
app.get(
  '/api/pairs',
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = validatePagination(
      req.query.page as string,
      req.query.limit as string
    )
    const sortBy = (req.query.sortBy as string) || 'reserveAtotaldepth'
    const sortOrder = (req.query.sortOrder as string) || 'desc'
    const minDepth = req.query.minDepth
      ? parseFloat(req.query.minDepth as string)
      : 0

    // Validate sort parameters
    const validSortFields = [
      'reserveAtotaldepth',
      'reserveBtotaldepth',
      'marketCap',
      'timestamp',
    ]
    if (!validSortFields.includes(sortBy)) {
      throw { statusCode: 400, message: 'Invalid sortBy field' }
    }

    if (!['asc', 'desc'].includes(sortOrder)) {
      throw { statusCode: 400, message: 'sortOrder must be asc or desc' }
    }

    const skip = (page - 1) * limit

    const [pairs, total] = await Promise.all([
      dbService.client.liquidityData.findMany({
        skip,
        take: limit,
        where: {
          reserveAtotaldepth: {
            gte: minDepth,
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      dbService.client.liquidityData.count({
        where: {
          reserveAtotaldepth: {
            gte: minDepth,
          },
        },
      }),
    ])

    res.json({
      success: true,
      data: pairs.map((t: any) => ({
        ...t,
        marketCap: t.marketCap ? t.marketCap.toString() : null,
      })),
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
      filters: {
        sortBy,
        sortOrder,
        minDepth,
      },
    })
  })
)

// 3. Get specific token pair data
app.get(
  '/api/pairs/:tokenA/:tokenB',
  asyncHandler(async (req: Request, res: Response) => {
    const { tokenA, tokenB } = req.params

    // Validate Ethereum addresses
    if (!validateEthereumAddress(tokenA) || !validateEthereumAddress(tokenB)) {
      throw { statusCode: 400, message: 'Invalid Ethereum address format' }
    }

    const pair = await dbService.getLiquidityData(tokenA, tokenB)

    if (!pair) {
      throw { statusCode: 404, message: 'Liquidity pair not found' }
    }

    res.json({
      success: true,
      data: {
        ...pair,
        marketCap: pair.marketCap ? pair.marketCap.toString() : null,
      },
    })
  })
)

// 4. Calculate sweet spot and slippage for custom volume
app.get(
  '/api/pairs/:tokenA/:tokenB/calculate',
  asyncHandler(async (req: Request, res: Response) => {
    const { tokenA, tokenB } = req.params
    const volume = req.query.volume as string

    // Validate Ethereum addresses
    if (!validateEthereumAddress(tokenA) || !validateEthereumAddress(tokenB)) {
      throw { statusCode: 400, message: 'Invalid Ethereum address format' }
    }

    // Validate volume
    if (!volume || isNaN(parseFloat(volume)) || parseFloat(volume) <= 0) {
      throw { statusCode: 400, message: 'Invalid volume. Must be a positive number.' }
    }

    // Get pair data from database
    const pair = await dbService.getLiquidityData(tokenA, tokenB)

    if (!pair) {
      throw { statusCode: 404, message: 'Liquidity pair not found' }
    }

    // Use helper function to calculate metrics
    const data = await calculateVolumeMetrics(pair, volume)

    res.json({
      success: true,
      data,
    })
  })
)

// 5. Get all pairs for a specific token
app.get(
  '/api/tokens/:address/pairs',
  asyncHandler(async (req: Request, res: Response) => {
    const { address } = req.params
    const { page, limit } = validatePagination(
      req.query.page as string,
      req.query.limit as string
    )

    if (!validateEthereumAddress(address)) {
      throw { statusCode: 400, message: 'Invalid Ethereum address format' }
    }

    const skip = (page - 1) * limit

    const [pairs, total] = await Promise.all([
      dbService.client.liquidityData.findMany({
        where: { tokenAAddress: address.toLowerCase() },
        // where: {
        //   OR: [
        //     { tokenAAddress: address.toLowerCase() },
        //     { tokenBAddress: address.toLowerCase() },
        //   ],
        // },
        skip,
        take: limit,
        // orderBy: [
        //   { reserveAtotaldepth: 'desc' },
        //   { reserveBtotaldepth: 'desc' },
        // ],
      }),
      dbService.client.liquidityData.count({
        where: { tokenAAddress: address.toLowerCase() },
      }),
      // dbService.client.liquidityData.count({
      //   where: {
      //     OR: [
      //       { tokenAAddress: address.toLowerCase() },
      //       { tokenBAddress: address.toLowerCase() },
      //     ],
      //   },
      // }),
    ])

    res.json({
      success: true,
      data: pairs.map((t: any) => ({
        ...t,
        marketCap: t.marketCap ? t.marketCap.toString() : null,
      })),
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
    })
  })
)

// 6. Get top tokens by liquidity depth
app.get(
  '/api/tokens/top',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1000
    const metric = (req.query.metric as string) || 'reserveAtotaldepth'

    if (limit < 1 || limit > 2000) {
      throw { statusCode: 400, message: 'Limit must be between 1 and 2000' }
    }

    const validMetrics = [
      'reserveAtotaldepth',
      'reserveBtotaldepth',
      'marketCap',
      'slippageSavings',
    ]

    if (!validMetrics.includes(metric)) {
      throw { statusCode: 400, message: 'Invalid metric' }
    }

    const topTokens = await dbService.client.liquidityData.findMany({
      take: limit,
      where: {
        [metric]: {
          gt: 0,
        },
      },
      orderBy: {
        [metric]: 'desc',
      },
      select: {
        tokenAAddress: true,
        tokenASymbol: true,
        tokenAName: true,
        tokenBAddress: true,
        tokenBSymbol: true,
        tokenADecimals: true,
        tokenBDecimals: true,
        reserveAtotaldepth: true,
        reserveBtotaldepth: true,
        reserveAtotaldepthWei: true,
        reserveBtotaldepthWei: true,
        marketCap: true,
        timestamp: true,
        slippageSavings: true,
        percentageSavings: true,
        highestLiquidityADex: true,
      },
    })

    res.json({
      success: true,
      data: topTokens.map((t: any) => ({
        ...t,
        marketCap: t.marketCap ? t.marketCap.toString() : null,
      })),
      total: topTokens.length,
      metric,
      limit,
    })
  })
)

// 7. Search tokens by symbol or name
app.get(
  '/api/tokens/search',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string
    const { page, limit } = validatePagination(
      req.query.page as string,
      req.query.limit as string
    )

    if (!query || query.length < 2) {
      throw {
        statusCode: 400,
        message: 'Search query must be at least 2 characters',
      }
    }

    const skip = (page - 1) * limit
    const searchTerm = `%${query.toLowerCase()}%`

    const [results, total] = await Promise.all([
      dbService.client.liquidityData.findMany({
        where: {
          OR: [
            { tokenASymbol: { contains: query.toUpperCase() } },
            { tokenAName: { contains: query, mode: 'insensitive' } },
            { tokenBSymbol: { contains: query.toUpperCase() } },
          ],
        },
        skip,
        take: limit,
        orderBy: {
          reserveAtotaldepth: 'desc',
        },
      }),
      dbService.client.liquidityData.count({
        where: {
          OR: [
            { tokenASymbol: { contains: query.toUpperCase() } },
            { tokenAName: { contains: query, mode: 'insensitive' } },
            { tokenBSymbol: { contains: query.toUpperCase() } },
          ],
        },
      }),
    ])

    res.json({
      success: true,
      data: results.map((t: any) => ({
        ...t,
        marketCap: t.marketCap ? t.marketCap.toString() : null,
      })),
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
      query,
    })
  })
)

// 8. Get liquidity statistics
app.get(
  '/api/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await dbService.getStats()

    // Additional statistics
    const [topPairByDepthA, topPairByDepthB, recentUpdates] = await Promise.all(
      [
        dbService.client.liquidityData.findFirst({
          orderBy: { reserveAtotaldepth: 'desc' },
          where: { reserveAtotaldepth: { gt: 0 } },
        }),
        dbService.client.liquidityData.findFirst({
          orderBy: { reserveBtotaldepth: 'desc' },
          where: { reserveBtotaldepth: { gt: 0 } },
        }),
        dbService.client.liquidityData.count({
          where: {
            updatedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]
    )

    res.json({
      success: true,
      data: {
        ...stats,
        topPairByDepthA: {
          ...topPairByDepthA,
          marketCap: topPairByDepthA?.marketCap
            ? topPairByDepthA.marketCap?.toString()
            : null,
        },
        topPairByDepthB: {
          ...topPairByDepthB,
          marketCap: topPairByDepthB?.marketCap
            ? topPairByDepthB.marketCap?.toString()
            : null,
        },
        recentUpdates,
        lastUpdated: new Date().toISOString(),
      },
    })
  })
)

// 9. Get DEX breakdown for a specific pair
app.get(
  '/api/pairs/:tokenA/:tokenB/dex-breakdown',
  asyncHandler(async (req: Request, res: Response) => {
    const { tokenA, tokenB } = req.params

    if (!validateEthereumAddress(tokenA) || !validateEthereumAddress(tokenB)) {
      throw { statusCode: 400, message: 'Invalid Ethereum address format' }
    }

    const pair = await dbService.getLiquidityData(tokenA, tokenB)

    if (!pair) {
      throw { statusCode: 404, message: 'Liquidity pair not found' }
    }

    // Build DEX breakdown
    const dexBreakdown = [
      {
        dex: 'UniswapV2',
        reserveA: pair.reservesAUniswapV2,
        reserveB: pair.reservesBUniswapV2,
        hasLiquidity: !!(pair.reservesAUniswapV2 && pair.reservesBUniswapV2),
      },
      {
        dex: 'SushiSwap',
        reserveA: pair.reservesASushiswap,
        reserveB: pair.reservesBSushiswap,
        hasLiquidity: !!(pair.reservesASushiswap && pair.reservesBSushiswap),
      },
      {
        dex: 'UniswapV3-500',
        reserveA: pair.reservesAUniswapV3_500,
        reserveB: pair.reservesBUniswapV3_500,
        hasLiquidity: !!(
          pair.reservesAUniswapV3_500 && pair.reservesBUniswapV3_500
        ),
      },
      {
        dex: 'UniswapV3-3000',
        reserveA: pair.reservesAUniswapV3_3000,
        reserveB: pair.reservesBUniswapV3_3000,
        hasLiquidity: !!(
          pair.reservesAUniswapV3_3000 && pair.reservesBUniswapV3_3000
        ),
      },
      {
        dex: 'UniswapV3-10000',
        reserveA: pair.reservesAUniswapV3_10000,
        reserveB: pair.reservesBUniswapV3_10000,
        hasLiquidity: !!(
          pair.reservesAUniswapV3_10000 && pair.reservesBUniswapV3_10000
        ),
      },
    ].filter((dex) => dex.hasLiquidity)

    res.json({
      success: true,
      data: {
        pair: {
          tokenA: {
            address: pair.tokenAAddress,
            symbol: pair.tokenASymbol,
            name: pair.tokenAName,
          },
          tokenB: {
            address: pair.tokenBAddress,
            symbol: pair.tokenBSymbol,
          },
          totalDepth: {
            tokenA: {
              wei: pair.reserveAtotaldepthWei,
              normal: pair.reserveAtotaldepth,
            },
            tokenB: {
              wei: pair.reserveBtotaldepthWei,
              normal: pair.reserveBtotaldepth,
            },
          },
        },
        dexBreakdown,
        activeDEXes: dexBreakdown.length,
      },
    })
  })
)

// 10. Get recent updates
app.get(
  '/api/recent',
  asyncHandler(async (req: Request, res: Response) => {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24
    const { page, limit } = validatePagination(
      req.query.page as string,
      req.query.limit as string
    )

    if (hours < 1 || hours > 168) {
      // Max 1 week
      throw { statusCode: 400, message: 'Hours must be between 1 and 168' }
    }

    const skip = (page - 1) * limit
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const [recentPairs, total] = await Promise.all([
      dbService.client.liquidityData.findMany({
        where: {
          updatedAt: {
            gte: since,
          },
        },
        skip,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      dbService.client.liquidityData.count({
        where: {
          updatedAt: {
            gte: since,
          },
        },
      }),
    ])

    res.json({
      success: true,
      data: recentPairs.map((t: any) => ({
        ...t,
        marketCap: t.marketCap ? t.marketCap.toString() : null,
      })),
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit),
      },
      filters: {
        hours,
        since: since.toISOString(),
      },
    })
  })
)

// 404 handler (must be before error handler)
app.use('/{*splat}', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'GET /api/pairs',
      'GET /api/pairs/:tokenA/:tokenB',
      'GET /api/pairs/:tokenA/:tokenB/calculate?volume=<value>',
      'GET /api/tokens/:address/pairs',
      'GET /api/tokens/top',
      'GET /api/tokens/search',
      'GET /api/stats',
      'GET /api/pairs/:tokenA/:tokenB/dex-breakdown',
      'GET /api/recent',
    ],
  })
})

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server
async function startServer() {
  try {
    // Initialize database
    dbService = DatabaseService.getInstance()
    await dbService.connect()

    app.listen(PORT, () => {
      console.log(`🚀 Liquidity Data API server running on port ${PORT}`)
      console.log(
        `📊 API Documentation available at http://localhost:${PORT}/api/health`
      )
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...')
  if (dbService) {
    await dbService.disconnect()
  }
  process.exit(0)
})

export default app

// Start the server if this file is run directly
if (require.main === module) {
  startServer()
}
