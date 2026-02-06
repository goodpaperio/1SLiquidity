import { ethers } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'
import { createProvider } from '../utils/provider'

// Load environment variables from keeper/.env
try {
  const envPath = path.join(__dirname, '../.env')
  require('dotenv').config({ path: envPath })
} catch (e) {
  // dotenv not available, continue without it
}

// Curve Registry contract
const CURVE_REGISTRY = '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5'

// Registry ABI
const REGISTRY_ABI = [
  'function pool_count() external view returns (uint256)',
  'function pool_list(uint256 arg0) external view returns (address)',
  'function get_coins(address pool) external view returns (address[8] memory)',
  'function get_underlying_coins(address pool) external view returns (address[8] memory)',
  'function get_pool_name(address pool) external view returns (string memory)',
  'function is_meta(address pool) external view returns (bool)',
  'function get_lp_token(address pool) external view returns (address)',
]

// Pool ABI for additional info
const POOL_ABI = [
  'function coins(uint256 i) external view returns (address)',
  'function A() external view returns (uint256)',
  'function fee() external view returns (uint256)',
  'function admin_fee() external view returns (uint256)',
]

interface CurvePoolInfo {
  poolAddress: string
  poolName: string
  isMeta: boolean
  lpToken: string
  tokens: string[]
  underlyingTokens: string[]
  A: string
  fee: string
  adminFee: string
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

async function fetchAllCurvePools(): Promise<CurvePoolInfo[]> {
  const provider = createProvider()
  const registry = new ethers.Contract(CURVE_REGISTRY, REGISTRY_ABI, provider)

  console.log('Fetching Curve pools from registry...')

  // Get total number of pools
  const poolCount = await registry.pool_count()
  console.log(`Found ${poolCount} pools in Curve registry`)

  const pools: CurvePoolInfo[] = []
  const batchSize = 5 // Reduced batch size for rate limiting
  const requestDelay = 2000 // 2 seconds between batches
  const poolDelay = 500 // 500ms between individual pool requests

  for (let i = 0; i < Number(poolCount); i += batchSize) {
    const batch = []
    const endIndex = Math.min(i + batchSize, Number(poolCount))

    console.log(`Processing pools ${i} to ${endIndex - 1}...`)

    // Fetch pool addresses in batch with retry logic
    const poolAddresses = await fetchWithRetry(
      async () => {
        const batch = []
        for (let j = i; j < endIndex; j++) {
          batch.push(registry.pool_list(j))
        }
        return Promise.all(batch)
      },
      `pool_list batch ${i}-${endIndex - 1}`,
      3, // 3 retries
      1000 // 1 second delay between retries
    )

    if (!poolAddresses) {
      console.log(
        `Skipping batch ${i}-${endIndex - 1} due to repeated failures`
      )
      continue
    }

    // Process each pool in the batch with individual delays
    for (let k = 0; k < poolAddresses.length; k++) {
      const poolAddress = poolAddresses[k]

      try {
        const poolInfo = await fetchWithRetry(
          () => fetchPoolInfo(registry, provider, poolAddress),
          `pool ${poolAddress}`,
          2, // 2 retries
          2000 // 2 second delay between retries
        )

        if (poolInfo) {
          pools.push(poolInfo)
          console.log(`✓ ${poolInfo.poolName} (${poolAddress})`)
        }
      } catch (error) {
        console.log(
          `✗ Failed to fetch pool ${poolAddress}:`,
          (error as Error).message
        )
      }

      // Add delay between individual pool requests
      if (k < poolAddresses.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, poolDelay))
      }
    }

    // Add delay between batches
    console.log(
      `Completed batch ${i}-${
        endIndex - 1
      }. Waiting ${requestDelay}ms before next batch...`
    )
    await new Promise((resolve) => setTimeout(resolve, requestDelay))
  }

  return pools
}

