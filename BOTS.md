# Liquidity Bot packages

| Directory | Version | Purpose |
|-----------|---------|---------|
| [`liquidity-bot/`](liquidity-bot/) | **V1** | Full-universe mid-range coupled scan; still spawnable for ops / research |
| [`liquidity-bot-v2/`](liquidity-bot-v2/) | **V2** | Hot-pairs–bounded scan + price/depth selection (default for new bots) |
| [`arb-bot/`](arb-bot/) | — | Separate arb strategy (see its DESIGN.md) |

## Spawning

```bash
# V1
cd liquidity-bot && npm run generate bot -- <id>

# V2
cd liquidity-bot-v2 && npm run generate bot -- <id>
```

PM2 process names:

- V1: `liquidity-bot-<id>`
- V2: `liquidity-bot-v2-<id>`

Do not share the same bot id across both packages on the same host without separate wallets and env keys.

## Env notes (V2)

| Variable | Purpose |
|----------|---------|
| `HOT_PAIRS_API_BASE_URL` | Keeper base URL (e.g. `http://ec2-…:3000`) for `GET /api/tokens/top` |
| `BOT_<ID>_KEY` | Same pattern as V1 |
| `MAINNET_RPC_URL` / `DRY_RUN` | Same as V1 |

Settlement remains **local-monitor** for both V1 and V2.
