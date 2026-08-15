# Arb Bot — Watch-plane design (2026-08)

This document **does not replace** [DESIGN.md](./DESIGN.md).

- **DESIGN.md** remains the product spec: CEX as an **executable venue**, ≥10 bps net after all fees, Deca only if it wins (+40 bps premium), inventory-aligned v1, feedback every 10 trades.
- **This file** is the scan architecture we actually want, plus the build sequence: **finish liquidity-bot-v2 first**, then port the proven watch plane into `arb-bot/`.

[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) Phase 1 still says “poll CEX REST + quote all DEX venues.” That is the old scan. Phase 1 should be rewritten to this watch/confirm split **after** V2 has it working in production dry-runs.

---

## 1. Why this, why now

Two bots, two jobs:

| | `liquidity-bot-v2/` | `arb-bot/` |
|--|---------------------|------------|
| Goal | Capital **throughput** through DecaStream Core | **Net profit ≥ 10 bps** |
| CEX role | **Sensor only** (no CEX orders) | **Executable venue** (buy/sell via API) |
| Universe | Keeper hot pairs (slippage-savings) | Same vetted universe, then CEX-listed slice for cross-venue |
| RPC | Near-zero most cycles | Same watch plane; confirm only when a gap can clear the 10 bps gate |

Jumping into arb-bot now would re-implement CEX websockets, hot-pair intake, and RPC discipline from scratch while V2 is mid-flight. V2 is the right place to **prove** “watch global CEX prints on vetted names, confirm on-chain only when the gap is large enough.” Arb-bot then **reuses** that plane and adds CEX fills + the profit model.

Do **not** put CEX order placement, withdrawals, or a 10 bps arb gate into V2. That is the product line.

---

## 2. Sequence

```
liquidity-bot-v2  →  prove watch + sparse confirm  →  port into arb-bot Phase 1
     (now)              (0 quote RPC most cycles)         (then Phases 2–5 in DESIGN.md)
```

1. **Finish V2** until a live/dry cycle can sit on CEX WS (and last DEX mids) with **no Quoter/Multicall** unless a trigger fires.
2. **Port** hot-pair cache, symbol map, Binance WS, last-DEX-mid cache, and the trigger into `arb-bot/` as the scan front-end.
3. **Then** implement DESIGN.md Phases 2–5: best-execution (DEX vs Deca vs CEX), 10 bps gate, CEX executor, inventory, 10-trade feedback.

Arb-bot Phase 0 (package scaffold) can wait until V2’s watch plane is stable. Copying an unfinished WS sidecar into an empty package helps nobody.

---

## 3. What “vetted” means (and what it does not)

Hot pairs are **not** produced by either bot. They come from keeper:

| Step | Where | Cadence |
|------|--------|---------|
| Universe | `keeper/src/tests/tokens-list-04-09-2025.json` | Static roster |
| Job | `keeper/src/services/cron-scheduler.ts` → `runLiquidityAnalysisFromJson` | 2× daily (08:00 / 20:00 UTC) |
| Analysis | `keeper/src/tests/liquidity-analysis.ts` | On-chain reserves, deepest DEX |
| Score | `keeper/src/functions/slippage-calculations.ts` | `slippageSavings` = chunked (Deca-like) vs one-shot dump **on that same pool** |
| Accuracy | `priceAccuracyDECA` / `priceAccuracyNODECA` | Realised DEX price vs **pool spot**, not vs Binance |
| API | `GET /api/tokens/top?metric=slippageSavings` | Same list as the Hot Pairs UI |

**Vetted means:** this pair has depth, and Deca-style chunking beats dumping size on the deep book (as of last cron).

**It does not mean:** Binance will fill at that price, Deca will route to the scored pool, or the edge still exists hours later.

Bot intake (already in V2): `liquidity-bot-v2/src/scan/hotPairs.ts` → `bots/<id>.hot-pairs.json`. Never silently fall back to full `*_pairs_clean.json`.

Split the hot list immediately:

| Slice | How | Watch | Confirm |
|-------|-----|--------|---------|
| **`cexListed`** | Binance (later Coinbase/Kraken) has a live spot book | CEX WS — **0 Ethereum RPC** | Multicall / StreamDaemon only if \|CEX_now − DEX_last\| can cover costs |
| **`dexOnly`** | Stables / unlisted alts (`sUSDe`, `PYUSD`, …) | Last DEX mid + optional pool Swap logs | Sparse re-quote; **not** CEX WS |

V2 warm-set already drops `dexOnly`. That is correct for a CEX sensor. Arb-bot v1 **executes** only `cexListed` (inventory-aligned). `dexOnly` stays a V2 / Deca-throughput concern unless we later add a DEX↔DEX path that still clears 10 bps.

---

## 4. Watch plane vs confirm plane

This is the change to DESIGN.md §7 (“quote all 6 DEX venues every cycle”).

```
WATCH (always on, cheap)
  CEX WS bookTicker / depth for cexListed symbols
  last DEX implied USD (from the last confirm, disk cache)
  ─────────────────────────────────────────
  0 eth_call, 0 Quoter, 0 Multicall

TRIGGER (rare)
  |CEX_mid_now − DEX_mid_last| ≥ threshold
  threshold ≈ Deca premium or pool fee + gas bps + V2 minNet / arb 10 bps
  + CEX book not wider than maxCexSpreadBps
  + quote not stale

CONFIRM (only then)
  Multicall quotes on that pair (and maybe 1–2 neighbours)
  Finalists: StreamDaemon evaluateSweetSpotAndDex / evaluateStreamPlan
  V2: price-vs-depth + size sweep → placeTrade / direct swap
  Arb: best execution per leg → 10 bps gate → CEX and/or on-chain
```

**Most cycles should be 0 quote RPC.** Streaming Uniswap Quoter is forbidden. Pool Swap logs are optional and only for `dexOnly` or CEX-missed Deca dislocations — not a second full scan.

Staleness:

- CEX print older than `maxCexStalenessMs` (DESIGN.md default 5s) → do not trigger.
- DEX last-mid older than `maxDexMidAgeMs` (V2 should pick a value, e.g. 15–30 min) → one **scheduled** confirm even without a CEX gap, so the cache does not rot. That is a heartbeat, not a scan of the universe.

---

## 5. What V2 already has (carry into arb-bot)

Proven or sketched under `liquidity-bot-v2/src/`:

| Piece | Path | Arb-bot use |
|-------|------|-------------|
| Hot-pair fetch + cache | `scan/hotPairs.ts` | Universe |
| Binance REST books | `signal/cexBook.ts` | Bootstrap + fallback if WS drops |
| Binance WS bookTicker | `signal/cexWs.ts` | Watch plane |
| Warm-set (listed + tight book) | `signal/warmSet.ts` | `cexListed` slice |
| CEX–DEX gap rank | `signal/cexDexRank.ts` | Trigger ordering |
| Last DEX mid cache | `signal/dexMidCache.ts` | Watch reference |
| RPC cap | `maxEthCallsPerCycle` | Confirm budget |
| Fee-aware net | `scan/feeModel.ts` | V2 only (Deca 20 bps). Arb uses DESIGN.md 40 bps + CEX taker |
| Size sweep | `selection/sizeSweep.ts` | Optional on confirm |
| Exit mode / `usePriceBased` | `selection/priceVsDepth.ts` | V2 execution; arb compares Deca vs direct |

**Not** to copy into arb-bot: V2 `strategyMode: throughput`, negative-net floors, “always placeTrade leg 2.” Those fight the 10 bps product.

---

## 6. What V2 must finish before the handoff

The sidecar exists; the **loop still quotes the warm-set every cycle** (dry-runs still spent ~100 `eth_call`s). Handoff criteria:

1. **Watch is the default cycle.** WS (or REST tickers if WS is down) updates in-memory books. No Quoter unless trigger or DEX-mid heartbeat.
2. **Trigger is explicit and logged.** Skip reasons: `gap_too_small`, `cex_stale`, `dex_mid_missing`, `book_too_wide`, `rpc_budget`.
3. **Hot list split is visible.** Dry-run prints `hotN / cexListedN / dexOnlyN / confirmedN`.
4. **Confirm set ≤ a handful of pairs**, under `maxEthCallsPerCycle`.
5. **No CEX trading in V2.** Keys for Binance *market data* only.

