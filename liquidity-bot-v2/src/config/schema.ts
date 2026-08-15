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
      .enum(['round_trip', 'mid_range_spread', 'price_vs_depth'])
      .default('price_vs_depth'),
    /**
     * `hot_pairs` = quote ≤ hotPairsLimit from keeper API/cache.
     * `static_json` = legacy full `config/*_pairs_clean.json` universe.
     */
    universeMode: z.enum(['hot_pairs', 'static_json']).default('hot_pairs'),
    hotPairsLimit: z.number().int().positive().max(50).default(10),
    hotPairsMetric: z
      .enum([
        'slippageSavings',
        'reserveAtotaldepth',
        'reserveBtotaldepth',
        'marketCap',
      ])
      .default('slippageSavings'),
    /** Soft TTL for cache refresh preference; stale cache still used on API failure. */
    hotPairsCacheTtlMs: z.number().int().positive().default(3_600_000),
    /**
     * When selectionMode is price_vs_depth, require price DEX ≠ deepest DEX
     * only for `price_then_depth` exits (both_price may use one venue).
     */
    requirePriceNeDepth: z.boolean().default(true),
    /**
     * Sell impact on the price venue below this (bps) → both legs usePriceBased.
     * At/above → try deepest-reserve Deca exit if it returns more base.
     */
    sellImpactBpsThreshold: z.number().int().nonnegative().default(15),
    /**
     * Minimum net bps after Deca protocol fee (quotes already include DEX fees).
     * Default 0 = PnL mode: refuse Deca trades that lose to the 20bps take.
     * Set negative (e.g. -50) for throughput mode.
     */
    minNetBps: z.number().int().default(0),
    /** Deca protocol fee bps subtracted from gross coupled for netBps. */
    decaProtocolFeeBps: z.number().int().nonnegative().default(20),
    /**
     * `pnl` enforces minNetBps (default 0). `throughput` uses minNetBps only
     * as a soft floor already set (often negative).
     */
    strategyMode: z.enum(['pnl', 'throughput']).default('pnl'),
    /**
     * USD notionals to re-quote on finalists; pick best netBps.
     * Empty → use trade.nominalTradeUsd only.
     */
    sizeSweepUsd: z.array(z.number().positive()).default([5, 10, 25, 50]),
    /**
     * `off` = quote full hot set.
     * `prefer` = intersect with CEX warm-set when present; else full hot.
     * `require` = only warm-set (skip cycle if empty).
     */
    warmSetMode: z.enum(['off', 'prefer', 'require']).default('prefer'),
    warmSetLimit: z.number().int().positive().max(50).default(10),
    /** Max Binance book spread (bps) to treat a pair as warm. */
    warmMaxCexSpreadBps: z.number().positive().default(25),
    /**
     * Watch plane: CEX books + last DEX mids; Multicall only on trigger.
     * `off` = quote warm/hot set every cycle (legacy).
     * `prefer` = confirm on gap / stale mid; idle = 0 quote RPC.
     * `require` = same, but skip the cycle if CEX books are unavailable.
     */
    watchMode: z.enum(['off', 'prefer', 'require']).default('prefer'),
    /**
     * |CEX mid − last DEX implied USD| to trigger a confirm.
     * Omit to derive from Deca fee + minNet + 5 bps gas pad.
     */
    confirmGapBps: z.number().int().positive().optional(),
    /** Max pairs to Quoter this cycle (gaps first, then mid heartbeats). */
    maxConfirmPairs: z.number().int().positive().max(20).default(3),
    /** CEX print older than this is not a trigger (REST/WS snapshot age). */
    maxCexStalenessMs: z.number().int().positive().default(30_000),
    /** Re-quote a pair even without a CEX gap so DEX mids do not rot. */
    maxDexMidAgeMs: z.number().int().positive().default(900_000),
    /**
     * Hard cap on Multicall eth_calls per scan cycle (coarse quotes + size sweep).
     * 0 disables. Default 200 ≈ warm-set of ~10 pairs, not a 50-pair blast.
     */
    maxEthCallsPerCycle: z.number().int().nonnegative().default(200),
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
    /**
     * Pair target names to omit from the scan universe (case-insensitive;
     * matches `name` in config/*_pairs_clean.json, e.g. "ldo").
     */
    excludedTargets: z.array(z.string().min(1)).default([]),
    /**
     * Skip RPC quote collection for targets seen in the last N live trades.
     * Helps cut quote load for recently-traded names (default 10, 0 disables).
     */
    skipRecentTargetsCount: z.number().int().nonnegative().default(10),
  }),
  trade: z
    .object({
      nominalTradeUsd: z.number().positive(),
      balanceUsagePct: z.number().gt(0).lte(100),
      maxOpenTrades: z.number().int().positive(),
      decastreamAmountOutMinBufferBps: z
        .number()
        .int()
        .nonnegative()
        .max(10_000),
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
      /**
       * @deprecated Prefer leg2UsePriceBased. Kept for V1 config compatibility.
       */
      usePriceBased: z.boolean().optional(),
      /** Off-chain thesis for leg1 (direct swap on best-price DEX). */
      leg1UsePriceBased: z.boolean().optional(),
      /** Core placeTrade routing for leg2 (false = deepest reserves). */
      leg2UsePriceBased: z.boolean().optional(),
      isInstasettlable: z.boolean(),
      /** Instasettle bps passed to Core placeTrade. */
      instasettleBps: z.number().int().nonnegative().max(10_000),
      /**
       * After this many consecutive bot scan cycles with the same open Core trade,
       * call cancelTrade and resume scanning (default 3 ≈ 45 min at 15 min interval).
       */
      stuckCancelAfterCycles: z.number().int().nonnegative().default(3),
    })
    .transform((t) => {
      const leg2 = t.leg2UsePriceBased ?? t.usePriceBased ?? false;
      return {
        ...t,
        usePriceBased: leg2,
        leg1UsePriceBased: t.leg1UsePriceBased ?? true,
        leg2UsePriceBased: leg2,
      };
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
  liquify: z
    .object({
      enabled: z.boolean().default(true),
      contract: ethereumAddress.default(
        '0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95'
      ),
      /** UTC hour (0–23) for daily dust sweep; catch-up on next cycle if bot was down. */
      dailySweepHourUtc: z.number().int().min(0).max(23).default(11),
      /** Alert threshold reference (native ETH below this USD notional). */
      minNativeEthUsd: z.number().positive().default(10),
      slippageBps: z.number().int().min(0).max(10_000).default(300),
    })
    .default({
      enabled: true,
      contract: '0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95',
      dailySweepHourUtc: 11,
      minNativeEthUsd: 10,
      slippageBps: 300,
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
