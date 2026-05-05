# Core Storage Layout & amountIn Overwrite Bug

## Confirmed storage layout (current source, `forge inspect Core storageLayout --via-ir`)

### Core state variables

| Slot | Variable |
|------|----------|
| 0 | `_owner` (Ownable) |
| 1 | `_status` (ReentrancyGuard) |
| 2 | streamDaemon |
| 3 | executor |
| 4 | registry |
| 5 | ethSupport + streamProtocolFeeBps + streamBotFeeBps + instasettleProtocolFeeBps (packed) |
| 6 | EXECUTE_STREAM_TRADE_CAP |
| 7 | BPS_SLIPPAGE |
| 8 | protocolFees |
| 9 | lastTradeId |
| 10 | pairIdTradeIds |
| 11 | tradeIndicies |
| **12** | **trades** |
| 13 | eoaTokenBalance |
| 14 | modulusResiduals |
| 15 | botWhitelist |
| 16 | botWhitelistCount |

### Utils.Trade struct (relative to `trades[id]` base)

- Base for `trades[id]` = `keccak256(abi.encode(id, 12))`.
- Struct slots (base + 0, base + 1, …):

| Offset | Field |
|--------|--------|
| 0 | owner + attempts (packed) |
| 1 | tokenIn |
| 2 | tokenOut |
| **3** | **amountIn** |
| **4** | **amountRemaining** |
| 5 | targetAmountOut |
| 6 | realisedAmountOut |
| 7 | tradeId |
| 8 | instasettleBps |
| 9 | lastSweetSpot |
| 10 | isInstasettlable + usePriceBased + onlyInstasettle (packed) |

So in the **current** layout, `amountIn` is at base+3 and `amountRemaining` at base+4.

---

## What the Tenderly trace showed

In the successful stream tx, Core did:

- **SSTORE** to slot `0xd421a5181c571bba3f01190c922c3b2a896fc1d84e86c9f17ac10e67ebef8b60`  
  - Value: `0x4c4b40` (5,000,000)  
  - Previous value: `0x989680` (10,000,000)

That slot is the **fifth** slot of the trade struct for that trade (base + 4). The code that runs is:

```solidity
storageTrade.amountRemaining = trade.amountRemaining - streamVolume;  // 10M - 5M = 5M
```

So the compiler is writing the new `amountRemaining` to **base+4**.

---

## Where the bug comes from

- In the **current** source, base+4 is `amountRemaining`, so that SSTORE is correct and does not touch `amountIn`.
- On mainnet, `getTrade(1).amountIn` ends up as 5M (the same as the last `amountRemaining`), so the slot that the **deployed** contract uses for “amountIn” is being overwritten by that same write.

So the **deployed** Core was almost certainly built with a **different** layout for `Utils.Trade`:

- In the deployed layout, the slot at **base+4** is used for **amountIn**, not amountRemaining (i.e. the two fields are effectively swapped relative to the current source).
- Then `storageTrade.amountRemaining = ...` still targets base+4, but in the deployed contract that slot is `amountIn`, so every stream overwrites `amountIn` with the new `amountRemaining`.

That can happen if the deployed bytecode was produced from:

- An older or different `Utils.Trade` where `amountRemaining` and `amountIn` were in the opposite order, or
- A different Solidity version / optimizer / via-ir setting that changed struct ordering.

---

## How to confirm

1. **Current layout**  
   Run:
   ```bash
   forge inspect Core storageLayout --via-ir
   ```
   and use slot 12 for `trades` and the struct table above for `Utils.Trade`.

2. **Slots for a given trade**  
   Run the test:
   ```bash
   forge test --match-contract StorageLayoutTest --via-ir -vvv
   ```
   It prints the `trades[1]` base slot and the slots for `amountIn` (base+3) and `amountRemaining` (base+4).

3. **Deployed contract**  
   The mainnet Core at `0x62a1e4dc...` was compiled with different settings/version; its actual layout is inferred from the trace (SSTORE to base+4 overwrites what the contract treats as `amountIn`).

---

## Fix

- **Defensive fix (already in code):** After updating `amountRemaining`, `realisedAmountOut`, and `lastSweetSpot`, set  
  `storageTrade.amountIn = immutableAmountIn`  
  so that even if the compiler/deployed layout uses base+4 for `amountIn`, we restore the correct value in that same call.
- **Deploy:** Redeploy Core (or upgrade) with the current source and the defensive line so that all new and existing trades keep the correct `amountIn` on-chain.
