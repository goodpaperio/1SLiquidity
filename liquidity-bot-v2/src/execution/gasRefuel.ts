export interface GasRefuelDecision {
  shouldRefuel: boolean;
  topUpWei: bigint;
}

/**
 * Compute whether gas should be refueled and how much ETH to top up.
 * Returns zero top-up when current ETH is already at/above target.
 */
export function computeGasRefuel(
  currentEthWei: bigint,
  minEthWei: bigint,
  targetEthWei: bigint
): GasRefuelDecision {
  if (currentEthWei >= minEthWei) {
    return { shouldRefuel: false, topUpWei: 0n };
  }
  const topUpWei = targetEthWei > currentEthWei ? targetEthWei - currentEthWei : 0n;
  return { shouldRefuel: topUpWei > 0n, topUpWei };
}
