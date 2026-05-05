# Trade placement on mainnet

Place a single ~$5 trade on mainnet Core (v1.0.6). Uses `deployKey` from your Foundry config.

## Prerequisites

- `.env` with `MAINNET_RPC_URL` or `INFURA_KEY` (for default RPC).
- `deployKey` in `~/.foundry/keystores` or `PRIVATE_KEY` in `.env`.
- **Mainnet**: signer must hold the input token (WETH/USDC) for the chosen pair.

## Mainnet (live)

```bash
# Pass PAIR as first argument
npm run place-trade -- WETH_DAI
npm run place-trade -- USDC_PEPE

# Or with script directly (optional RPC override)
./scripts/place-trade.sh WETH_DAI
./scripts/place-trade.sh WETH_DAI "https://mainnet.infura.io/v3/YOUR_KEY"
```

**Pairs:** `WETH_DAI`, `WETH_PEPE`, `USDC_DAI`, `USDC_PEPE`, `ETH_DAI`, `ETH_PEPE`

- **WETH_DAI / WETH_PEPE / USDC_*:** `Core.placeTrade(tradeData)` with WETH or USDC.
- **ETH_DAI / ETH_PEPE:** send ETH via `ETHSupport.placeTradeWithETH{value: ...}`.

**Sizes:** 0.0015 WETH (~$5) or 5 USDC; `amountOutMin = 0`.

---

## Fork (local Anvil, no mainnet balance needed)

Funds the signer from whales, then places the same trade. Use to test without spending mainnet funds.

```bash
# Terminal 1: start fork
npm run anvil:hard-start

# Terminal 2: place trade (same PAIRs as above)
npm run place-trade:fork -- WETH_DAI
./scripts/place-trade-fork.sh USDC_DAI
```

---

## Contracts (v1.0.6)

- **Core:** `0x0367A0B3299Ff8b6Af83E52BAe99D62270374ea2`
- **ETHSupport:** `0xB970aF8dA1909230a32819602d97a0C0d44C5FB5`

Scripts: `script/processes/PlaceTradeCast.s.sol` (mainnet), `PlaceTradeCastFork.s.sol` (fork).
