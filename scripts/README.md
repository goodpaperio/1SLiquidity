# Test Results Extraction Scripts

This folder contains scripts to automatically extract Forge test results and export them to JSON or CSV.

## Overview

The `CoreForkTest` tests now emit events and structured logs that allow automatic extraction of:

- Number of successful/failed tests per base token
- Details of each test (token name, address, failure reason)
- Timestamp and global statistics

## Available Scripts

### 1. Complete script with events (`extract-test-results.js`)

Uses Solidity events for robust extraction.

```bash
# Run a test and extract to JSON
forge test --match-test test_PlaceTradeWithUSDCTokens -vv 2>&1 | node scripts/extract-test-results.js - json

# Run a test and extract to CSV
forge test --match-test test_PlaceTradeWithUSDCTokens -vv 2>&1 | node scripts/extract-test-results.js - csv

# From existing log file
node scripts/extract-test-results.js test.log json
```

### 2. Automated script (`run-tests-with-export.sh`)

All-in-one script that runs tests and automatically extracts results.

```bash
# Run all CoreForkTest tests and export to JSON
./scripts/run-tests-with-export.sh CoreForkTest json

# Run specific test and export to CSV
./scripts/run-tests-with-export.sh test_PlaceTradeWithUSDCTokens csv

# Run multiple tests with pattern
./scripts/run-tests-with-export.sh "test_PlaceTrade" json
```

### 3. Simple JSON extraction script (`extract-json-logs.sh`)

Uses structured `console.log` logs for simpler extraction.

```bash
# From pipe
forge test --match-test test_PlaceTradeWithUSDCTokens -vv 2>&1 | ./scripts/extract-json-logs.sh - results.json

# From file
./scripts/extract-json-logs.sh test.log results.json
```

## Output File Formats

### JSON

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalTokenGroups": 1,
  "totalTests": 10,
  "totalSuccesses": 7,
  "totalFailures": 3,
  "tokenGroups": {
    "USDC": {
      "baseTokenSymbol": "USDC",
      "summary": {
        "totalTests": 10,
        "successCount": 7,
        "failureCount": 3
      },
      "results": [
        {
          "baseTokenSymbol": "USDC",
          "tokenName": "uni",
          "tokenAddress": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
          "success": true,
          "failureReason": ""
        }
      ]
    }
  }
}
```

### CSV

```csv
baseTokenSymbol,tokenName,tokenAddress,success,failureReason
USDC,uni,0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984,true,""
USDC,link,0x514910771AF9Ca656af840dff83E8264EcF986CA,false,"Insufficient liquidity"
```

## Usage Examples

### Test single base token

```bash
# Test only USDC pairs
./scripts/run-tests-with-export.sh test_PlaceTradeWithUSDCTokens json

# Test only WETH pairs
./scripts/run-tests-with-export.sh test_PlaceTradeWithWETHTokens csv
```

### Test all tokens

```bash
# Test all base tokens
./scripts/run-tests-with-export.sh CoreForkTest json
```

### Results analysis with jq

```bash
# Install jq if needed
brew install jq  # macOS
apt install jq   # Ubuntu

# Display global statistics
jq '.totalSuccesses, .totalFailures' results.json

# List failed tokens
jq '.tokenGroups[].results[] | select(.success == false) | .tokenName' results.json

# Count successes per base token
jq '.tokenGroups | to_entries[] | "\(.key): \(.value.summary.successCount)/\(.value.summary.totalTests)"' results.json
```

## Generated Files

Result files are automatically created with timestamp:

- `test-results-2024-01-15T10-30-00.json`
- `test-results-2024-01-15T10-30-00.csv`

## Troubleshooting

### Events not found

- Check that tests use the `_testTradesForToken` function
- Use `-vv` or higher for sufficient verbosity
- Events must be emitted (see `emit TokenTestResult` lines)

### JSON logs not found

- Check that logs contain `JSON_RESULT_START` and `JSON_RESULT_END`
- Use at least `-v` to enable `console.log`

### Permissions

```bash
chmod +x scripts/*.sh
```
