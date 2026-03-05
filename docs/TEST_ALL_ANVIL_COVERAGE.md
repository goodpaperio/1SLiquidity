# test:all:anvil – What runs and expected counts

`npm run test:all:anvil` starts an anvil fork then runs `test:all:anvil:no-start`. Nothing is skipped except one intentional test (see below).

## Commands run (in order)

| Step | Command | Type | Expected result |
|------|---------|------|-----------------|
| 1 | **test:dexs-anvil:barebones** | 4× `forge test` | 4 suites |
| 2 | **test:processes-anvil** | 1 script + 1 test + 1 script | Protocol script, TradePlacement tests, TestSingleReserves script |
| 3 | **test:reserves-anvil** | 1 script | TestSingleReserves again |
| 4 | **test:balancer-reserves-anvil** | `forge test` BalancerReservesTest | 1 suite |
| 5 | **test:curve-reserves-anvil** | `forge test` CurveMetaReservesTest | 1 suite |
| 6 | **test:trade-cancel-test-anvil** | `forge test` TradeCancel | 1 suite |
| 7 | **test:insta-anvil** | `forge test` Instasettle | 1 suite |
| 8 | **test:multi:anvil** | 1 script | MultiSettle script |

## Forge test suites and counts (last run)

| Suite | Tests | Passed | Failed | Skipped |
|-------|-------|--------|--------|---------|
| UniswapV2TradePlacement | 1 | 1 | 0 | 0 |
| SushiswapTradePlacement | 1 | 1 | 0 | 0 |
| UniswapV3TradePlacement | 3 | 3 | 0 | 0 |
| BalancerV2TradePlacement | 5 | 4 | 0 | **1** |
| TradePlacement | 5 | 5 | 0 | 0 |
| BalancerReservesTest | 9 | 9 | 0 | 0 |
| CurveMetaReservesTest | 13 | 13 | 0 | 0 |
| TradeCancel | 8 | 8 | 0 | 0 |
| Instasettle | 8 | 8 | 0 | 0 |
| **Total** | **53** | **52** | **0** | **1** |

The single **skipped** test is in `BalancerV2TradePlacement.s.sol` (BAL/WETH pool extreme imbalance; `vm.skip(true)`).

## Scripts (no test count)

- **Protocol.s.sol** – deployment/setup
- **TestSingleReserves.s.sol** – run twice (in processes-anvil and reserves-anvil)
- **MultiSettle.s.sol** – runs `testSettleBothTrades()` and `testBotFeeAccrualAndPayout()`; success = “Script ran successfully” and logs “SUCCESS: …”

## Seeing a summary after a run

`npm run test:all:anvil` tees the run to `/tmp/anvil-test.log` and then runs `scripts/test-all-anvil-summary.sh /tmp/anvil-test.log`, so the **TEST SUMMARY** block is printed automatically at the end of every run.
