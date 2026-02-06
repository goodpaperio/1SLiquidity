import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables from keeper/.env
try {
  const envPath = path.join(__dirname, '../../.env')
  dotenv.config({ path: envPath })
} catch (e) {
  // dotenv not available, continue without it
}

interface BalancerToken {
  address: string
  decimals: number
  name: string
  symbol: string
}

interface BalancerPool {
  id: string // Pool ID from v2 subgraph
  address: string
  symbol: string
  name: string
  tokens: BalancerToken[]
}

interface BalancerPoolInfo {
  poolId: string // Pool ID from v2 subgraph
  poolAddress: string
  symbol: string
  name: string
  tokens: string[]
  tokenDecimals: number[]
  tokenNames: string[]
  tokenSymbols: string[]
  isActive: boolean
}

// Helper function for retry logic with exponential backoff
async function fetchWithRetry<T>(
  fetchFn: () => Promise<T>,
  name: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T | null> {
  let retries = 0

  while (retries <= maxRetries) {
    try {
      return await fetchFn()
    } catch (error) {
      if (retries === maxRetries) {
        console.log(
          `❌ ${name} failed after ${maxRetries} retries:`,
          (error as Error).message
        )
        return null
      }

      const delay = baseDelay * Math.pow(2, retries) // Exponential backoff
      console.log(
        `⚠️  ${name} failed (attempt ${retries + 1}/${
          maxRetries + 1
        }). Retrying in ${delay}ms...`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
      retries++
    }
  }

  return null
}

async function fetchAllBalancerPools(): Promise<BalancerPoolInfo[]> {
  const subgraphUrl = process.env.BALANCER_SUBGRAPH
  console.log('Subgraph URL:', subgraphUrl)
  if (!subgraphUrl) {
    throw new Error(
      'BALANCER_SUBGRAPH environment variable is required. Please set it in your .env file.'
    )
  }

  console.log('Fetching Balancer pools from v2 subgraph...')

  const query = `
    query GetBalancerPools {
      pools(first: 1000, orderBy: swapsCount, orderDirection: desc) {
        id
        address
        symbol
        name
        tokens {
          address
          decimals
          name
          symbol
        }
      }
    }
  `

  const pools: BalancerPoolInfo[] = []
  let skip = 0
  const batchSize = 1000
  let hasMore = true

  while (hasMore) {
    console.log(`Fetching pools batch starting at ${skip}...`)

    const batchQuery = `
      query GetBalancerPools($skip: Int!) {
        pools(first: ${batchSize}, skip: $skip, orderBy: swapsCount, orderDirection: desc) {
          id
          address
          symbol
          name
          tokens {
            address
            decimals
            name
            symbol
          }
        }
      }
    `

    const response = await fetchWithRetry(
      async () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Add API key if available
        if (process.env.GRAPH_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.GRAPH_API_KEY}`
        }

        const res = await fetch(subgraphUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: batchQuery,
            variables: { skip },
          }),
        })

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`)
        }

        return res.json()
      },
      `subgraph batch ${skip}`,
      3, // 3 retries
      2000 // 2 second delay between retries
    )

    if (!response || !(response as any).data || !(response as any).data.pools) {
      console.log(`No data received for batch starting at ${skip}`)
      break
    }

    const batchPools = (response as any).data.pools
    console.log(
      `Received ${batchPools.length} pools in batch starting at ${skip}`
    )

    // Process each pool in the batch
    for (const pool of batchPools) {
      try {
        const poolInfo = processPoolData(pool)
        if (poolInfo) {
          pools.push(poolInfo)
          console.log(
            `✓ ${poolInfo.symbol} pool (${poolInfo.poolAddress}) - ${poolInfo.tokens.length} tokens`
          )
        }
      } catch (error) {
        console.log(
          `✗ Failed to process pool ${pool.address}:`,
          (error as Error).message
        )
      }
    }

    // Check if we should continue
    hasMore = batchPools.length === batchSize
    skip += batchSize

    // Add delay between batches to avoid rate limiting
    if (hasMore) {
      console.log(`Waiting 1 second before next batch...`)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  console.log(
    `\n✅ Successfully fetched ${pools.length} Balancer pools from subgraph`
  )
  return pools
}

function processPoolData(pool: BalancerPool): BalancerPoolInfo | null {
  try {
    // Filter out pools with less than 2 tokens or more than 8 tokens
    if (pool.tokens.length < 2 || pool.tokens.length > 8) {
      return null
    }

    // Extract token addresses and metadata
    const tokens = pool.tokens.map((token) => token.address.toLowerCase())
    const tokenDecimals = pool.tokens.map((token) => token.decimals)
    const tokenNames = pool.tokens.map((token) => token.name)
    const tokenSymbols = pool.tokens.map((token) => token.symbol)

    // Check if pool is active (has a name and symbol)
    const isActive = !!(pool.name && pool.symbol)

    return {
      poolId: pool.id,
      poolAddress: pool.address.toLowerCase(),
      symbol: pool.symbol || 'Unknown',
      name: pool.name || 'Unknown Pool',
      tokens,
      tokenDecimals,
      tokenNames,
      tokenSymbols,
      isActive,
    }
  } catch (error) {
    console.error(`Error processing pool data for ${pool.address}:`, error)
    return null
  }
}

function generateDexConfig(pools: BalancerPoolInfo[]): string {
  console.log(`\nGenerating DEX configuration for ${pools.length} pools...`)

  // Filter active pools with 2-8 tokens
  const activePools = pools.filter(
    (pool) =>
      pool.isActive && pool.tokens.length >= 2 && pool.tokens.length <= 8
  )

  console.log(`Found ${activePools.length} active pools with 2-8 tokens`)

  // Group pools by token count for better organization
  const poolsByTokenCount: Record<number, BalancerPoolInfo[]> = {}
  activePools.forEach((pool) => {
    if (!poolsByTokenCount[pool.tokens.length]) {
      poolsByTokenCount[pool.tokens.length] = []
    }
    poolsByTokenCount[pool.tokens.length].push(pool)
  })

  let config = `// Generated Balancer pool metadata from subgraph
// Total pools: ${activePools.length}
// Generated at: ${new Date().toISOString()}

export const BALANCER_POOL_METADATA: Record<string, any> = {
`

  // Add pools sorted by token count
  Object.entries(poolsByTokenCount).forEach(([tokenCount, typePools]) => {
    config += `  // ${tokenCount}-token pools (${typePools.length} pools)\n`

    typePools.forEach((pool) => {
      config += `  '${pool.poolAddress}': {\n`
      config += `    poolId: '${pool.poolId}',\n`
      config += `    symbol: '${pool.symbol.replace(/'/g, "\\'")}',\n`
      config += `    name: '${pool.name.replace(/'/g, "\\'")}',\n`
      config += `    tokens: [\n`
      pool.tokens.forEach((token) => {
        config += `      '${token}',\n`
      })
      config += `    ],\n`
      config += `    tokenDecimals: [\n`
      pool.tokenDecimals.forEach((decimals) => {
        config += `      ${decimals},\n`
      })
      config += `    ],\n`
      config += `    tokenNames: [\n`
      pool.tokenNames.forEach((name) => {
        config += `      '${name.replace(/'/g, "\\'")}',\n`
      })
      config += `    ],\n`
      config += `    tokenSymbols: [\n`
      pool.tokenSymbols.forEach((symbol) => {
        config += `      '${symbol.replace(/'/g, "\\'")}',\n`
      })
      config += `    ],\n`
      config += `    isActive: ${pool.isActive}\n`
      config += `  },\n`
    })

    config += `\n`
  })

  config += `};\n`

  return config
}

async function main() {
  try {
    console.log('🚀 Starting Balancer pool discovery from subgraph...\n')

    const pools = await fetchAllBalancerPools()

    if (pools.length === 0) {
      console.log('❌ No pools found')
      return
    }

    console.log(
      `\n✅ Successfully fetched ${pools.length} Balancer pools from subgraph`
    )

    // Generate configuration
    const config = generateDexConfig(pools)

    // Save to file
    const outputPath = path.join(__dirname, '../../data/balancer-config.ts')
    fs.writeFileSync(outputPath, config)

    console.log(`\n💾 Configuration saved to: ${outputPath}`)

    // Also save raw JSON for reference
    const jsonPath = path.join(__dirname, '../../data/balancer-pools.json')
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      totalPools: pools.length,
      pools: pools,
    }
    fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2))

    console.log(`📄 Raw data saved to: ${jsonPath}`)

    console.log('\n🎉 Balancer pool discovery completed!')
    console.log('\nNext steps:')
    console.log('1. Review the generated balancer-config.ts file')
    console.log('2. The BALANCER_POOL_METADATA is already imported in dex.ts')
    console.log('3. Run your tests to verify the integration works')
  } catch (error) {
    console.error('❌ Error during pool discovery:', error)
    throw error
  }
}

if (require.main === module) {
  main().catch(console.error)
}

export { fetchAllBalancerPools, generateDexConfig, main }
