# Stuck trades, monitor failures, and auto-cancel (liquidity-bot)

## Roles

| Service | Responsibility |
|---------|----------------|
| **liquidity-bot** | Scan → DEX leg1 → `placeTrade` (leg2). Does **not** stream. |
| **local-monitor** | Cron every ~5 min → `executeTrades(pairId)` to stream/settle open Core trades. |

If monitor stops or fails, trades sit **OPEN** on Core. With `maxOpenTrades: 1`, the bot skips new cycles until the trade completes or is cancelled.

---

## Trade #109 (cbETH, June 2026)

| Field | Value |
|-------|--------|
| tradeId | 109 |
| Bot pair label | `WETH→cbeth` (Core: cbETH in → WETH out) |
| Placed | ~2026-06-21 10:35 UTC |
| State | ~50% streamed (`lastSweetSpot: 1`), `attempts: 0` |
| Core queue | Present under pairId `0x3153ac74…` |

**On-chain simulation (mainnet RPC, June 2026):** `executeTrades` **gas estimate succeeds** (~559k) for the remaining stream. This is **not** the same class of failure as LDO (OOG on `placeTrade` / approve).

Likely causes of Telegram **"❌ Trade Execution Failed"**:

1. **Whole script exit** — `npm run execute-trades` uses `ts-node`; if `node_modules` / devDeps missing on the server, the step exits before any pair runs. Prefer `node dist/execute-trades.js` in cron.
2. **AWS Secrets / RPC** — `TradeMonitor.create()` throws (credentials, RPC down).
3. **Executor wallet** — insufficient ETH for gas (partial failures usually still exit 0; total script failure is rarer).
4. **Stale `localData.json`** — wrong `pairId` in cache (monitor uses `keccak256(abi.encode(a,b))` which matches Core).

**Action:** Inspect `~/monitor-logs/YYYY-MM-DD.log` on the monitor host for the line after `Trade execution failed:` or `Fatal error:`.

---

## liquidity-bot auto-cancel (implemented)

Config (`bots/<id>.json`):

```json
"trade": {
  "stuckCancelAfterCycles": 3
}
```

Each **bot scan cycle** (default every 15 min via `scan.intervalMs`):

1. If the same Core trade is still open, increment `bots/<id>.stuck-trade.json`.
2. After **3 consecutive cycles** (~45 min at 15 min interval), call `cancelTrade(tradeId)` as the bot wallet.
3. Update `trade-ledger.jsonl` → `status: cancelled`.
4. Append `bots/<id>.token-issues.jsonl` with the alt token name — **review** before adding to `scan.excludedTargets` (same workflow as LDO).

Set `stuckCancelAfterCycles: 0` to disable.

Manual cancel: `npm run cancel:trade -- --bot alpha --trade-id 109`

---

## Token issue workflow (like LDO)

1. **Leg2 fails at placement** → documented in `docs/LDO_DECASTREAM_LEG2_FAILURE.md`, excluded via `scan.excludedTargets: ["ldo"]`.
2. **Stuck / stream never completes** → auto-cancel logs to `bots/<id>.token-issues.jsonl`. If reproducible, add a doc under `docs/` and add the target to `excludedTargets`.

cbETH is **not** auto-excluded today — simulation suggests monitor/ops, not a cbETH-specific Core bug.
