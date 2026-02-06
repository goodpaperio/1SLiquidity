// Curve pools configuration for frontend
// Generated from keeper/data/curve-config.ts

import { CURVE_POOL_METADATA, CurvePoolMetadata } from './curve-config-pools'

// Main pool metadata (subset of most important pools for frontend)
// export const CURVE_POOL_METADATA: Record<string, CurvePoolMetadata> = {
//   '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7': {
//     name: '3pool',
//     isMeta: false,
//     tokens: [
//       '0x6B175474E89094C44Da98b954EedeAC495271d0F',
//       '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
//       '0xdAC17F958D2ee523a2206206994597C13D831ec7',
//     ],
//     underlyingTokens: [
//       '0x6B175474E89094C44Da98b954EedeAC495271d0F',
//       '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
//       '0xdAC17F958D2ee523a2206206994597C13D831ec7',
//     ],
//     A: '4000',
//     fee: '1500000',
//     adminFee: '10000000000',
//   },
//   // Add more pools as needed...
// }

// Utility functions
export const getCurvePoolMetadata = (
  poolAddress: string
): CurvePoolMetadata | null => {
  return CURVE_POOL_METADATA[poolAddress] || null
}

export const extractPoolAddressFromDexType = (
  dexType: string
): string | null => {
  if (dexType.startsWith('curve-')) {
    return dexType.substring(6) // Remove 'curve-' prefix
  }
  return null
}

export const isCurveDex = (dexType: string): boolean => {
  return dexType.startsWith('curve-')
}
