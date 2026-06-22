# Liquidity Bot

Independent service for DecaStream opportunity trading:

**scan → DEX leg1 → `placeTrade` (leg2)**

It does **not** call `executeTrades`. Open Core trades are streamed and settled by **[local-monitor](../local-monitor/README.md)** (cron on a separate host, every ~5 min). Both must be running for round-trips to complete.

See also:

- [`docs/STUCK_TRADES_AND_MONITOR.md`](../docs/STUCK_TRADES_AND_MONITOR.md) — stuck trades, monitor failures, auto-cancel
- [`docs/LDO_DECASTREAM_LEG2_FAILURE.md`](../docs/LDO_DECASTREAM_LEG2_FAILURE.md) — example token issue (excluded via `scan.excludedTargets`)

---

## Before you run your own bot

**`alpha` is the shared production instance.** Pick a **new bot id** for your deployment (e.g. `beta`, `sigma`, `atlas`). That id is used everywhere: config file, env var name, PM2 process name, Telegram message prefix.

Each teammate should use:

- Their **own bot id** and wallet
- Their **own EC2** (or a host you coordinate — never share `alpha`'s key or PM2 name)
- Their **own Telegram** bot token + chat id

---

## Architecture (two services)

| Service | Host | Job |
|---------|------|-----|
| **liquidity-bot** | Your EC2 + PM2 | Scan pairs, DEX swap, `placeTrade` |
| **local-monitor** | Usually a different EC2 + cron | `executeTrades(pairId)` until trades complete |

If monitor stops, trades stay **OPEN** on Core. With `maxOpenTrades: 1`, the liquidity-bot will not open new trades until the open one completes or is cancelled.

---

## 1. Local setup

```bash
cd liquidity-bot
npm install
cp .env.example .env
```

Requires **Node.js ≥ 18** (`nvm use` — see `.nvmrc` for Node 22).

If `npm run verify:*` fails with `@rollup/rollup-darwin-*` on Mac:

```bash
nvm use 22
npm run install:clean
npm run verify:c
```

---

## 2. Generate wallet and bot config

From `liquidity-bot/`:

```bash
npm run generate bot -- <your-bot-id> --write-env
```

This creates:

- `bots/<your-bot-id>.json` — bot config
- `BOT_<YOUR_BOT_ID>_KEY` in `.env` (keep `.env` at `chmod 600`)

Example: id `sigma` → env var `BOT_SIGMA_KEY`.

### Edit `bots/<your-bot-id>.json`

| Field | What to set |
|--------|-------------|
| `baseTokens` | Bases you hold and scan from, e.g. `["WETH"]` |
| `trade.nominalTradeUsd` | Target trade size in USD per leg (uses `ETH_USD` / `BTC_USD` in `.env`) |
| `trade.balanceUsagePct` | Max % of wallet balance per trade (e.g. `45`) |
| `trade.maxOpenTrades` | Max concurrent open Core trades (default `1` for conservative ops) |
| `trade.stuckCancelAfterCycles` | Auto-`cancelTrade` after N scan cycles with same open trade (default `3`; `0` = off) |
| `trade.pairCooldownMs` | Don't re-trade same pair within this window after a fill (default 15 min) |
| `trade.minTradesBetweenSamePair` | Block same pair for N subsequent picks after a live trade |
| `scan.intervalMs` | Time between scan cycles in PM2 loop (e.g. `900000` = 15 min) |
| `scan.excludedTargets` | Pair names to skip (case-insensitive; e.g. `["ldo"]` — see LDO doc) |
| `scan.minSpreadBps` / `maxSpreadBps` | Spread band for candidate selection |
| `scan.minCoupledSpreadBps` | Floor on signed round-trip bps (reject worse than this) |
| `gas.minEthWei` / `targetEthWei` | ETH balance targets for gas refuel logic |
| `enabled` | Keep `false` until ready for PM2; use `run:once` for testing first |

Core address and deployment manifest are pre-filled for mainnet v2.2.1 — only change if targeting another Core deployment.

---

## 3. Environment variables (`liquidity-bot/.env`)

| Variable | Required | Notes |
|----------|----------|--------|
| `MAINNET_RPC_URL` | **Yes** | Ethereum mainnet HTTP RPC ([Alchemy](https://www.alchemy.com/) / [Infura](https://www.infura.io/)) |
| `BOT_<ID>_KEY` | **Yes** | Set by `generate bot` (e.g. `BOT_SIGMA_KEY`) |
| `DRY_RUN` | **Yes** | `1` = scan only, no txs. `0` = live trades |
| `ETH_USD` | Recommended | Spot ETH/USD for sizing (defaults to `3500` if unset) |
| `BTC_USD` | Optional | Only if `WBTC` is in `baseTokens` |
| `TELEGRAM_ENABLED` | Optional | `1` to enable alerts |
| `TELEGRAM_BOT_TOKEN` | If Telegram | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | If Telegram | Your chat or group id |
| `DEPLOY_HOST` | Optional | `ubuntu@your-ec2.amazonaws.com` for `npm run deploy bot` |
| `DEPLOY_PATH` | Optional | Remote repo path (e.g. `/home/ubuntu/1SLiquidity`) |

---

## 4. Fund the bot wallet

Send to the address printed by `generate bot`:

| Asset | Purpose |
|-------|---------|
| **WETH** (or other `baseTokens`) | Trade inventory for leg1 / settlement |
| **ETH** | Gas for swaps and `placeTrade` |

Template defaults target **~0.0015–0.003 ETH** minimum gas (`gas.minEthWei` / `gas.targetEthWei`). Start with a bit more headroom on mainnet.

Check balance on server or locally:

```bash
# after RPC + key are in .env
npm run status bot -- <id>
```

---

## 5. AWS EC2 setup (liquidity-bot host)

### Create the instance

1. [AWS EC2 console](https://console.aws.amazon.com/ec2) → **Launch instance**
2. **Name:** e.g. `1SLiquidity-bot-sigma`
3. **OS:** Ubuntu Server 22.04 LTS
4. **Type:** `t3.micro` is enough for the scanner loop
5. **Key pair:** Create new → save `.pem` locally
6. **Security group:** Allow **SSH (22)** from your IP only
7. Launch and note the **public IP**

### Prepare your laptop

```bash
chmod 400 ~/.ssh/your-bot-key.pem
ssh -i ~/.ssh/your-bot-key.pem ubuntu@YOUR_EC2_IP
```

### First-time server setup

On the EC2 instance:

```bash
# Node 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22
nvm use 22

# PM2 for the bot loop
npm i -g pm2

# Clone repo
git clone https://github.com/goodpaperio/1SLiquidity.git ~/1SLiquidity
cd ~/1SLiquidity/liquidity-bot
npm ci --include=optional
npm run build
```

### Copy secrets to the server

**Never commit `.env` or bot keys.** Copy from your laptop:

```bash
scp -i ~/.ssh/your-bot-key.pem liquidity-bot/.env ubuntu@YOUR_EC2_IP:~/1SLiquidity/liquidity-bot/.env
scp -i ~/.ssh/your-bot-key.pem liquidity-bot/bots/sigma.json ubuntu@YOUR_EC2_IP:~/1SLiquidity/liquidity-bot/bots/sigma.json
ssh -i ~/.ssh/your-bot-key.pem ubuntu@YOUR_EC2_IP 'chmod 600 ~/1SLiquidity/liquidity-bot/.env'
```

Set `DRY_RUN=0` only when you are ready for live trades.

### local-monitor (separate)

The **stream executor** usually runs on its own EC2 with cron + AWS Secrets Manager. See [`server/README.md`](../server/README.md) and [`local-monitor/README.md`](../local-monitor/README.md). You need **something** calling `executeTrades` on Core — without it, trades will sit open until auto-cancel or manual cancel.

---

## 6. Deploy and start from your laptop

Repo-root helpers (override host/key/id with args or env):

| Env var | Default | Purpose |
|---------|---------|---------|
| `LIQUIDITY_BOT_HOST` | production alpha IP in scripts | Your EC2 IP |
| `LIQUIDITY_BOT_SSH_KEY` | `~/.ssh/liquidity-bot-alpha.pem` | Your `.pem` path |
| `LIQUIDITY_BOT_ID` | `alpha` | Your bot id |

### Initial deploy (git pull + build + PM2)

```bash
# from repo root
npm run redeploy-liquidity-bot -- <server-ip> <path-to-pem> <your-bot-id> main
```

### Turn bot ON (pull, enabled:true, build, PM2 start)

```bash
npm run liquidity-bot:on -- <server-ip> <path-to-pem> <your-bot-id>
# alias: npm run start-liquidity-bot
```

### Turn bot OFF (PM2 stop, enabled:false)

```bash
npm run liquidity-bot:off -- <server-ip> <path-to-pem> <your-bot-id>
# alias: npm run pause-liquidity-bot
```

### SSH shell / logs

```bash
npm run open-liquidity-bot-ssh -- <server-ip> <path-to-pem>
npm run open-liquidity-bot-ssh -- 'pm2 logs liquidity-bot-<your-bot-id> --lines 100'
```

### Alternative: `npm run deploy bot`

From `liquidity-bot/` with `DEPLOY_HOST` and `DEPLOY_PATH` in `.env`:

```bash
npm run deploy bot -- <your-bot-id>
```

---

## 7. Safety guards and operational limits

The bot is designed to probe DecaStream pair quality safely. Key guards:

### Trade lifecycle

| Guard | Config | Behaviour |
|-------|--------|-----------|
| **Dry run** | `DRY_RUN=1` in `.env` | Full scan cycle, no on-chain txs |
| **Max open trades** | `trade.maxOpenTrades` | Skip new cycles while Core has ≥ N open trades for this wallet |
| **Stuck trade auto-cancel** | `trade.stuckCancelAfterCycles` (default `3`) | Each scan cycle (~15 min) increments a counter in `bots/<id>.stuck-trade.json`. After **3 consecutive cycles** with the same open trade (~45 min), bot calls `cancelTrade`, updates ledger, logs token issue. Set `0` to disable. |
| **Manual cancel** | CLI | `npm run cancel:trade -- --bot <id> --list` / `--trade-id <n>` |

### Token / pair quality

| Guard | Config | Behaviour |
|-------|--------|-----------|
| **Excluded targets** | `scan.excludedTargets` | Skip pairs by name (e.g. `["ldo"]` after leg2 failures — see LDO doc) |
| **Token issue log** | `bots/<id>.token-issues.jsonl` | Auto-cancel and leg2 failures append rows for review before adding to `excludedTargets` |
| **Pair cooldown** | `trade.pairCooldownMs` | No re-trade on same pair within window after a fill |
| **Repeat guard** | `trade.minTradesBetweenSamePair` | Force diversity across recent picks |
| **Spread band** | `scan.minSpreadBps`, `maxSpreadBps` | Ignore too-thin or suspiciously wide quotes |
| **Coupled floor** | `scan.minCoupledSpreadBps` | Reject round-trips worse than threshold |
| **Dust / liquidity** | `dustFloorUsd`, `maxSellReserveUsageBps` | Skip tiny or book-heavy sizes |

### Gas

| Guard | Config | Behaviour |
|-------|--------|-----------|
| **Gas refuel** | `gas.minEthWei`, `targetEthWei`, `refuelDex` | Top up ETH via configured DEX when balance is low (see `src/execution/gasRefuel.ts`) |

### On-chain files (per bot, gitignored)

| File | Purpose |
|------|---------|
| `bots/<id>.trade-ledger.jsonl` | Open / completed / failed / cancelled trades |
| `bots/<id>.stuck-trade.json` | Stuck-cycle counter for auto-cancel |
| `bots/<id>.token-issues.jsonl` | Suspect tokens for DecaStream review |
| `bots/<id>.notify-state.json` | TradeCompleted event cursor for Telegram |
| `bots/<id>.state.json` | Runner heartbeat |

---

## 8. Telegram notifications

Real-time alerts use **your own** bot token and chat id on **your** instance. Messages are prefixed with `bot=<id>`.

### Setup (once per bot / channel)

1. Create a bot via [@BotFather](https://t.me/BotFather) → save **token**
2. Open a chat with your bot (or add it to a private group) and send a message
3. Get **chat id** from `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Add to `liquidity-bot/.env` on the **server** (and locally for testing):

```bash
TELEGRAM_ENABLED=1
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

5. Smoke test (local or SSH on server):

```bash
npm run notify:test -- <your-bot-id>
```

Restart PM2 after changing Telegram env vars:

```bash
npm run liquidity-bot:off -- ... && npm run liquidity-bot:on -- ...
```

### What you receive in real time (live `DRY_RUN=0`)

| Event | When |
|-------|------|
| **Leg1** | DEX swap confirmed (base → alt or reverse) |
| **Leg2** | `placeTrade` confirmed; trade id and amounts |
| **Leg2 failed** | `placeTrade` or approve failed (inventory may be stranded on alt — review logs) |
| **Trade completed** | Core `TradeCompleted` event detected; includes P/L vs leg1 |

Auto-cancel and manual cancel are logged to **PM2 logs** and `token-issues.jsonl` / ledger — they do not yet send a dedicated Telegram message.

### Daily summary (optional cron on EC2)

```bash
# on server, after PM2 is set up
pm2 start "npm run notify:daily -- <your-bot-id>" --name notify-daily-<id> --cron "0 0 * * *" --no-autorestart
pm2 save
```

Or run manually: `npm run notify:daily -- <your-bot-id>` (yesterday UTC rollup).

---

## 9. Bot lifecycle commands

Replace `<id>` with your bot id.

### On the server (`liquidity-bot/`)

```bash
npm run build
npm run scan:dry-run -- bot <id>              # quotes only, no txs
npm run scan:dry-run -- bot <id> --max-pairs 20
DRY_RUN=1 npm run run:once -- bot <id>        # full cycle, no txs
DRY_RUN=0 npm run run:once -- bot <id>        # single live trade
npm run start bot -- <id>                     # PM2 loop (set enabled:true in bots/<id>.json)
npm run stop bot -- <id>
npm run status bot -- <id>
npm run cancel:trade -- --bot <id> --list
npm run cancel:trade -- --bot <id> --trade-id <n>
npm run withdraw bot -- <id> --to 0x... [--dry-run]
npm run notify:test -- <id>
npm run notify:daily -- <id>
```

After first PM2 start: `pm2 save` and optionally `pm2 startup` for reboot persistence.

### Recommended go-live sequence

1. `DRY_RUN=1` → `scan:dry-run` and `run:once` locally
2. Deploy to EC2, confirm **local-monitor** is executing trades on Core
3. Fund wallet (WETH + ETH)
4. `TELEGRAM_ENABLED=1` → `notify:test`
5. One live `DRY_RUN=0 run:once` on server; confirm leg1/leg2 Telegram + monitor completes stream
6. `npm run liquidity-bot:on` with `enabled:true`

---

## 10. Verify by phase

```bash
npm run verify:0    # scaffold
npm run verify:a    # config, pairs, sizing
npm run verify:b    # bot lifecycle (generate, deploy, pm2)
npm run verify:c    # scan, selection, trade history
npm run verify:integration   # direct swap, placeTrade, gas refuel, runner cycle
npm run verify:all  # build + all tests
```

---

## 11. Development

```bash
npm run build
npm run dev
DRY_RUN=1 npm run scan:dry-run
```

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Bot not trading | `enabled:true`? `DRY_RUN=0`? Outstanding trades ≥ `maxOpenTrades`? PM2 logs |
| Trade stuck open | Is local-monitor cron running? `docs/STUCK_TRADES_AND_MONITOR.md` |
| Trade auto-cancelled | `bots/<id>.token-issues.jsonl` — review before excluding pair |
| No Telegram | `TELEGRAM_ENABLED=1`, token/chat id on **server** `.env`, PM2 restarted |
| Leg2 failures on one alt | Document like LDO, add to `scan.excludedTargets` |

Manual inspect open trades:

```bash
npm run cancel:trade -- --bot <id> --list
```
