# CLAUDE.md

This file is the working context guide for agents operating in `liquidity-bot/` and adjacent parts of the `1SLiquidity` repo.

It is intentionally practical rather than aspirational. It captures:

- what the liquidity bot actually does
- how it interacts with `local-monitor`, Core, Telegram, and AWS
- what production `alpha` looks like
- the recent Liquifier / Permit2 debugging history
- the files and commands agents should reach for first

If you are a future agent, read this before making changes.

## Repo Context

This repository contains multiple systems. For liquidity-bot work, the important directories are:

- `liquidity-bot/` - the PM2-driven trading bot
- `local-monitor/` - the separate trade streaming / settlement executor
- `server/` - monitor deployment, cron, shell health checks
- `docs/` - incident writeups and operational notes
- `versions/` - deployment manifests
- `splittter/contracts/` - Liquifier and protocol contracts used by the bot

The liquidity bot is not a complete round-trip system on its own. It places trades, but it does not execute or stream them after placement. That is the monitor's job.

## High-Level Architecture

The trading loop is:

1. Scan candidate pairs from the configured base tokens.
2. Choose a finalist based on spread / coupled spread / cooldown / repeat guard logic.
3. Execute leg 1 on a DEX.
4. Execute leg 2 by calling `placeTrade` on Core.
5. Wait for `local-monitor` to call `executeTrades(pairId)` until the Core trade completes.

There are two independent services:

| Service | Responsibility | Typical host/runtime |
|---|---|---|
| `liquidity-bot` | Scan, direct swap, `placeTrade`, maintenance, Telegram operator commands | EC2 + PM2 |
| `local-monitor` | Historical scan + `executeTrades(pairId)` for open Core trades | Usually separate EC2 + cron |

Operational consequence:

- if `local-monitor` fails, trades stay open
- with `trade.maxOpenTrades = 1`, the liquidity bot stops opening new trades until the open trade completes or is cancelled
- this means many "bot stopped trading" incidents are actually monitor incidents

Relevant docs:

- `../docs/STUCK_TRADES_AND_MONITOR.md`
- `../local-monitor/README.md`
- `../server/QUICKSTART.md`

## Production Alpha Context

Known production bot:

- bot id: `alpha`
- wallet: `0xfa59F5143CE0d3AEe8D63Adb56bDd756e14BF2d3`
- EC2 host used in helper scripts: `13.40.113.237`
- SSH key path commonly used locally: `~/.ssh/liquidity-bot-alpha.pem`
- PM2 process name: `liquidity-bot-alpha`

Important production config from `bots/alpha.json`:

- base token: `WETH`
- scan interval: `1500000` ms (~25 minutes)
- `maxOpenTrades: 1`
- `pairCooldownMs: 900000`
- `minTradesBetweenSamePair: 4`
- `skipRecentTargetsCount: 10`
- `excludedTargets: ["ldo"]`
- daily liquify enabled at `11:00 UTC`
- liquifier proxy: `0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95`
- core: `0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710`

Do not assume `alpha` is a template. It is the shared production instance and has its own history, artifacts, and operational quirks.

## Bot Runtime Model

Main runtime class:

- `src/runner/BotRunner.ts`

Key runtime behavior:

- starts the scanner
- starts Telegram polling for operator commands
- starts the daily liquify scheduler
- runs one cycle immediately
- then loops every `scan.intervalMs`
- writes heartbeat state to `bots/<id>.state.json`

Cycle order in `BotRunner`:

1. `runBotMaintenance()`
2. stale-trade alert check
3. pause check
4. trade completion polling
5. stuck trade auto-cancel
6. outstanding trade count guard
7. scan + finalist refresh
8. execute chosen trade if any

Important runtime flags / in-memory states:

- `cycleInFlight`
- `liquifyInFlight`
- `pausedByOperator`

Important persisted files under `bots/`:

- `<id>.state.json` - heartbeat + maintenance alert timestamps
- `<id>.trade-ledger.jsonl` - canonical placement ledger
- `<id>.trade-history.json` - repeat guard memory
- `<id>.cooldowns.json` - pair cooldown state
- `<id>.stuck-trade.json` - stuck trade counter
- `<id>.notify-state.json` - completion notification cursor
- `<id>.telegram-state.json` - Telegram command polling cursor
- `<id>.token-issues.jsonl` - operator review log for failed/stuck assets

