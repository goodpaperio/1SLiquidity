# Fixing mainnet Uniswap V3 trade failures (quote ≠ execution tier)

## Symptom

- `Core.executeStream` / `placeTrade` path reverts on Uniswap V3 swaps (often empty revert data).
- `npm run test:mainnet-fetcher-alignment` fails: **`getQuote` return is only 96 bytes**, not a valid ABI encoding for **`(uint256,bytes)`** (the `IUniversalDexInterface` / `Core` expectation). On a recent mainnet check, **all three** pinned V3 fetchers (500 / 3000 / 10000) returned the **same** malformed shape (and the same embedded fee/pool in that 96-byte tuple), so **redeploy all three** from the fixed source, not only the 0.05% address.

## Root cause

For each **UniswapV3Fetcher** deployment, **`getQuote`** must return:

1. Valid ABI **`(uint256 amountOut, bytes aux)`** where `aux = abi.encode(uint24 fee, address pool)`.
2. Historically **`Registry.prepareTradeData`** used **`fee()`** only, so if `getQuote` implied a different tier than `fee()`, **quotes and execution diverged** → reverts.

If bytecode was built from different source, mis-deployed, or `getQuote` “optimizes” across tiers while `fee()` stays fixed, you get the same failure mode.

## Protocol change (in this repo — **deploy Core + Registry together**)

**`Core`** now forwards **`getQuote`’s `aux`** into **`Registry.prepareTradeData(..., quoteAux)`**.

**`Registry`** for Uniswap V3:

- If **`quoteAux.length < 64`**: use **`fee()`** (backward compatible when aux is empty).
- If **`quoteAux.length >= 64`**: decode **`(uint24 fee, address pool)`**, require a standard tier **(100 / 500 / 3000 / 10000)**, and require **`pool == factory.getPool(token0, token1, fee)`**. The **encoded router fee** is then **`fee` from aux**, not `fee()`, so execution matches the quote’s tier **even if** `fee()` on the contract were wrong.

Invalid aux (bad pool, bad tier) → **`revert`** with `Registry: V3 aux …` (fail loud).

**Important:** Upgrade **`Core` and `Registry` in the same release**. An old Core calling a new Registry with a 7-argument selector will mis-decode calldata.

## Fix (production) — fetcher bytecode

1. **Verify** source: `src/adapters/UniswapV3Fetcher.sol` (`getQuote` uses **`fee`** state; `aux = abi.encode(fee, pool)`).

2. **Redeploy** `UniswapV3Fetcher` for **500 / 3000 / 10000** and **`setQuoterV2`**.

3. **Wire `StreamDaemon`** to new fetchers.

4. **Deploy** updated **`Core` + `Registry`** (quote-aux path).

5. **`versions/deployment-addresses-mainnet-<ver>.json`** + `npm run sync:mainnet-addresses:sol`.

6. **`npm run test:mainnet-fetcher-alignment`** on a mainnet fork until green.

## Tests

- **`test/RegistryV3QuoteAux.t.sol`** — Registry prefers aux fee over `fee()` when aux is valid; empty aux uses `fee()`.
- **`test/UniswapV3MainnetFetcherAlignment.t.sol`** — fork checks against live fetchers + **new** `Registry` from source.

## Why `UniswapV3TradePlacement` passes when mainnet fails

That suite **`new UniswapV3Fetcher(...)`** on a fork uses **local bytecode**. **`UniswapV3MainnetFetcherAlignment`** pins **deployed** fetcher behavior.
