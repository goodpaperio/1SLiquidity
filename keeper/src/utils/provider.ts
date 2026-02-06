import { ethers } from 'ethers'

// Free public fallback RPC endpoints
const FALLBACK_RPCS = [
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://eth.drpc.org',
]

/**
 * Creates an optimized JsonRpcProvider with better settings for rate limiting
 * and fallback capability
 */
export function createProvider(): ethers.JsonRpcProvider {
  // Start with the primary RPC from env vars
  const primaryRpcUrl = process.env.RPC_URL

  console.log('🔍 createProvider() called')
  console.log('RPC_URL from env:', primaryRpcUrl ? 'Set' : 'Not set')
  if (primaryRpcUrl) {
    console.log('RPC_URL value:', primaryRpcUrl.substring(0, 20) + '...')
  }

  if (!primaryRpcUrl) {
    console.warn('RPC_URL environment variable is not set, using fallback RPC')
    // Use the first fallback RPC as primary
    const fallbackRpc = FALLBACK_RPCS[0]
    console.log(`Using fallback RPC: ${fallbackRpc}`)
    
    const provider = new ethers.JsonRpcProvider(
      fallbackRpc,
      undefined,
      {
        polling: true,
        staticNetwork: true,
        batchStallTime: 100,
        batchMaxSize: 3,
        cacheTimeout: 2000,
      }
    )
    
    provider.on('error', (error) => {
      console.error('Provider error:', error)
    })
    
    return provider
  }

  // Provider options to optimize for rate limiting and timeouts
  const providerOptions = {
    polling: false, // Disable polling to reduce requests
    staticNetwork: true,
    batchStallTime: 50, // ms to wait for more requests before sending a batch
    batchMaxSize: 1, // Send individual requests to avoid batch timeouts
    cacheTimeout: 1000, // Shorter cache timeout
    requestTimeout: 12000, // 12 second timeout for individual requests
  }

  const provider = new ethers.JsonRpcProvider(
    primaryRpcUrl,
    undefined,
    providerOptions
  )

  console.log('✅ Using primary RPC URL:', primaryRpcUrl.substring(0, 20) + '...')

  // Add error handling that could switch to fallback RPCs in the future
  provider.on('error', (error) => {
    console.error('Provider error:', error)
    // Could implement fallback logic here in the future
  })

  return provider
}