## How Trades Are Chosen

Core selection logic lives around:

- `src/scan/QuoteScanner.ts`
- `src/scan/collectQuotes.ts`
- `src/selection/selectForExecution.ts`
- `src/selection/finalistRefresh.ts`
- `src/scan/tradeHistory.ts`
- `src/scan/pairCooldown.ts`

Important behavior that often surprises people:

- live mode scans from held balances, not hypothetical balances
- if the wallet has no usable base token, many pairs are skipped
- recent target filtering and repeat guard can suppress otherwise valid opportunities
- "No eligible pick this cycle" does not necessarily mean the bot is broken

Typical reasons for long no-trade periods:

- no WETH inventory
- one alt token stranded in wallet and filtered by `skipRecentTargetsCount`
- outstanding Core trade blocks new placements
- no spread in the configured band
- repeat guard / cooldown disqualifies the only viable pair
- monitor failure keeps trades open
- liquify failures prevent dust from being recycled back into WETH

## Trade Execution Path

Trade execution lives around:

- `src/execution/TradeExecutor.ts`
- `src/chain/core.ts`
- `src/execution/gasRefuel.ts`

The bot does:

- DEX leg 1 first
- then `placeTrade` on Core as leg 2

This means a leg 2 failure can strand inventory from leg 1 in the wallet. That is why Telegram and ledgering around leg 2 failures matter.

Trade ledger is the best on-disk source of truth for recent placements:

- `src/notify/tradeLedger.ts`

Treat `trade-ledger.jsonl` as the operational source for "has the bot actually placed anything recently?"

## local-monitor Responsibilities

The bot does not stream or settle trades. `local-monitor` does.

Relevant commands in `local-monitor/`:

- `npm run historical`
- `npm run execute-trades`
- `npm run test-workflow`

Relevant files:

- `local-monitor/src/monitor.ts`
- `local-monitor/src/execute-trades.ts`
- `local-monitor/localData.json`

Important operational fact:

- `local-monitor` may run on a different EC2 host than the bot
- many liquidity-bot incidents are downstream of monitor liveness
- `server/run-monitor.sh` and `server/monitor-health.sh` are part of that operational story

The monitor host commonly uses cron every 5 minutes.

## Telegram / Operator Bot

Shared helper:

- `src/notify/telegram.ts`

Telegram command polling:

- `src/notify/telegramCommands.ts`

Supported commands:

- `/status`
- `/liquify`
- `/pause`
- `/resume`
- `/help`

Current behavior:

- commands are accepted only from the configured `TELEGRAM_CHAT_ID`
- the loop polls every ~5 seconds while the bot is running
- `/pause` pauses trading only; maintenance still runs
- `/liquify` triggers a forced liquify sweep

Notification categories currently present:

- leg 1 confirmed
- leg 2 confirmed
- leg 2 failed
- trade completed
- liquify sweep success/failure
- gas top-up
- low native ETH
- no-trades-for-2h warning

Recent addition:

- `src/ops/tradeHealthCheck.ts`
- `notify:stale-trades` script in `package.json`

This warns operators if no leg2-confirmed trade has been placed for 2 hours. It reads the ledger and rate-limits alerts using `lastStaleTradeAlertAt` in bot state.

## Maintenance and Liquify

Main maintenance entrypoints:

- `src/ops/botOps.ts`
- `src/ops/gasSelfSustain.ts`
- `src/ops/liquifySweep.ts`

Maintenance does two main things:

1. low-ETH mitigation
   - if native ETH is below `gas.minEthWei` and WETH is insufficient for the top-up, run **liquify** on allowlisted dust alts → WETH (when `liquify.enabled`)
   - then unwrap WETH up to `gas.targetEthWei`
   - if there is not enough WETH, it falls back to swapping the first funded configured base token (for example `USDT`) → `WETH` on `gas.refuelDex`, then unwraps to ETH
   - if it still cannot self-fund, it sends a Telegram warning

