// === DISABLED: Balancer/Curve (re-enable when supported) ===
// Original config in curve-config-pools.ts (not imported while disabled).

export interface CurvePoolMetadata {
  name: string
  isMeta: boolean
  tokens: string[]
  underlyingTokens?: string[]
}

export const getCurvePoolMetadata = (
  _poolAddress: string
): CurvePoolMetadata | null => null

export const extractPoolAddressFromDexType = (_dexType: string): string | null =>
  null

export const isCurveDex = (_dexType: string): boolean => false
