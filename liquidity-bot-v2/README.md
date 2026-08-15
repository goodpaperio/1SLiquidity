# Liquidity Bot V2

Sibling of [`../liquidity-bot`](../liquidity-bot) (V1). **V1 is unchanged**; this package implements the redesign in PRODUCT.md:

- **Hot pairs** — quote ≤10 pairs from keeper `GET /api/tokens/top` (+ disk cache)
- **Price-vs-depth** — prefer best-price DEX ≠ deepest-reserve DEX; rank by dislocation
- **Per-leg flags** — `leg1UsePriceBased` (off-chain thesis) / `leg2UsePriceBased` for Core `placeTrade`
- **Metrics** — per-cycle eth_call / multicall / hot-cache / skip reasons

Placement still: scan → DEX leg1 → `placeTrade` leg2. Settlement: **local-monitor**.

## Quick start

```bash
cd liquidity-bot-v2
npm install
cp ../liquidity-bot/.env.example .env   # or create fresh
# set MAINNET_RPC_URL, BOT_<ID>_KEY, HOT_PAIRS_API_BASE_URL, DRY_RUN=1

npm run generate bot -- <your-id> --write-env
# edit bots/<id>.json (defaults already V2: hot_pairs + price_vs_depth)

npm run scan:dry-run -- bot <id>
DRY_RUN=1 npm run run:once -- bot <id>
```

PM2 name: `liquidity-bot-v2-<id>` (see `ecosystem.config.cjs`).

## Config (V2 fields)

```jsonc
"scan": {
  "universeMode": "hot_pairs",       // or "static_json" emergency/research
  "hotPairsLimit": 10,
  "hotPairsMetric": "slippageSavings",
  "hotPairsCacheTtlMs": 3600000,
  "selectionMode": "price_vs_depth",
  "requirePriceNeDepth": true
},
"trade": {
  "leg1UsePriceBased": true,
  "leg2UsePriceBased": false
}
```

Env: `HOT_PAIRS_API_BASE_URL` → `{base}/api/tokens/top?...`

On API failure: last-good `bots/<id>.hot-pairs.json` only — never silently widen to full static JSON.

## Tests

```bash
npx vitest run tests/phase-v2
npm run verify:all   # full suite (mirrors V1 phases where applicable)
```

## Docs

- This README — V2 ops
- [`PRODUCT.md`](./PRODUCT.md) — redesign notes (copied from V1; source of truth for intent)
- [`../BOTS.md`](../BOTS.md) — how V1 / V2 / arb-bot sit in the monorepo
- [`../docs/STUCK_TRADES_AND_MONITOR.md`](../docs/STUCK_TRADES_AND_MONITOR.md) — stuck trades / monitor
