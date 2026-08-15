/** Reduce `amount` by `slippageBps` (e.g. 50 → 0.5% min). */
export function applySlippageBps(amount: bigint, slippageBps: number): bigint {
  if (amount <= 0n) return 0n;
  const bps = BigInt(Math.min(10_000, Math.max(0, slippageBps)));
  return (amount * (10_000n - bps)) / 10_000n;
}
