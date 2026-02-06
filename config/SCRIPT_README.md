# Pairs Generation Script

## 📋 Description

The `generate-pairs.js` script automatically generates `*_pairs_clean.json` files from the `liquidity.json` file.

It extracts all liquidity pairs with non-zero reserves for each base token (USDC, USDT, WBTC, WETH).

## 🚀 Usage

### Simple Execution

```bash
cd config
node generate-pairs.js
```

Or from the project root:

```bash
node config/generate-pairs.js
```

### As Executable Script

The script can also be executed directly:

```bash
cd config
./generate-pairs.js
```

## 📁 Generated Files

The script generates 4 JSON files:

- `usdc_pairs_clean.json` - Pairs with USDC
- `usdt_pairs_clean.json` - Pairs with USDT
- `wbtc_pairs_clean.json` - Pairs with WBTC
- `weth_pairs_clean.json` - Pairs with WETH

## 📊 Output Format

Each generated file contains:

```json
{
  "description": "Content description",
  "totalCount": 71,
  "extractedAt": "2025-10-05T12:33:01.044Z",
  "filterCriteria": "Reserves token0 > 0 AND token1 > 0",
  "pairs": [
    {
      "name": "token_symbol",
      "address": "0x..."
    }
  ]
}
```

## ⚙️ Configuration

### Base Tokens

Base tokens are configured in the script:

```javascript
const BASE_TOKENS = {
  usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  wbtc: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
};
```

To add a new base token, modify this constant in the script.

## 🔍 Filtering Criteria

The script applies the following criteria:

1. ✅ **Non-zero reserves**: Both reserves (token0 and token1) must be > 0
2. ✅ **Deduplication**: Addresses are compared case-insensitively
3. ✅ **Alphabetical sorting**: Pairs are sorted by token name

## 🔄 Update Workflow

### Step 1: Update liquidity.json

```bash
# Replace liquidity.json with your new data
cp new-liquidity.json config/liquidity.json
```

### Step 2: Generate files

```bash
cd config
node generate-pairs.js
```

### Step 3: Verify results

```bash
# Check the number of generated pairs
cat usdc_pairs_clean.json | grep '"name"' | wc -l
cat usdt_pairs_clean.json | grep '"name"' | wc -l
cat wbtc_pairs_clean.json | grep '"name"' | wc -l
cat weth_pairs_clean.json | grep '"name"' | wc -l
```

## 📝 Output Examples

### Successful Execution

```
🚀 Generating *_pairs_clean.json files...

📖 Loaded: liquidity.json (113 tokens)

✅ Generated: usdc_pairs_clean.json (71 pairs)
✅ Generated: usdt_pairs_clean.json (54 pairs)
✅ Generated: wbtc_pairs_clean.json (30 pairs)
✅ Generated: weth_pairs_clean.json (99 pairs)

✨ Generation completed successfully!
```

### Error Cases

If `liquidity.json` doesn't exist:

```
❌ Error: File /path/to/liquidity.json does not exist
```

If JSON is invalid:

```
❌ Error reading liquidity.json: Unexpected token...
```

## 🛠️ Development

### Script Structure

```
generate-pairs.js
├── Configuration (BASE_TOKENS)
├── Utility functions
│   ├── normalizeAddress()
│   ├── hasNonZeroReserves()
│   └── extractPairsForBaseToken()
├── File generation
│   └── generatePairsFile()
└── Main function
    └── main()
```

### Exported Functions

The script exports the following functions for testing:

```javascript
const {
  extractPairsForBaseToken,
  normalizeAddress,
  hasNonZeroReserves,
} = require("./generate-pairs.js");
```

## 🐛 Debugging

To enable debug logs, you can modify the script and add:

```javascript
console.log("Debug:", JSON.stringify(variable, null, 2));
```

## 📦 Dependencies

The script uses only native Node.js modules:

- `fs` - File reading/writing
- `path` - Path manipulation

No npm dependency installation is required.

## 🔐 Security

- The script only reads `liquidity.json` and writes `*_pairs_clean.json` files
- No network connections are made
- Addresses are normalized to avoid duplications

## 📄 License

Same license as the parent project.

---

**Last updated**: 2025-10-05  
**Author**: Auto-generated for decastream
