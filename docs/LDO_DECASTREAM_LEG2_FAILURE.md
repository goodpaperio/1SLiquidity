# LDO forward leg2 failures on DecaStream (Core v2.2.1)

Investigation from liquidity-bot **alpha** on mainnet (June 2026). Use this when fixing protocol, bot, or pair-list behaviour for LDO.

## Summary

**Forward** bot round-trips (`WETH → LDO` on DEX leg1, then `placeTrade` selling **LDO → WETH** on Core) failed repeatedly. **Reverse** round-trips (`LDO → WETH` leg1, Core leg2 **WETH → LDO**) succeeded.

Failures are **not** “LDO unsupported on DecaStream.” Core accepted the trade and began the first inline stream. The dominant on-chain failure mode was **out of gas** on `placeTrade` (which atomically runs the first `executeStream`). A separate bot-side issue was **LDO `approve(Core)`** reverting at `estimateGas` before a tx was broadcast.

**Short-term mitigation:** omit LDO from the bot’s accepted pair universe until gas / approve handling is fixed.

---

## Contracts and actors

| Role | Address |
|------|---------|
| Core v2.2.1 | `0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710` |
| StreamDaemon | `0xfc61Dd8254F07b515b0529032181DA1cC42518c1` |
| Executor | `0xb2194D54cD31A2c23B071ca68394CF9C35910545` |
| LDO token | `0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32` |
| Bot wallet (alpha) | `0xfa59F5143CE0d3AEe8D63Adb56bDd756e14BF2d3` |

---

## Observed failures (alpha ledger)

Six `leg2_failed` rows; four involved LDO forward.

### Mode A — LDO `approve(Core)` never mined

`ensureAllowance` called `estimateGas` on `LDO.approve(Core, amount)`; simulation reverted with bare `require(false)` (no revert data). **No leg2 tx on chain.**

| UTC ~ | Leg1 (WETH→LDO) | Approve amount (wei) |
|-------|-----------------|----------------------|
| 00:45 | `0xe8b58c30507cc6ae1e60f716df4fca65399245bfa466956c120ea390cdc6fd25` | `17423442705352314399` (~17.42 LDO) |
| 01:00 | `0x1c9b534e1166771c6d24d5c81d0727ed4aa9a17cff3526669cdbc5764e8be143` | `17415744795796558048` (~17.42 LDO) |

**Suspected cause:** LDO (Aragon-style governance token) may require `approve(spender, 0)` before setting a new non-zero allowance when an existing allowance to Core is non-zero. Bot `ensureAllowance` only calls `approve(amount)` when `current < amount`.

**Calldata pattern (example):**

```
to:   0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32
data: 0x095ea7b3000000000000000000000000d0b6dad2dc5dad47beb7c3d7dd7980a20cd6a710000000000000000000000000000000000000000000000000f1cc80d3c0e54e1f
from: 0xfa59F5143CE0d3AEe8D63Adb56bDd756e14BF2d3
```

### Mode B — `placeTrade` mined and reverted (out of gas)

Leg1 succeeded; bot passed approve (or had sufficient allowance); Core `placeTrade` was sent and **reverted with 100% gas used**, no logs.

| UTC ~ | Leg1 | Failed leg2 (`placeTrade`) | Block | Gas used |
|-------|------|----------------------------|-------|----------|
| 01:17 | `0x8f73265b42a1bc2b89329c3b9b72e5a26d5fa4b6732a5459444b756e62ca8f1a` | `0x318b720225cfd9506abc0d263e4fe693716ea8d58d45c57e7dd794e1840ab324` | 25262183 | 898,331 |
| 02:04 | `0x30290e24290d8356b67c5779213a65fad18b302cacefb401780761928fffec4f` | `0xadeb59ea22c0a38af84c3e57c767c59b4f56d7847f814b4ae89c0d6a56c2c486` | 25262414 | 898,429 |

**Decoded `placeTrade` params (tx `0x318b72…`):**

| Field | Value |
|-------|--------|
| tokenIn | LDO |
| tokenOut | WETH |
| amountIn | `15709067910040404240` (~15.709 LDO) |
| amountOutMin | `2539751406124071` (~0.00254 WETH) |
| isInstasettlable | false |
| usePriceBased | false |
| instasettleBps | 100 |

Tenderly re-simulation at block `25262183` reproduced **out of gas** at **898,331 / 898,331**. Raising the limit to **1,500,000** still OOG (100% used) — real requirement is **> 1.5M gas** for this path at that state.

---

## Suspected failure mechanism (protocol + token)

### 1. Atomic `placeTrade` + first stream

`Core.placeTrade` does not only escrow tokens; it immediately calls `executeStream` in the same transaction:

```solidity
// Core.sol — placeTrade tail
IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
// ... store trade ...
Utils.Trade memory updatedTrade = executeStream(trade.tradeId);
```

`executeStream` then:

1. Calls `streamDaemon.evaluateStreamPlan` (reserve probes across ~6 DEX fetchers, `_sweetSpotAlgo`, `getQuote` via QuoterV2-style simulations).
2. `registry.prepareTradeData` + router approve.
3. **Delegatecall to Executor** for the actual swap.

All of that is one tx — heavy for any alt, worse for LDO.

### 2. LDO transfer gas overhead

LDO is not a minimal ERC20. Tenderly traces show on each transfer:

- Vote checkpoint reads (`balanceOfAt`, `getValueAt`)
- `onTransfer` hook → `AppProxyUpgradeable` (~37k+ gas per hook)

