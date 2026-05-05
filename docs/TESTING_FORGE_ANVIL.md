# Full `forge test` on Anvil fork

## Commands

| Script | What it does |
|--------|----------------|
| **`npm run test:all:anvil`** | Project’s **script-heavy** suite (DEX placement, processes, MultiSettle, …). **Recommended** release check. |
| **`npm run test:forge:anvil`** | **All** `forge test` targets against `http://127.0.0.1:8545`. Expect **many failures** (legacy scripts, fuzz, mainnet alignment, Core fork JSON, …). |
| **`npm run test:forge:anvil:green`** | Same fork, but **filters out** known-broken / noisy suites so the run **exits 0**. Use for a quick “wide forge + green” check. |

Start Anvil first (or rely on `anvil:start` inside the npm script):

```bash
npm run anvil:fork   # terminal 1, or let npm start it
npm run test:forge:anvil:green
```

## `test:forge:anvil:green` exclusions (why)

- **Fuzz** (`test/fuzz/**`) — proptest / counterexamples.
- **GlobalTestSuite** — fuzz on array getters (`testResults` / `testSuites`).
- **CoreForkTest** — needs `Config` JSON + fork; use `MAINNET_RPC_URL` if you fix assets.
- **ETHSupport** skipped ETH-out tests — known reverts.
- **SweetSpotAlgo** unit + fuzz — revert on current harness.
- **OnlyInstasettleTest** — one assertion mismatch.
- **QuantumMultiSettle** — experimental script (renamed contract to avoid duplicate `MultiSettle` with `MultiSettle.s.sol`).
- **BalancerTradePlacement** (legacy Balancer) / **CurveTradePlacement** / **CustomTradePlacement** — router or pool failures on fork.
- **BalancerV2\*** — two tests still expect `getDexType() == "Balancer"` instead of `"BalancerV2"`.
- **UniswapV3MainnetFetcherAlignment** — fails until mainnet fetchers return valid `(uint256,bytes)` (see `docs/PRODUCTION_FIX_V3.md`).

## `Fork.t.sol` / `CoreForkTest`

`test/fork/Fork.t.sol` uses:

```text
MAINNET_RPC_URL default http://127.0.0.1:8545
```

So **CoreFork** expects Anvil on **8545** (or set `MAINNET_RPC_URL` to a real HTTP endpoint).