async function fetchPoolInfo(
  registry: ethers.Contract,
  provider: ethers.Provider,
  poolAddress: string
): Promise<CurvePoolInfo | null> {
  try {
    // Get basic pool info
    const [poolName, isMeta, lpToken] = await Promise.all([
      registry.get_pool_name(poolAddress).catch(() => 'Unknown'),
      registry.is_meta(poolAddress).catch(() => false),
      registry.get_lp_token(poolAddress).catch(() => ethers.ZeroAddress),
    ])

    // Get tokens and underlying tokens
    const [coins, underlyingCoins] = await Promise.all([
      registry.get_coins(poolAddress).catch(() => []),
      registry.get_underlying_coins(poolAddress).catch(() => []),
    ])

    // Filter out zero addresses
    const tokens = coins.filter((coin: string) => coin !== ethers.ZeroAddress)
    const underlyingTokens = underlyingCoins.filter(
      (coin: string) => coin !== ethers.ZeroAddress
    )

    // Get additional pool parameters
    let A = '0'
    let fee = '0'
    let adminFee = '0'

    try {
      const pool = new ethers.Contract(poolAddress, POOL_ABI, provider)
      const [AValue, feeValue, adminFeeValue] = await Promise.all([
        pool.A().catch(() => 0),
        pool.fee().catch(() => 0),
        pool.admin_fee().catch(() => 0),
      ])

      A = AValue.toString()
      fee = feeValue.toString()
      adminFee = adminFeeValue.toString()
    } catch (error) {
      // Some pools might not have these functions
      console.log(`Warning: Could not fetch pool parameters for ${poolAddress}`)
    }

    return {
      poolAddress,
      poolName,
      isMeta,
      lpToken,
      tokens,
      underlyingTokens,
      A,
      fee,
      adminFee,
    }
  } catch (error) {
    console.log(
      `Error fetching pool info for ${poolAddress}:`,
      (error as Error).message
    )
    return null
  }
}

function savePoolsToJson(pools: CurvePoolInfo[], outputPath: string) {
  const output = {
    timestamp: new Date().toISOString(),
    totalPools: pools.length,
    pools: pools,
  }

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
  console.log(`\nSaved ${pools.length} pools to ${outputPath}`)
}

function generateDexConfig(pools: CurvePoolInfo[]): string {
  // Filter for active pools with tokens
  const activePools = pools.filter(
    (pool) => pool.tokens.length >= 2 && pool.tokens.length <= 8
    // pool.poolName !== 'Unknown'
  )

  // Debug: Show what pools are being filtered out
  const filteredOut = pools.filter(
    (pool) =>
      !(
        (pool.tokens.length >= 2 && pool.tokens.length <= 8)
        // pool.poolName !== 'Unknown'
      )
  )

  console.log(`\nFound ${activePools.length} active pools with 2-8 tokens`)
  console.log(`Filtered out ${filteredOut.length} pools:`)
  filteredOut.forEach((pool) => {
    console.log(
      `  - ${pool.poolName} (${pool.poolAddress}): ${pool.tokens.length} tokens`
    )
  })

  // Group by pool type for better organization
  const metaPools = activePools.filter((pool) => pool.isMeta)
  const regularPools = activePools.filter((pool) => !pool.isMeta)

  let config = `// Auto-generated Curve pools configuration
// Generated on: ${new Date().toISOString()}
// Total pools: ${activePools.length} (${regularPools.length} regular, ${
    metaPools.length
  } meta)

export const CURVE_POOL_METADATA = {`

  activePools.forEach((pool) => {
    config += `\n  '${pool.poolAddress}': {\n`
    config += `    name: '${pool.poolName}',\n`
    config += `    isMeta: ${pool.isMeta},\n`
    config += `    tokens: [${pool.tokens.map((t) => `'${t}'`).join(', ')}],\n`
    config += `    underlyingTokens: [${pool.underlyingTokens
      .map((t) => `'${t}'`)
      .join(', ')}],\n`
    config += `    A: '${pool.A}',\n`
    config += `    fee: '${pool.fee}',\n`
    config += `    adminFee: '${pool.adminFee}'\n`
    config += `  },`
  })

  config += `\n};\n`

  return config
}

async function main() {
  try {
    console.log('🚀 Starting Curve pool discovery...\n')

    const pools = await fetchAllCurvePools()

    if (pools.length === 0) {
      console.log('❌ No pools found')
      return
    }

    // Save raw data
    const outputDir = path.join(__dirname, '../../data')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const jsonPath = path.join(outputDir, 'curve-pools.json')
    savePoolsToJson(pools, jsonPath)

    // Generate config
    const configPath = path.join(outputDir, 'curve-config.ts')
    const configContent = generateDexConfig(pools)
    fs.writeFileSync(configPath, configContent)

    console.log(`\n✅ Successfully processed ${pools.length} Curve pools`)
    console.log(`📁 Raw data saved to: ${jsonPath}`)
    console.log(`📁 Config generated: ${configPath}`)
    console.log('\n📋 Next steps:')
    console.log('1. Review the generated curve-config.ts')
    console.log('2. Copy the relevant pools to your dex.ts config')
    console.log('3. Import CURVE_POOL_METADATA for smart filtering')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

// Run the script
if (require.main === module) {
  main()
}

export { fetchAllCurvePools, generateDexConfig, main }
