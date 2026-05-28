# Liquidity Bot — Design (TLDR + scope)

Operational goal: **drive liquidity through DecaStream** by trading regularly on cross-DEX dislocations, not only when static arb thresholds fire.

---

## TLDR — revised model

| Topic | Decision |
|-------|----------|
| **Spread metric** | **Coupled forward + backward** at trade size: WETH → alt (thin buy) → WETH (deep sell). `coupledSpreadBps` = signed round-trip bps. |
| **Directional scans** | **Forward**: base→alt on all DEXs vs deepest buy. **Backward**: alt→base on all DEXs vs deepest sell (alt size = deep-buy out at nominal). Reported separately **and** as coupled column. |
| **Deca gate** | **Yes/no**: buy on **non-deepest** forward pool; sell path uses **deepest sell `reserveIn`** (StreamDaemon / `usePriceBased: false`). |
| **Selection** | Each run: compute coupled spread for all viable pairs → **mid-range band (p25–p75)** on coupled → **pick highest coupled in band** → execute (cooldown fallback to next in band). |
| **No fixed floor** | No 300 bps minimum for this mode; always trade best-in-band when candidates exist. |
| **Safety** | Keep `maxSpreadBps`, `maxSellReserveUsageBps`, `minLiquidityRatio`. |
| **Coupled floor** | `minCoupledSpreadBps: -100` (~**1%** max quoted round-trip loss); drop worse routes before mid-range. |
| **Selection mode** | `mid_range_spread` (wired in `scan:dry-run` / `run:once`) or legacy `round_trip`. |
| **Repeat guard** | `minTradesBetweenSamePair: 4` — if COMP traded (fwd or rev), block COMP for the **next 4** live picks. History: `bots/<id>.trade-history.json`. DRY_RUN does not append. |
| **Reverse path** | Only when wallet holds alt: leg1 alt→base direct, leg2 Deca base→alt. Scanned alongside forward when balance exists. |
| **PnL** | Nice-to-have; **liquidity throughput** is primary. Expect many trades with **negative quoted coupled spread** at small nominal — pick “least bad” in normal cluster. |
| **Not the same as** | Buy-only max spread (pyusd 782 bps forward, −1680 coupled). Isolated forward/backward positives do **not** imply profitable round-trip. |

---

## Execution flow (each `run:once` / scan cycle)

1. Load bot config, pair roster, nominal `amountIn` per base.
2. **Quote forward** — base→alt on all stream DEXes.
3. **Per pair — matrix row**
   - `forwardSpreadBps`: max thin vs deep **buy**.
   - `altRef`: alt out from **deep buy** at `amountIn`.
   - **Quote backward** — alt→base on all DEXes at `altRef`.
   - `backwardSpreadBps`: max vs **deep sell** (max `reserveIn`).
   - **Build candidate edges** — thin buy + sell on deep pool at **full thin-buy alt out** → `coupledSpreadBps`, `decaViable`.
4. **Safety filter** on candidate edges.
5. **Mid-range** on `coupledSpreadBps` (deca-viable rows only): band = [p25, p75].
6. **Pick** max `coupledSpreadBps` in band (fallback: global max if band empty).
7. **Execute** — leg1 direct swap (thin); leg2 `Core.placeTrade` (deep sell DEX).
8. Log band, eligible count, pick, fwd/bwd/coupled bps.

---

## Quoting (no separate price API)

- V2/Sushi: `getAmountsOut(amountIn, path)`
- V3: `QuoterV2.quoteExactInputSingle`
- **Coupled** always uses **full alt** from thin buy for the sell quote.

---

## CLI tools

| Command | Purpose |
|---------|---------|
| `npm run scan:pair-matrices -- --bot alpha` | Forward \| backward \| coupled table + mid-range pick preview |
| `npm run scan:spread-stats -- --bot alpha` | Distribution stats across all candidate edges |
| `npm run scan:ecosystem -- --bot alpha` | Ranked ecosystem / diagnostics |
| `npm run scan:dry-run -- --bot alpha` | Scan without execute |
| `DRY_RUN=0 npm run run:once -- --bot alpha` | Scan + execute best (selection mode TBD in code) |

### Pair matrices (recommended)

```bash
cd liquidity-bot
npm run scan:pair-matrices -- --bot alpha
npm run scan:pair-matrices -- --bot alpha --top 30 --json /tmp/pair-matrices.json
npm run scan:pair-matrices -- --bot alpha --max-pairs 20   # smoke test
```

---

## Implementation status

| Item | Status |
|------|--------|
| `buildCandidateEdges` / coupled spread | Done |
| `scan:pair-matrices` CLI | Done |
| `src/selection/` mid-range + wire into `QuoteScanner` / `run:once` | Done |
| `scan.selectionMode: mid_range_spread` in config | Done |
| `LIQUIDITY_BOT_DESIGN.md` | This document |

---

## Key empirical note ($10 WETH nominal, mainnet scan)

- **Forward > 0**: many pairs.
- **Backward > 0**: many pairs (at deep-buy alt ref).
- **Coupled > 0**: rare/0 in sample — mid-range selection trades **best in the normal loss cluster**, not “arb profit,” unless market moves.

---

## Related docs

- `liquidity-bot/ARCHITECTURE.md` — runtime architecture
- `src/StreamDaemon.sol` — on-chain sell routing (`reserveIn` mode)
