# Liquidity Bot

Independent service for DecaStream opportunity trading (scan → direct swap → `placeTrade`). Does **not** call `executeTrades`.

See local **`ARCHITECTURE.md`** (gitignored) for full design.

## Setup

```bash
cd liquidity-bot
npm install
cp .env.example .env
```

Requires **Node.js ≥ 18** (Node 20+ recommended).

## Verify by phase

```bash
npm run verify:0    # scaffold
npm run verify:a    # config, pairs, sizing
npm run verify:b    # … (phase B+)
npm run verify:all  # build + all tests
```

## Bot lifecycle (phased)

```bash
npm run generate bot -- alpha      # phase B — create bot locally
npm run deploy bot -- alpha        # phase B — push to AWS
npm run start bot -- alpha         # phase B — start on server
npm run scan:dry-run -- --bot alpha  # phase C
```

## Development

```bash
npm run build
npm run dev
DRY_RUN=1 npm run scan:dry-run
```