2. daily liquify
   - runs once daily at `liquify.dailySweepHourUtc` (alpha uses 11:00 UTC)
   - can also be triggered manually by `/liquify`
   - sweeps allowlisted dust tokens back into the primary base token, usually WETH

### Liquifier design notes

The bot's liquify feature is not just a convenience. It is operationally important because dust and stranded inventory can accumulate and otherwise stop the bot from finding forward WETH trades.

Key pieces:

- bot side route building: `src/ops/liquifySweep.ts`
- fork harness: `liquify-fork.ts`
- fork environment prep: `src/ops/forkLiquifySetup.ts`
- on-chain contract source: `../splittter/contracts/src/LiquifierV1.sol`

### Liquifier / Permit2 history

This repo has a major recent incident around the Liquifier's Permit2 integration.

Original root cause discovered in debugging:

- the contract-side Permit2 batch permit struct omitted `spender`
- Uniswap Permit2 expects `spender` in the typed data and calldata
- that caused `permitBatchTransferFrom` to revert before swaps happened

The expected contract-side fix is:

- add `address spender` to `IPermit2.PermitBatchTransferFrom`
- populate it with `address(this)` in `_batchPull`

Agents should not assume this is fully resolved on mainnet just because a proxy upgrade happened.

### Current Liquifier status caveat

At the time this guide was written, local debugging indicated:

- swap execution on fork works when using `MockPermit2`
- real Permit2 calls were still reverting during fork and `eth_call` simulation
- a recent deployed implementation address was `0xf5aeb89442f4e5af6565572a4a35253a0fa44fe9`
- local source inspection showed the `spender` fix was not present in the checked-in `splittter/contracts/src/LiquifierV1.sol` until it was re-applied locally

That means future agents should verify all three of these before declaring Liquifier fixed:

1. checked-in source includes the `spender` field
2. deployed implementation bytecode corresponds to that fixed source
3. fork or mainnet `staticCall` for `liquify` succeeds with real Permit2

Do not trust "upgrade completed successfully" alone.

### Fork testing workflow

Main commands:

From repo root:

```bash
npm run anvil:fork
```

From `liquidity-bot/`:

```bash
DRY_RUN=0 npm run liquify:fork -- --bot=alpha --rpc=http://127.0.0.1:8545 --wallet-only
DRY_RUN=0 npm run liquify:fork -- --bot=alpha --rpc=http://127.0.0.1:8545 --wallet-only --execute
```

Notes:

- `forkLiquifySetup.ts` can auto-upgrade the Liquifier proxy on a local Anvil fork
- it can also install `MockPermit2` on the fork
- `MockPermit2` is for debugging fork-only swap behavior; it is not evidence that real Permit2 works
- success with the mock means swap paths are okay, not necessarily that mainnet Permit2 is fixed

Useful debugging scripts that exist in the repo:

- `scripts/debug-permit2.ts`
- `scripts/debug-permit2-spender.ts`
- `scripts/debug-sdk-permit2.ts`
- `scripts/debug-sign-variants.ts`
- `scripts/debug-trace.ts`
- `scripts/test-permit2-as-spender.ts`
- `scripts/test-real-permit2-tx.ts`

These were created during Permit2 investigation and may be disposable later, but they are useful context now.

## AWS / EC2 Setup

The usual liquidity-bot host is:

- Ubuntu 22.04
- Node 22 via `nvm`
- PM2 for the long-running runner