Forward leg2 uses **LDO as `tokenIn`**: expensive `transferFrom` bot→Core, then another LDO move into the DEX router/pool during the first stream.

Reverse leg2 uses **WETH as `tokenIn`** on Core (cheap); the bot already sold LDO on DEX in leg1. That matches observed **reverse LDO successes** vs **forward failures**.

### 3. Gas estimate trap (bot)

`placeTradeLeg.ts` sends `core.placeTrade(tradeData)` with **no explicit `gasLimit`**. When `estimateGas` simulates an OOG at ~898k, the wallet sends ~898k and fails at exactly that cap. A modest buffer is insufficient; Tenderly suggests **> 1.5M** for this tx class.

### 4. What Tenderly showed before OOG (tx `0x318b72…`)

Execution progressed through:

- LDO `transferFrom` bot → Core (~15.7 LDO) — success, including governance hooks
- Core trade storage (SSTORE)
- Stream planning (QuoterV2 callbacks on LDO/WETH pools; “reverts” inside QuoterV2 are normal quote simulation)
- Route selected: **Uniswap V3 0.05%** LDO/WETH; first chunk ~**7.85 LDO**
- `LDO.approve(SwapRouter, chunk)` — success
- **OOG on subsequent Core SSTORE** before the stream fully completed

So the failure is **gas budget**, not “no quote” or “pair not registered.”

---

## Forward vs reverse (why asymmetry)

| Direction | DEX leg1 | Core `placeTrade` tokenIn | Core first stream |
|-----------|----------|---------------------------|-------------------|
| **Forward** WETH→LDO | Buy LDO | **LDO** | Sell LDO → WETH |
| **Reverse** LDO→WETH | Sell LDO | **WETH** | Buy LDO with WETH |

Reverse avoids LDO-as-input on Core and matches successful alpha trades (#27, #32, #37, #45 in the same window).

---

## Tenderly reproduction

### Failed `placeTrade` (primary)

1. [Tenderly Simulator](https://dashboard.tenderly.co/simulator) — Mainnet, block **25262183**
2. From: `0xfa59F5143CE0d3AEe8D63Adb56bDd756e14BF2d3`
3. To: `0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710`
4. Raw input: full calldata from [Etherscan tx `0x318b72…`](https://etherscan.io/tx/0x318b720225cfd9506abc0d263e4fe693716ea8d58d45c57e7dd794e1840ab324)
5. Expect: **Failed — out of gas** at ~898k; try **3M–5M** gas to find success ceiling and actual `gasUsed`

### Approve failure (no on-chain tx)

Simulate at block **leg1 block + 1** after `0xe8b58…`:

- To: LDO `0x5A98…`
- Data: `0x095ea7b3…` (approve Core, ~17.42e18)
- Check `allowance(bot, Core)` at that block if non-zero

---

## Recommended fixes (for follow-up work)

### Bot (liquidity-bot)

1. **Exclude LDO** from accepted targets (pair list / `excludedTargets` config) until fixed.
2. **`ensureAllowance`:** on approve failure, try `approve(0)` then `approve(amount)` for governance-style tokens.
3. **`placeTrade` gas:** explicit floor (e.g. **3M** when `tokenIn` is not WETH); do not rely on raw `estimateGas` after OOG.
4. **Pre-flight:** `eth_call` simulate full `placeTrade` before leg1 when forward leg2 sells a heavy alt.
5. **Ledger:** populate `leg2TokenIn` / `leg2AmountIn` on `leg2_failed` rows for debugging.

### Protocol (Core / StreamDaemon)

1. **Measure gas** for `placeTrade` + first `executeStream` with LDO (and other governance tokens) on mainnet fork; document minimum safe gas.
2. Consider **splitting** trade open from first stream (or optional `onlyInstasettle`-style placement without inline stream) to cap placement gas — larger design change.
3. **`evaluateStreamPlan`:** confirm DEX probe order minimises QuoterV2 work when a valid route is found early (gas already optimised with caching; may still be heavy for LDO-in streams).
4. **Registry / routing:** verify LDO→WETH stream uses the same pool/fee as bot leg1 quotes (0.3% leg1 vs 0.05% stream in one trace — worth checking slippage/gas interaction).

### Ops

- Bot wallet may still hold **stranded LDO** from leg1-only failures; excluding LDO stops new trades but does not auto-sell inventory.
- After deploy, confirm `enabled: true` on EC2 (`npm run liquidity-bot:on` — repo template ships `enabled: false`).

---

## Related files

| Area | Path |
|------|------|
| Core `placeTrade` / `executeStream` | `src/Core.sol` |
| Stream planning | `src/StreamDaemon.sol` |
| Bot leg2 | `liquidity-bot/src/execution/placeTradeLeg.ts` |
| Bot allowance | `liquidity-bot/src/chain/erc20.ts` |
| WETH pair list (includes `ldo`) | `config/weth_pairs_clean.json` |
| Similar Tenderly doc pattern | `docs/TENDERLY_INVALID_STREAM_VOLUME.md` |

---

## Status

- **Mitigation:** omit LDO via `scan.excludedTargets: ["ldo"]` in `liquidity-bot/bots/alpha.json` (wired in `loadPairs.ts`).
- **Root cause:** confirmed **OOG** on forward `placeTrade` (LDO in); separate **approve** issue on earlier attempts.
- **Protocol fix:** open — gas budgeting and/or placement architecture for heavy `tokenIn` tokens.