Until (1)–(4) are true, arb-bot would inherit a poller, not a watch plane.

**Status (2026-08-12):** V2 ships `watchMode: prefer` — confirm only on CEX–DEX gap / DEX-mid heartbeat / missing mid seed, capped by `maxConfirmPairs`. Binance WS starts in `BotRunner`. Handoff bar (1)–(4) is met for dry-run / unit coverage; live soak on EC2 still recommended before arb-bot Phase 0.

---

## 7. Arb-bot scan after the port (replaces DESIGN.md §7 steps 1–3)

Each arb cycle:

1. Load keeper hot cache (TTL hours, not ticks).
2. Map alts → CEX symbols; drop unlisted for v1 execution.
3. Read WS books (already running in-process).
4. Compare to last DEX mids. If no trigger and mids are fresh → **idle** (0 RPC).
5. On trigger: confirm that pair on-chain; quote Deca vs direct DEX vs CEX net out.
6. Compose inventory-aligned paths (CEX→DEX, DEX→CEX, DEX→DEX) as in DESIGN.md §3.
7. Gate `netProfitBps >= 10`. Pick highest. Re-quote finalists. Execute.
8. Ledger + 10-trade calibration unchanged from DESIGN.md §9.

CEX in step 5 is a **fillable book**, not a fair-value oracle — same as DESIGN.md §1.

---

## 8. Cost model reminder (do not mix V2 and arb)

| Cost | V2 | Arb |
|------|----|-----|
| DEX pool fee | Inside quoter amounts; do not subtract twice | Same |
| Deca / Core | **20 bps** net model used in V2 dry-runs | **+40 bps premium** on top of pool fee, plus protocol/bot stream fees (DESIGN.md §4.2) |
| CEX taker | Not paid (sensor) | Paid on CEX legs (Binance ~10 bps, Coinbase/Kraken higher) |
| Gas | In V2 net when we bother; often ignored for throughput | Always in the 10 bps gate |
| Gate | `minNetBps` / throughput floor (can be negative) | **Fixed 10 bps** |

If we copy V2’s 20 bps Deca number into arb-bot, Deca will look cheaper than DESIGN.md and win legs it should lose. Keep the two models in their packages.

---

## 9. Inventory (unchanged, still blocks naive WS→trade)

Watching a Binance print does not mean we can lift it.

v1 (DESIGN.md §8): only fire when the alt or base is **already** on the correct side (CEX account vs on-chain wallet). No mid-cycle withdraw/deposit.

So the watch plane can scream “LINK 18 bps cheap on Binance vs Uni” and arb-bot still no-ops if USDT is not on Binance or LINK is not on the wallet. That is correct. Phase 6 / TransferTracker is later.

---

## 10. Open questions (do not block V2)

1. Heartbeat interval for DEX mids when CEX never moves — 15 min vs 30 min vs only on hot-cache refresh.
2. Whether `priceAccuracyDECA` from keeper should **rank** `cexListed` or only annotate dry-runs.
3. Second CEX WS (Coinbase/Kraken) in V2 vs only in arb-bot Phase 1. Recommendation: **Binance-only in V2**; add others when arb-bot must fill there.
4. `dexOnly` watch (Swap logs) — V2 research path, not arb-bot v1.

---

## 11. Doc ownership

| File | Owns |
|------|------|
| [DESIGN.md](./DESIGN.md) | Profit gate, venues, execution, inventory, feedback, config schema |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Phase checklists — update Phase 1 to watch/confirm after V2 ships it |
| **This file** | Sequencing, watch plane, keeper universe, V2 handoff bar |
| `liquidity-bot-v2/PRODUCT.md` | V2 product loop (throughput, hot pairs, price/depth) |

When V2 watch-plane is live, tick the handoff list in §6 here, then start arb-bot at Phase 0 scaffold + Phase 1 rewritten as “port watch plane,” not “poll everything.”
