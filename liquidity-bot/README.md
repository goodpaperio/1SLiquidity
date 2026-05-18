# Liquidity Bot

Independent service for DecaStream opportunity trading (scan → direct swap → `placeTrade`). Does **not** call `executeTrades`.

See local **`ARCHITECTURE.md`** (gitignored) for full design.

## Setup

```bash
cd liquidity-bot
npm install
cp .env.example .env
```

Requires **Node.js ≥ 18** (use `nvm use` — see `.nvmrc` for Node 22).

If `npm run verify:*` fails with `@rollup/rollup-darwin-*` (npm optional-deps bug on Mac):

```bash
nvm use 22
npm run install:clean
npm run verify:c
```

Do not paste `# comments` on the same line as shell commands.

## Verify by phase

```bash
npm run verify:0    # scaffold
npm run verify:a    # config, pairs, sizing
npm run verify:b    # … (phase B+)
npm run verify:all  # build + all tests
```

## Bot lifecycle

```bash
npm run generate bot -- alpha [--write-env]   # create wallet + bots/alpha.json
npm run deploy bot -- alpha [--dry-run]       # rsync repo + scp config + remote build
npm run start bot -- alpha                    # pm2 start (requires npm run build)
npm run stop bot -- alpha
npm run status bot -- alpha
npm run withdraw bot -- alpha --to 0x... [--dry-run]
npm run scan:dry-run -- --bot alpha           # discover mode: quotes ~$50 notional, no balance needed
npm run scan:dry-run -- --bot alpha --max-pairs 20
npm run scan:dry-run -- --bot alpha --require-balance   # only if wallet holds bases
```

Install PM2 globally on the server: `npm i -g pm2`

## Development

```bash
npm run build
npm run dev
DRY_RUN=1 npm run scan:dry-run
```