Typical first-time setup:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 22
nvm use 22
npm i -g pm2
git clone https://github.com/goodpaperio/1SLiquidity.git ~/1SLiquidity
cd ~/1SLiquidity/liquidity-bot
npm ci --include=optional
npm run build
```

Common deployment helper:

- `../scripts/redeploy-liquidity-bot.sh`

What that script does:

1. SSH to the server
2. `git fetch` / `git checkout <branch>` / `git pull --ff-only`
3. `npm ci`
4. `npm run build`
5. stop PM2 bot
6. start PM2 bot
7. print status

Important operational nuance:

- it deploys from Git, not from your uncommitted local working tree
- if a feature is only local, redeploy will not include it
- the remote server may have dirty files; the script does not reset them

## PM2 / Lifecycle

Important scripts in `package.json`:

- `npm run start bot -- <id>`
- `npm run stop bot -- <id>`
- `npm run status bot -- <id>`
- `npm run run:once -- bot <id>`
- `npm run scan:dry-run -- bot <id>`
- `npm run cancel:trade -- --bot <id> --list`
- `npm run liquify:sweep -- --bot=<id>`
- `npm run notify:test -- <id>`
- `npm run notify:daily -- <id>`
- `npm run notify:stale-trades -- <id>`

Typical go-live sequence:

1. local dry runs
2. server deploy
3. confirm monitor is active
4. fund ETH + WETH
5. test Telegram
6. run one live `run:once`
7. turn bot on in PM2

## Health Checks and Recent Incident Context

Recent user-requested feature:

- warn on Telegram if no trades have been placed for 2 hours

Implementation:

- `src/ops/tradeHealthCheck.ts`
- integrated from `BotRunner.runCycle()`
- persisted via `lastStaleTradeAlertAt`

Recent incident summary that motivated it:

- local monitor and liquidity bot appeared idle for ~12 hours
- PM2 bot was online
- ledger showed last placement around June 30
- wallet had no WETH
- bot had stranded alt inventory
- recent-target and repeat-guard logic blocked reuse of that inventory
- liquify was failing, so dust was not being converted back to WETH

This is the main "capital deadlock" failure mode agents should understand:

- the bot can be healthy as a process
- but still unable to place trades because inventory composition and filters trap it

## Files To Read First For Common Tasks

If asked to debug why the bot is not trading:

1. `src/runner/BotRunner.ts`
2. `src/scan/QuoteScanner.ts`
3. `src/scan/collectQuotes.ts`
4. `src/notify/tradeLedger.ts`
5. `bots/<id>.json`
6. `../docs/STUCK_TRADES_AND_MONITOR.md`

If asked to debug liquify:

1. `src/ops/liquifySweep.ts`
2. `liquify-fork.ts`
3. `src/ops/forkLiquifySetup.ts`
4. `../splittter/contracts/src/LiquifierV1.sol`

If asked to debug Telegram / operator commands:

1. `src/notify/telegram.ts`
2. `src/notify/telegramCommands.ts`
3. `src/ops/botOps.ts`

If asked to debug settlement / monitor:

1. `../local-monitor/src/monitor.ts`
2. `../local-monitor/src/execute-trades.ts`
3. `../server/run-monitor.sh`
4. `../server/monitor-health.sh`

## Practical Debugging Checklist

When the user says "the bot hasn't traded":

Check these in order:

1. Is PM2 process online?
2. Is `enabled` true in `bots/<id>.json`?
3. Is `DRY_RUN=0` on the host?
4. Does the wallet still have WETH or another usable base token?
5. Are there open Core trades blocking new placement?
6. Is `local-monitor` actually streaming/settling?
7. Is the pair being filtered by cooldown, recent-target, or repeat guard?
8. Are liquify sweeps failing, preventing WETH recycling?
9. Are Telegram commands paused?

When the user says "liquify is broken":

1. Run a fork test
2. Separate "swap path works" from "Permit2 works"
3. Inspect current Liquifier implementation source and deployed implementation address
4. Verify whether the fix is actually in the deployed bytecode path

## Safety / Editing Guidance For Future Agents

- Never commit `.env`, AWS secrets, private keys, or PEM paths.
- Do not assume remote EC2 state matches Git.
- Do not assume a successful redeploy picked up uncommitted local changes.
- Do not assume Liquifier is fixed because a proxy upgrade transaction succeeded.
- Be careful with production `alpha`; it is a live shared bot, not just an example.
- For bot inactivity, distinguish process health from trading health.
- For settlement issues, remember the monitor may be on a different host.

## Suggested Agent Working Style

For small bot issues:

- inspect bot config
- inspect trade ledger
- inspect PM2 logs
- inspect monitor status

For Liquifier work:

- prefer fork-first validation
- verify source, implementation address, and real Permit2 behavior separately
- keep mock-based fork success clearly labeled as mock-only

For documentation / operator work:

- keep user-facing docs in `README.md`
- keep incident-specific notes in `docs/`
- keep this file focused on agent context and operational truth

