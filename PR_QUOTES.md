# PR: Quotes – quotation system and QuoterV2 integration

## Summary

This PR adds a **quotation system** for evaluating `targetAmountOut` in `Core` and wires **Uniswap V3 QuoterV2** across protocol scripts and deployment. It also introduces a configurable maximum sweet spot, test and deployment improvements, and bot/local-monitor fixes.

## What changed

### Contracts & quotation

- **Core** uses `getQuote(tokenIn, quoteTokenOut, streamVolume)` (with fallback to `getPrice`) to compute `targetAmountOut` before preparing trade data. Native ETH `tokenOut` is normalized to WETH for quoting.
- **IUniversalDexInterface** defines `getQuote(..., amountIn) returns (uint256 amountOut, bytes memory aux)` so DEX adapters can return optional aux data (e.g. fee tier, pool).
- **StreamDaemon** exposes setter/getter for maximum sweet spot value used in the sweet-spot algorithm.

### QuoterV2 integration

- **UniswapV3Fetcher** already had `getQuote` / `getQuoteExactOut` and `setQuoterV2`; this PR wires them in:
  - **Protocol.s.sol**: add `UNISWAP_V3_QUOTER_V2` constant and call `setQuoterV2` on the UniswapV3 fetcher.
  - **DeployBarebones.s.sol**: set QuoterV2 for all UniswapV3 fetchers; configure registry routers for UniswapV2, UniswapV3, Sushiswap, BalancerV2, CurveMeta; use `tx.origin` for broadcast.
- **UniswapV3TradePlacement**: decode `(feeTier, pool)` from `getQuote`’s `aux` instead of a separate return tuple.
- **MockFetcher**: implement `getQuote` returning `(amountOut, aux)` for tests.

### Tests & scripts

- **TradePlacement / Instasettle**: lower WETH→USDC min-out from 4000 to 1800 USDC to reduce fork slippage reverts.
- **CustomTradePlacement**: add `test_USDC_to_WETH_only` for focused gas visibility.

### Deployment & ops

- **SetupBalancerV2Pools**: use existing registry/fetcher addresses; broadcast via `msg.sender`; add `runBatch1` / `runBatch2` / `runBatch3` and `initializePools(..., start, count)`.
- **SetETHSupport**: default Core to v1.0.5 and ETHSupport to existing deployment when env vars are unset.
- **package.json**: `API_KEY_ETHERSCAN`, `deploy:barebones:core`, Balancer batch scripts, `deploy:barebones:create2` gas limit.
- **.gitignore**: add `TODO.md`.

### Bot / local-monitor

- Local-monitor updated to handle only-instasettle trades.
- TradeCancelled event signature fix.

## Commits (quotes → main)

1. `feat(contracts): implementing a quotation system for the evaluation of targetAmountOut`
2. `feat(contracts): adding setter/getter for maximum sweet spot value`
3. `fix(bot): updating signature for TradeCancelled event`
4. `fix(bot): modifying the local-monitor to handle only-instasettle trades`
5. `feat(quotes): add getQuote(aux) to mock and decode aux in UniswapV3 trade placement`
6. `feat(quotes): wire QuoterV2 in Protocol and DeployBarebones`
7. `test: conservative min-out for fork slippage and CustomTradePlacement USDC->WETH`
8. `chore: package scripts, .gitignore, maintenance addresses, Balancer setup`

## Testing

- Run protocol/trade-placement tests (including UniswapV3 trade placement and custom USDC→WETH) on a mainnet fork to confirm QuoterV2 and min-out behaviour.
- Confirm Core quotation path: `getQuote` (and `getPrice` fallback) used for `targetAmountOut` in stream execution.

## Checklist

- [ ] Protocol/trade placement tests pass on fork.
- [ ] No new linter/compiler issues.
- [ ] Deployment scripts (DeployBarebones, SetupBalancerV2Pools) reviewed for target network and env.
