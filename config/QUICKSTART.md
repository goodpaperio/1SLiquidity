# 🚀 Quick Start - Pairs Generation

## Quick Usage

### 1️⃣ Update liquidity.json

Replace the `liquidity.json` file with your new liquidity data.

### 2️⃣ Generate files

```bash
cd config
npm run generate:pairs
```

Or:

```bash
cd config
node generate-pairs.js
```

### 3️⃣ Result

You will get 5 updated files:

- ✅ `usdc_pairs_clean.json`
- ✅ `usdt_pairs_clean.json`
- ✅ `wbtc_pairs_clean.json`
- ✅ `weth_pairs_clean.json`
- ✅ `dai_pairs_clean.json`

## Example Output

```
🚀 Generating *_pairs_clean.json files...

📖 Loaded: liquidity.json (113 tokens)

✅ Generated: usdc_pairs_clean.json (71 pairs)
✅ Generated: usdt_pairs_clean.json (54 pairs)
✅ Generated: wbtc_pairs_clean.json (30 pairs)
✅ Generated: weth_pairs_clean.json (99 pairs)
✅ Generated: dai_pairs_clean.json (5 pairs)

✨ Generation completed successfully!
```

## liquidity.json Structure

The `liquidity.json` file must have the following structure:

```json
[
  {
    "tokenAddress": "0x...",
    "tokenSymbol": "TOKEN",
    "tokenName": "Token Name",
    "marketCap": 123456,
    "liquidityPairs": [
      {
        "tokenAddress": "0x...",
        "tokenSymbol": "PAIR_TOKEN",
        "baseToken": "0x...",
        "baseTokenSymbol": "base",
        "dex": "uniswap-v3-3000",
        "reserves": {
          "token0": "123456789",
          "token1": "987654321"
        },
        "decimals": {
          "token0": 18,
          "token1": 18
        },
        "timestamp": 1234567890,
        "pairAddress": "0x..."
      }
    ]
  }
]
```

## Supported Base Tokens

| Token | Address                                      |
| ----- | -------------------------------------------- |
| USDC  | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| USDT  | `0xdac17f958d2ee523a2206206994597c13d831ec7` |
| WBTC  | `0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599` |
| WETH  | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` |
| DAI   | `0x6B175474E89094C44Da98b954EedeAC495271d0F` |

## Filtering Criteria

- ✅ Reserves `token0 > 0`
- ✅ Reserves `token1 > 0`
- ✅ No duplicate addresses
- ✅ Alphabetical sorting by symbol

## Support

For more details, see [SCRIPT_README.md](./SCRIPT_README.md)
