# Liquidity Bot

Independent service for DecaStream opportunity trading (scan → direct swap → `placeTrade`). Does **not** call `executeTrades` — open trades are streamed/settled by **local-monitor** elsewhere.

See local **`ARCHITECTURE.md`** (gitignored) for full design.

## Before you run your own bot

**`alpha` is the shared production instance** — pick a **new bot id** for your instance (e.g. `beta`, `sigma`, `atlas`). That id is used everywhere: config file, env var name, PM2 process name.

### 1. Choose your bot id and generate a wallet

From `liquidity-bot/`:

```bash
npm run generate bot -- <your-bot-id> --write-env
```

This creates `bots/<your-bot-id>.json`, a fresh wallet, and `BOT_<YOUR_BOT_ID>_KEY` in `.env` (chmod 600 .env). Example: id `sigma` → env var `BOT_SIGMA_KEY`.

Edit `bots/<your-bot-id>.json` before going live:

| Field | What to set |
|--------|-------------|
| `baseTokens` | Bases you will hold and scan from, e.g. `["WETH"]` or `["WETH", "USDC"]` |
| `trade.nominalTradeUsd` | Target trade size in **USD** per leg (e.g. `10`). Converted to token amount using `ETH_USD` / `BTC_USD` in `.env` |
| `trade.balanceUsagePct` | Max % of wallet balance per trade (e.g. `45` = 45%). Actual size = `min(nominalTradeUsd, balance × this %)` |
| `scan.intervalMs` | Time between scan cycles in PM2 loop (e.g. `900000` = 15 min) |
| `enabled` | Keep `false` until you are ready for the PM2 loop; use `run:once` for testing first |

Core mainnet address and pair manifest are pre-filled in the template — only change if deploying against a different Core version.

### 2. Configure `liquidity-bot/.env`

Copy and fill in (no CoinGecko key required for the bot):

```bash
cp .env.example .env
```

| Variable | Required | Notes |
|----------|----------|--------|
| `MAINNET_RPC_URL` | **Yes** | Ethereum mainnet HTTP RPC — [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) |
| `BOT_<ID>_KEY` | **Yes** | Set by `generate bot` (e.g. `BOT_SIGMA_KEY`) |
| `DRY_RUN` | **Yes** | `1` = scan only, no txs. `0` = live trades |
| `ETH_USD` | Recommended | Spot ETH/USD for sizing (e.g. `1990`). Defaults to `3500` if unset — trades will be smaller than `nominalTradeUsd` suggests |
| `BTC_USD` | Optional | Only if `WBTC` is in `baseTokens` |

### 3. Fund the bot wallet

Send to the address printed by `generate bot`:

- **Base token** (e.g. WETH) for trades
- **ETH** for gas (template targets ~0.0015–0.003 ETH minimum via `gas.minEthWei`)

### 4. Deploy to your EC2 instance

Each teammate needs their **own EC2** (or distinct bot id on a shared host you coordinate). Production `alpha` already runs on the dedicated liquidity-bot host — do not reuse its wallet or PM2 name.

On the server: clone repo, `npm ci && npm run build` in `liquidity-bot/`, copy `.env` and `bots/<id>.json`, fund wallet.

From your laptop (repo root), after setting SSH access:

```bash
# optional: set LIQUIDITY_BOT_HOST, LIQUIDITY_BOT_SSH_KEY, LIQUIDITY_BOT_ID
npm run redeploy-liquidity-bot -- <server-ip> <path-to-pem> <your-bot-id> main
```

### 5. Prerequisites for live trading

- **local-monitor** running somewhere — streams and settles `placeTrade` positions on Core
- **`maxOpenTrades`** in bot config (default `1`) — bot skips new cycles while a trade is open on Core
- Start with **`DRY_RUN=1`**, then one live **`run:once`**, then enable the PM2 loop

---

## Local setup

```bash
cd liquidity-bot
npm install
cp .env.example .env
# edit .env, then generate your bot (see above)
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
npm run verify:b    # bot lifecycle (generate, deploy, pm2)
npm run verify:c    # scan, selection, trade history
npm run verify:integration   # execution + runner cycle (direct swap, placeTrade, gas refuel)
npm run verify:all  # build + all tests
```

## Bot lifecycle

Replace `<id>` with your bot id (not `alpha` unless you own that instance).

### On the server (`liquidity-bot/`)

```bash
npm run build
npm run scan:dry-run -- bot <id>              # DRY_RUN=1: quote universe, no txs
npm run scan:dry-run -- bot <id> --max-pairs 20
DRY_RUN=1 npm run run:once -- bot <id>        # full cycle, no txs
DRY_RUN=0 npm run run:once -- bot <id>        # single live trade (check open trades first)
npm run start bot -- <id>                     # PM2 loop (set enabled:true in bots/<id>.json)
npm run stop bot -- <id>
npm run status bot -- <id>
npm run withdraw bot -- <id> --to 0x... [--dry-run]
```

Install PM2 on the server: `npm i -g pm2` then `pm2 save` after first start.

### From your laptop (repo root)

Remote helpers default to the shared liquidity-bot EC2; override with env or args:

```bash
npm run open-liquidity-bot-ssh                 # interactive shell
npm run liquidity-bot:logs                     # tail PM2 logs (alpha id in script — adjust or SSH manually for other ids)
npm run liquidity-bot:on                       # git pull, enabled:true, build, pm2 start
npm run liquidity-bot:off                      # pm2 stop, enabled:false
```

For a **different bot id or host**, SSH in and use the server commands above, or pass host/key/id to `scripts/start-liquidity-bot.sh`.

View logs for a specific bot:

```bash
npm run open-liquidity-bot-ssh -- 'pm2 logs liquidity-bot-<id> --lines 100'
```

## Development

```bash
npm run build
npm run dev
DRY_RUN=1 npm run scan:dry-run
```
