# Tenderly: "Invalid stream volume" at executeStream()

## What you see

- **Status**: Failed  
- **Error**: `Invalid stream volume`  
- **Function**: `executeStream()`  
- **From**: `0x0000...0000` (internal call from Core to itself)  
- **To**: Core `0x62a1e4dc903f0677ba4e06494af0a74d8a1205be`  
- **Block**: e.g. 24490798, 24490795  

## Why it reverts

The revert comes from:

```solidity
require(streamVolume > 0, "Invalid stream volume");
```

So the transaction fails because **`streamVolume` is 0** when that line runs.

## How streamVolume becomes 0

In `executeStream`:

1. `streamVolume` is set from the trade’s remaining amount and sweet spot:
   - Normal path: `streamVolume = trade.amountRemaining / sweetSpot`
   - Over‑achieved path: `streamVolume = trade.amountRemaining`
2. If **`trade.amountRemaining == 0`**, then:
   - `streamVolume = 0 / sweetSpot = 0` (or `streamVolume = 0` on the over‑achieved path).
3. The `require(streamVolume > 0, "Invalid stream volume")` then reverts.

So the failure means: **the trade has no remaining amount to stream** (`amountRemaining == 0`), but the “nothing left to stream” path was not taken (or the simulation ran before that path existed).

## Call path

- A bot (or another caller) calls `executeTrades(pairId)`.
- For a trade with `attempts < 3`, Core calls **`this.executeStream(tradeId)`** (internal call; Tenderly can show “From: 0x0000...0000”).
- For that trade, storage has **`amountRemaining == 0`** (e.g. trade already fully streamed or bug).
- `executeStream` runs, computes `streamVolume = 0`, hits `require(streamVolume > 0, "Invalid stream volume")` and reverts.

So the revert is expected when **a trade with `amountRemaining == 0` is still in the queue and `executeStream` is invoked** (e.g. before the “nothing left to stream” early return was added, or in a fork that doesn’t have it).

## What to check in Tenderly

1. **Input state for the reverted call**
   - For the failing `executeStream(tradeId)` call, inspect the **Core** state at that block:
     - `trades[tradeId].amountRemaining` → expect **0**.
     - `trades[tradeId].amountIn` (and, if present, any “original amount” storage).
   - Confirm which `tradeId` is being executed when the revert happens.

2. **Storage changes**
   - In the same transaction, compare Core storage **before** and **after** the internal `executeStream` (or after the whole `executeTrades`):
     - Check whether **`amountIn`** for that `tradeId` changes between streams or between calls.
   - If `amountIn` decreases over time for the same trade, that indicates a bug (e.g. overwrite or wrong slot); the defensive restore of `amountIn` in `executeStream` is there to prevent that.

3. **Why this trade is still in the queue**
   - If `amountRemaining == 0`, the trade should either:
     - Be completed and removed (e.g. via the “nothing left to stream” branch and then removal in `executeTrades`), or
     - Be handled by the “attempts >= 3” path (`cancelTrade`) and then removed.
   - Check:
     - Whether the “nothing left to stream” early return exists in the version you’re simulating.
     - Whether `cancelTrade` is failing (e.g. zero-amount transfer) so the trade is never removed.

## Fixes in code

1. **Early return when nothing is left to stream**  
   At the start of `executeStream`, if `trade.amountRemaining == 0`, set `lastSweetSpot = 0` and return so `executeTrades` can settle and remove the trade instead of trying to stream again.

2. **Defensive restore of `amountIn`**  
   After updating `amountRemaining`, `realisedAmountOut`, and `lastSweetSpot`, set `storageTrade.amountIn = immutableAmountIn` so `amountIn` is never effectively overwritten by later logic or storage layout.

3. **cancelTrade and zero amounts**  
   Only transfer `amountRemaining` / `realisedAmountOut` when `> 0` so tokens that revert on zero transfer don’t block removal and don’t cause “Invalid stream volume” retries.

With these in place, a trade with `amountRemaining == 0` should either be settled and removed or cancelled, and should not hit `require(streamVolume > 0, "Invalid stream volume")` in normal operation.
