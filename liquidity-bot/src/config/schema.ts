import { z } from 'zod';

const baseTokenEnum = z.enum(['WETH', 'USDC', 'USDT', 'DAI', 'WBTC']);

const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

export const botConfigSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_-]*$/, 'Bot id must be lowercase alphanumeric'),
  enabled: z.boolean(),
  address: ethereumAddress,
  privateKeyEnv: z.string().min(1).regex(/^[A-Z][A-Z0-9_]*$/),
  baseTokens: z.array(baseTokenEnum).min(1),
  scan: z.object({
    intervalMs: z.number().int().positive(),
    /** Minimum spread vs deep reference (default 300 = 3%). */
    minSpreadBps: z.number().int().nonnegative(),
    /**
     * Reject spreads above this (default 2500 = 25%) as likely bad/stale thin-pool quotes.
     */
    maxSpreadBps: z.number().int().positive(),
    /**
     * Floor on signed coupled round-trip (bps). e.g. -500 = reject quotes worse than -5%.
     * For ~0.5% max quoted loss use -50.
     */
    minCoupledSpreadBps: z.number().int().max(0).default(-100),
    selectionMode: z
      .enum(['round_trip', 'mid_range_spread'])
      .default('mid_range_spread'),
    minLiquidityRatio: z.number().positive(),
    /** Minimum notional USD for scan amount checks (dust filter). */
    dustFloorUsd: z.number().positive().default(1),
    /**
     * Reject if alt amount exceeds this % of sell-side reserveIn on deep pool
     * (microscopic book guard; default 1500 = 15%).
     */
    maxSellReserveUsageBps: z.number().int().positive(),
    /**
     * After the full scan, re-quote the top N pairs (by coarse coupled bps) and
     * select from fresh edges. 0 disables. Default 10.
     */
    finalistCount: z.number().int().nonnegative().default(10),
  }),
  trade: z.object({
    nominalTradeUsd: z.number().positive(),
    balanceUsagePct: z.number().gt(0).lte(100),
    maxOpenTrades: z.number().int().positive(),
    decastreamAmountOutMinBufferBps: z.number().int().nonnegative().max(10_000),
    directSwapSlippageBps: z.number().int().nonnegative().max(10_000),
    /** Do not re-trade the same base→alt pair within this window after a fill. */
    pairCooldownMs: z.number().int().nonnegative(),
    /**
     * After a live trade on a pair, block that pair for this many subsequent picks.
     * e.g. 4 = next 4 executions cannot be the same pair (forward or reverse).
     */
    minTradesBetweenSamePair: z.number().int().positive().default(4),
    /** Max live trades stored on disk for repeat guard. */
    tradeHistoryMaxEntries: z.number().int().positive().default(32),
    usePriceBased: z.boolean(),
    isInstasettlable: z.boolean(),
    instasettleBps: z.number().int().nonnegative().max(10_000),
  }),
  gas: z.object({
    minEthWei: z.string().regex(/^\d+$/),
    targetEthWei: z.string().regex(/^\d+$/),
    refuelDex: z.string().min(1),
  }),
  contracts: z.object({
    core: ethereumAddress,
    deploymentManifest: z.string().min(1),
  }),
});

export type BotConfig = z.infer<typeof botConfigSchema>;

export const pairFileSchema = z.object({
  description: z.string().optional(),
  totalCount: z.number().optional(),
  extractedAt: z.string().optional(),
  filterCriteria: z.string().optional(),
  pairs: z.array(
    z.object({
      name: z.string(),
      address: ethereumAddress,
    })
  ),
});

export type PairFile = z.infer<typeof pairFileSchema>;
