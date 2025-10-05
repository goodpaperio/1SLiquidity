# 🧪 Dynamic Testing System

## ✨ Features

- **Fully Dynamic** - Auto-adapts to any number of tokens in liquidity.json
- **Smart Chunking** - Automatically divides into chunks of 10 to avoid OutOfGas
- **Zero Maintenance** - Update liquidity.json and tests adapt automatically
- **Complete Coverage** - Tests ALL tokens regardless of how many there are

## 📊 How It Works

The system automatically:

1. Detects the number of pairs for each base token from JSON files
2. Calculates how many chunks of 10 are needed
3. Runs tests chunk by chunk
4. Aggregates results into a single summary per base token

### Example

```
liquidity.json updated:
- USDC: 71 pairs → Auto-creates 8 chunks (7×10 + 1×1)
- USDC: 150 pairs → Auto-creates 15 chunks (15×10)
- USDC: 5 pairs → Auto-creates 1 chunk (1×5)
```

**No code changes needed!** ✅

## 🚀 Available Scripts

| Script        | Description                                     |
| ------------- | ----------------------------------------------- |
| `./test-all`  | Test all 4 base tokens (USDC, USDT, WETH, WBTC) |
| `./test-usdc` | Test only USDC pairs                            |
| `./test-usdt` | Test only USDT pairs                            |
| `./test-weth` | Test only WETH pairs                            |
| `./test-wbtc` | Test only WBTC pairs                            |

## 📝 Usage

### Test All Tokens

```bash
./test-all

# With custom output file
./test-all my-results.json
```

### Test Individual Tokens

```bash
./test-usdc
./test-weth
# ... etc
```

### Test in Parallel (for speed)

```bash
# Run all 4 tests in parallel
./test-usdc usdc.json & \
./test-usdt usdt.json & \
./test-weth weth.json & \
./test-wbtc wbtc.json & \
wait
```

## 📊 Output Format

```json
{
  "timestamp": "2025-10-05T16:00:00Z",
  "testResults": [
    {
      "baseToken": "USDC",
      "totalTests": 71,
      "successCount": 58,
      "failureCount": 13
    },
    {
      "baseToken": "USDT",
      "totalTests": 54,
      "successCount": 44,
      "failureCount": 10
    }
  ]
}
```

## 📈 Console Output

```bash
$ ./test-all

🧪 Running all trade tests (dynamic chunking)...
📁 Output: test-results-20251005_160000.json

✨ Features:
   - Auto-detects number of pairs per token
   - Chunks automatically by 10 to avoid OutOfGas
   - Works with any liquidity.json update

Testing USDC in 8 chunks of 10

=== SUMMARY for USDC_chunk_1 ===
Success: 8 / 10
Failed: 2 / 10

=== SUMMARY for USDC_chunk_2 ===
Success: 9 / 10
Failed: 1 / 10

...

=== TOTAL SUMMARY for USDC ===
Success: 58 / 71
Failed: 13 / 71

[... other tokens ...]

✅ All tests completed!
📊 Results saved to: test-results-20251005_160000.json

📈 Summary:
USDC: 58/71 success (81%)
USDT: 44/54 success (81%)
WETH: 87/99 success (87%)
WBTC: 26/30 success (86%)
```

## 🔄 Update Workflow

### 1. Update liquidity data

```bash
# Update liquidity.json with new data
cp new-liquidity.json config/liquidity.json

# Regenerate pair files
cd config && npm run generate:pairs
```

### 2. Run tests automatically

```bash
# Tests auto-adapt to new token counts
./test-all
```

**That's it!** No code changes needed. ✅

## ⚙️ Configuration

### Adjust Chunk Size

Edit `test/fork/CoreFork.t.sol`:

```solidity
uint8 chunkSize = 10; // Change to 5, 15, 20, etc.
```

### Adjust Gas Limit

Edit `foundry.toml`:

```toml
gas_limit = 90000000  # Increase if needed
```

## 🎯 Technical Details

### Test Functions

Only 4 test functions (never needs updating):

- `test_PlaceTradeWithUSDCTokens()`
- `test_PlaceTradeWithUSDTTokens()`
- `test_PlaceTradeWithWETHTokens()`
- `test_PlaceTradeWithWBTCTokens()`

### Internal Logic

```solidity
_testTradesForToken() {
    // Auto-calculate number of chunks
    numChunks = (totalPairs + chunkSize - 1) / chunkSize;

    // Loop through chunks
    for (chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
        // Test 10 tokens in this chunk
        // Aggregate results
    }

    // Output total summary
}
```

## 💰 Gas Optimization

| Metric                        | Value                  |
| ----------------------------- | ---------------------- |
| **Gas per chunk (10 tokens)** | ~2M                    |
| **Max chunks in one test**    | Depends on total pairs |
| **Total gas per test**        | ~2M × numChunks        |
| **Gas limit**                 | 90M                    |
| **Max tokens testable**       | ~450 tokens per test   |

## 🔧 Files Structure

```
/
├── test-all                 # Run all tests
├── test-usdc               # Test USDC only
├── test-usdt               # Test USDT only
├── test-weth               # Test WETH only
├── test-wbtc               # Test WBTC only
├── test/fork/CoreFork.t.sol  # 4 dynamic test functions
├── config/
│   ├── liquidity.json      # Source data
│   ├── generate-pairs.js   # Regenerate pairs
│   └── *_pairs_clean.json  # Generated pair files
└── scripts/
    └── extract-events-to-json.sh  # Parse & aggregate results
```

## 💡 Advantages

✅ **Zero maintenance** - Update liquidity.json, tests adapt  
✅ **Complete coverage** - Tests ALL pairs automatically  
✅ **No OutOfGas** - Smart chunking prevents gas issues  
✅ **Clean code** - Only 4 test functions (vs 25+ hardcoded)  
✅ **Easy to understand** - No complex chunk management

---

**Last updated**: 2025-10-05  
**Status**: ✅ Production Ready - Fully Dynamic
