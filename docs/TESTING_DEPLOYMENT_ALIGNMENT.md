# Syncing tests with **deployed** mainnet contracts

## 1. Single source of truth

- **`versions/deployment-addresses-mainnet-<version>.json`** — what is actually live.
- **`script/addresses/MainnetAddresses.sol`** — Solidity constants used by fork tests. **Update both together** after each mainnet deploy.

## Fork vs mainnet for `UniswapV3TradePlacement`

- **`forge test --fork-url http://localhost:8545`** (Anvil fork): the test **deploys new** `Core`, `StreamDaemon`, `Registry`, `Executor`, and **`new UniswapV3Fetcher(factory, feeTier)`** from your **repo bytecode**.
- **Real mainnet** uses **fixed addresses** in `StreamDaemon` for fetchers. If those contracts are **wrong or old**, behavior differs from the fork test even though **pool math** (WETH/USDC, etc.) is the same chain state on a fork.
- **Conclusion:** fork tests prove **your source + wiring**; **`UniswapV3MainnetFetcherAlignment`** proves **pinned deploys** match the same invariants.

## 2. Two different meanings of “Uniswap V3 tests”

| What | What it proves |
|------|----------------|
| **`UniswapV3TradePlacement.s.sol`** (+ fee variants) | Protocol logic with **`new UniswapV3Fetcher`** from **this repo** (bytecode = `forge build`). Good for Core / StreamDaemon / Registry **integration**, not for “is mainnet fetcher X correct”. |
| **`test/UniswapV3MainnetFetcherAlignment.t.sol`** | **Deployed** fetchers: valid `(uint256,bytes)` `getQuote`, aux pool matches factory; then **new `Registry` from source** must encode the **fee from aux**. (Pinned mainnet Registry is not called — ABI may lag.) |

## 3. Fee tiers in trade-placement scripts

- **`UniswapV3TradePlacement.s.sol`** — default **`UNISWAP_V3_FEE = 3000`** (`SingleDexProtocol`).
- **`UniswapV3TradePlacementFeeTiers.s.sol`** — **`UniswapV3TradePlacement_Fee500`** and **`_Fee10000`** override `setUp()` to bootstrap **500** and **10000**.
- **WETH / USDC** is valid on mainnet for **500, 3000, and 10000** pools (and 100 if you add a dedicated fetcher later).

Run all V3 placement contracts (3000 default + 500 + 10000):

```bash
forge test --match-path "script/processes/trade-placement/UniswapV3TradePlacement*.s.sol" -vv --fork-url "$RPC" --via-ir
```

## 4. `GlobalTestSuite.s.sol`

The Uniswap V3 path there is still a **stub** (`vm.assume(true)`). **Do not rely on it** for DEX coverage. Prefer:

- `npm run test:uniswap-v3-all-tiers` (after adding the script), and  
- `forge test --match-contract UniswapV3MainnetFetcherAlignment` on a mainnet fork.

## 5. Uniswap V2

No fee tiers. **`test/UniswapV2MainnetFetcherSmoke.t.sol`** checks the **pinned** `MainnetAddresses.UNISWAP_V2_FETCHER` returns **`UniswapV2`** and **non-zero WETH/USDC reserves** on a fork.

## CI recommendation

1. **Fork job** (scheduled or pre-release):  
   `UniswapV3MainnetFetcherAlignment` + `UniswapV2MainnetFetcherSmoke` with `MAINNET_RPC_URL`.
2. **PR job** (anvil fork):  
   `UniswapV3TradePlacement*.s.sol` as today, plus the new fee-tier variants.

## After deploy: sync `MainnetAddresses.sol`

- **`npm run sync:mainnet-addresses:sol`** — reads the newest `versions/deployment-addresses-mainnet-*.json` and regenerates `script/addresses/MainnetAddresses.sol`.
- Runs automatically at the end of **`./scripts/extract-addresses-v1.0.6.sh`** (after **`extract:addresses:v1.0.6`** / **`deploy:barebones:core:complete`**).
- **`npm run deploy:barebones:create2:complete`** and **`deploy:barebones:create2:complete:batches`** call sync after deploy (no-op if no JSON yet — then run **`extract:addresses:v1.0.6`** after a Core deploy).
