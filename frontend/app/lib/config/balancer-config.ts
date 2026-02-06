// Balancer pools configuration for frontend
// Generated from keeper/data/balancer-config.ts

import {
  BALANCER_POOL_METADATA,
  BalancerPoolMetadata,
} from './balancer-config-pools'

// Utility functions
export const getBalancerPoolMetadata = (
  poolAddress: string
): BalancerPoolMetadata | null => {
  return BALANCER_POOL_METADATA[poolAddress] || null
}

export const extractPoolAddressFromDexType = (
  dexType: string
): string | null => {
  if (dexType.startsWith('balancer-')) {
    return dexType.substring(9) // Remove 'balancer-' prefix
  }
  return null
}

export const isBalancerDex = (dexType: string): boolean => {
  return dexType.startsWith('balancer-')
}

export const getBalancerVaultAddress = (): string => {
  return '0xBA12222222228d8Ba445958a75a0704d566BF2C8' // Balancer Vault on Ethereum
}
