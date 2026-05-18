// === DISABLED: Balancer/Curve (re-enable when supported) ===
// Original config in balancer-config-pools.ts (not imported while disabled).

export interface BalancerPoolMetadata {
  name: string
  poolId?: string
  tokens: string[]
}

export const getBalancerPoolMetadata = (
  _poolAddress: string
): BalancerPoolMetadata | null => null

export const extractPoolAddressFromDexType = (_dexType: string): string | null =>
  null

export const isBalancerDex = (_dexType: string): boolean => false

export const getBalancerVaultAddress = (): string =>
  '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
