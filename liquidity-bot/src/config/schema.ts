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
    minSpreadBps: z.number().int().nonnegative(),
    minLiquidityRatio: z.number().positive(),
  }),
  trade: z.object({
    nominalTradeUsd: z.number().positive(),
    balanceUsagePct: z.number().gt(0).lte(100),
    maxOpenTrades: z.number().int().positive(),
    decastreamAmountOutMinBufferBps: z.number().int().nonnegative().max(10_000),
    directSwapSlippageBps: z.number().int().nonnegative().max(10_000),
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
