# amountIn overwrite: root cause and proper fix (no band-aid)

## What happens

In `executeStream`, the **main path** (after a successful swap) does:

```solidity
storageTrade.amountRemaining = trade.amountRemaining - streamVolume;  // 1
storageTrade.realisedAmountOut += amountOut;                           // 2
storageTrade.lastSweetSpot = sweetSpot;                                // 3
```

The compiler turns (1) into a single **SSTORE** to the storage slot it assigns to `amountRemaining` for that struct. There is no separate “path” that “decides” to write to amountIn—there is only one assignment: to `amountRemaining`. So the overwrite is not a logic bug in the Solidity code; it’s a **storage layout mismatch** between what the compiler used when generating the bytecode and what the same bytecode uses when reading the struct (e.g. in `getTrade`).

---

## Why amountIn gets overwritten

- The **trace** shows the value 5M (new `amountRemaining`) being written to slot **base+4** for the trade.
- On-chain, `getTrade(1).amountIn` ends up as 5M.
- So the slot at **base+4** is the one the deployed contract uses when it **reads** `amountIn`.

So in the **deployed** contract’s view of `Utils.Trade`:

- The slot at **offset 4** is treated as **amountIn** (what `getTrade` returns as `amountIn`).
- The assignment in the source is to **amountRemaining**, but the **compiler that produced the deployed bytecode** put **amountRemaining** at a different slot than **amountIn**. The only way the same SSTORE (to base+4) can both “be” the write to `amountRemaining` and “overwrite” what the contract later reads as `amountIn` is if, in the layout used for that build, **amountRemaining** and **amountIn** are effectively swapped relative to the layout we expect.

So:

- In the **deployed** build, the struct layout has **amountIn at offset 4** and **amountRemaining at offset 3** (or equivalent effect).
- The compiler, for the line `storageTrade.amountRemaining = ...`, emits an SSTORE to **offset 4** (because in that build, `amountRemaining` was laid out at offset 4).
- So that SSTORE writes the new `amountRemaining` into the slot that the same contract later reads as `amountIn` → **amountIn is overwritten**.

In other words: the deployed Core was compiled from a **different** struct layout (different source or different build) where the two fields were in the opposite order (or otherwise laid out so that the “amountRemaining” write hits the “amountIn” slot).

---

## How the path is “executed” in the contract

- There is only one assignment to `amountRemaining` in the main path:  
  `storageTrade.amountRemaining = trade.amountRemaining - streamVolume;`
- The compiler maps that to **one** storage slot. In a **correct** layout that slot is the “amountRemaining” slot; in the **deployed** layout that slot is the “amountIn” slot.
- So the “path” that overwrites amountIn is simply: **run the main path of `executeStream`** (swap succeeds, then the three assignments above). No extra condition or branch—whenever that path runs, it does one SSTORE that, in the deployed layout, hits the amountIn slot.

So:

- **Why:** The deployed bytecode was built with a struct layout where the slot used for `amountRemaining` (the one written by that line) is the same slot used for `amountIn` when reading.
- **How:** The compiler emits a single SSTORE to that slot for the `amountRemaining` assignment; in the buggy layout, that slot is the amountIn slot.

---

## How “correct layout” is achieved in the contract

There is no runtime logic that “chooses” whether to write amountIn or not. It’s entirely determined at **compile time** by:

1. **Struct declaration order in Utils.sol**  
   `amountIn` is declared **before** `amountRemaining`. Solidity lays out storage in declaration order, so the compiler assigns:
   - `amountIn` → struct offset 3 (slot base+3)
   - `amountRemaining` → struct offset 4 (slot base+4)

2. **What the main path writes**  
   The only storage writes in the main path are:
   - `storageTrade.amountRemaining = ...`  → compiler emits SSTORE to **base+4**
   - `storageTrade.realisedAmountOut += ...` → base+6
   - `storageTrade.lastSweetSpot = ...` → base+9  

   There is **no** `storageTrade.amountIn = ...` in the main path. So with the layout above, the main path never emits an SSTORE to base+3 (amountIn). The “correct layout” is achieved because (a) the struct order puts amountIn at +3 and amountRemaining at +4, and (b) we only assign to amountRemaining, not amountIn, in that path.

3. **Redeploy from this source**  
   A new deployment built from the same Utils.sol and same compiler/settings gets that layout. The main path then only ever writes to base+4, 6, 9 — never to base+3. So amountIn is never overwritten by that path.

The contract does not “achieve” this with extra checks or branches; it’s just that the single assignment `storageTrade.amountRemaining = ...` compiles to one slot (base+4), and with correct layout that slot is not the amountIn slot (base+3).

---

## Proper fix

**Current source (Utils.sol)** already has the correct declaration order (amountIn then amountRemaining). Redeploy Core from this source and same build (e.g. `--via-ir`). The new deployment will have amountIn at +3 and amountRemaining at +4; the main path will only write to the amountRemaining slot.

**Keeping `immutableAmountIn` and `storageTrade.amountIn = immutableAmountIn`** is useful for traceability: if a future deploy ever has the wrong layout again, an access that reverts will show the restore/amountIn in the trace and make the cause visible.
