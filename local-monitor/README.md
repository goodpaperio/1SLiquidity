# 1SLiquidity Trade Monitor & Executor

A comprehensive monitoring and execution system for 1SLiquidity smart contracts on Ethereum mainnet.

## 🚀 Features

- **Historical Analysis**: Scans and analyzes all trade events from contract deployment
- **Smart Caching**: Only scans new blocks since last run for optimal performance
- **Trade Execution**: Automatically executes outstanding trades via `executeTrades(pairId)`
- **Local Data Storage**: Maintains `localData.json` with trade metadata and execution state
- **GitHub Actions**: Automated cron job execution every 5 minutes
- **Forge Script Integration**: Direct mainnet execution via forge scripts
- **Cold Start Protection**: Bootstrap `localData.json` included for immediate community use

## 📊 Commands

### Monitoring

```bash
# Show current active trades
npm run monitor

# Run historical analysis (scans events, shows completed/ongoing trades)
npm run historical
```

### Execution

```bash
# Execute outstanding trades (requires wallet/signer)
npm run execute-trades

# Test complete workflow (monitor → execute → monitor)
npm run test-workflow
```

## 🔧 Local Testing

### With Forge Scripts

The recommended approach for testing and execution is using the forge script:

```bash
# Execute trades on mainnet using forge script
PAIR_ID=<pairId> CORE_ADDRESS=0xde054c37000a639d33b886df0e48b011c2092474 npm run execute:trades
```

### Environment Variables

```bash
export MAINNET_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
export PRIVATE_KEY="0xYOUR_PRIVATE_KEY"
```

### Telegram notifications

The monitor sends one Telegram message per run when credentials are set (heartbeat when no trades, or execution summary when trades run or fail).

- **Local**: set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in your environment (or `.env`).
- **AWS (EC2)**: add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to the **1sliquidity-bot-secrets** secret in AWS Secrets Manager (same JSON as `PRIVATE_KEY` and `MAINNET_RPC_HTTP_URL`). The Node scripts load these and send a message every run.

Shell-level alerts from `run-monitor.sh` (low balance, script errors) use the same env vars; on the server you can set them in `server/.env` or export before running.

## 🏁 First Run Setup

### For Community Members

The system includes a bootstrap `localData.json` file, so you can start immediately:

```bash
# Clone the repository
git clone <repository-url>
cd 1SLiquidity/local-monitor

# Install dependencies
npm install

# Set up environment variables
export MAINNET_RPC_URL="your-rpc-url"
export PRIVATE_KEY="your-private-key"

# Run immediately - no cold start issues!
npm run historical
```

### For GitHub Actions

The workflow automatically handles cold starts:

- **First run**: Creates default `localData.json` if no artifact exists
- **Subsequent runs**: Downloads previous state from artifacts
- **Cron schedule**: Runs every 5 minutes automatically

## 🏗️ Mainnet Execution via Forge Scripts

### ExecuteTrades Script

The system includes a forge script for direct mainnet execution located at `/alpha/ExecuteTrades.s.sol`.

#### Usage

```bash
# From the project root directory
PAIR_ID=<pairId> CORE_ADDRESS=<coreAddress> npm run execute:trades
```

#### Example: Execute WETH/USDT Trades

```bash
# Get the pairId from localData.json first
cd local-monitor
npm run historical

# Then execute trades (from project root)
cd ..
PAIR_ID=0x94510c2b7f4f4640b868d167f49f02f026caee698daf82f63cdedc6c182ab1ba CORE_ADDRESS=0xde054c37000a639d33b886df0e48b011c2092474 npm run execute:trades
```

#### Contract Addresses

- **Core Contract**: `0xde054c37000a639d33b886df0e48b011c2092474` (from deployment-addresses-mainnet-v1.0.3.json)

#### Finding Pair IDs

Pair IDs can be found in `localData.json` after running historical analysis:

```bash
cd local-monitor
npm run historical
cat localData.json
```

#### Script Details

- **Location**: `/alpha/ExecuteTrades.s.sol`
- **Function**: Calls `core.executeTrades(pairId)` on mainnet
- **Account**: Uses `deployKey` account from foundry
- **Sender**: `0x538e5e9797fa86ee25e97289439b6a3aba0165b0`

## 🔄 Complete Workflow

### Step-by-Step Process

1. **Monitor Current State**

   ```bash
   cd local-monitor
   npm run historical
   ```

2. **Identify Outstanding Trades**

   - Check `localData.json` for `outstandingTrades`
   - Note the `pairId` values that need execution

3. **Execute Trades on Mainnet**

   ```bash
   cd ..
   PAIR_ID=<pairId> CORE_ADDRESS=0xde054c37000a639d33b886df0e48b011c2092474 npm run execute:trades
   ```

4. **Verify Execution**
   ```bash
   cd local-monitor
   npm run historical
   ```

### Example Complete Session

```bash
# 1. Check current trades
cd local-monitor
npm run historical

# Output shows WETH/USDT trade with pairId: 0x94510c2b7f4f4640b868d167f49f02f026caee698daf82f63cdedc6c182ab1ba

# 2. Execute the trade
cd ..
PAIR_ID=0x94510c2b7f4f4640b868d167f49f02f026caee698daf82f63cdedc6c182ab1ba CORE_ADDRESS=0xde054c37000a639d33b886df0e48b011c2092474 npm run execute:trades

# 3. Verify the execution worked
cd local-monitor
npm run historical
```

## 📁 Local Data Structure

The system maintains `localData.json` with:

```json
{
  "lastRun": 23412281,
  "outstandingTrades": [
    {
      "tradeId": 2,
      "pairId": "0xaf6b746f77c055a846b64dcac5db6158b1d14e2a292a024b0ba5cf0ccac086d0",
      "lastSweetSpot": 3,
      "tokenIn": "WETH",
      "tokenOut": "USDC",
      "pair": "WETH/USDC",
      "owner": "0xBFC6...592C",
      "isInstasettlable": false,
      "lastUpdated": 1758468066
    }
  ],
  "lastUpdated": 1758468066
}
```

## 🤖 GitHub Actions Workflow

The system includes a GitHub Actions workflow (`.github/workflows/local-monitor.yml`) that:

1. **Runs every 5 minutes** via cron
2. **Step 1**: Runs `npm run historical` to cache outstanding trades
3. **Step 2**: Runs `npm run execute-trades` to execute trades
4. **Step 3**: Waits 24 seconds for transactions to be mined
5. **Step 4**: Runs `npm run historical` again to check updated state

### Required Secrets

- `MAINNET_RPC_URL`: Ethereum mainnet RPC endpoint
- `DFGSDFGTEH_PRIVATE_KEY`: Private key for transaction signing

## 📈 Performance

- **First Run**: Scans ~200k blocks (comprehensive historical analysis)
- **Subsequent Runs**: Scans only new blocks since last run
- **Example**: Second run scanned only 1 block instead of 200k

## 🔍 Trade Analysis

### Completed Trades Table

Shows trades that have been fully executed, cancelled, or settled:

- Trade ID, Pair, Amount In/Out, Executions, Progress, Type, Owner, Completion Date

### Ongoing Trades Table

Shows active trades still in progress:

- Trade ID, Pair, Amount In/Remaining, Target Out, Realised, Progress, Attempts, Owner, Insta Status

## 🛠️ Development

### Project Structure

```
local-monitor/
├── src/
│   ├── index.ts              # Main monitor entry point
│   ├── execute-trades.ts     # Trade execution script
│   ├── test-workflow.ts      # Complete workflow tester
│   ├── monitor.ts            # Core monitoring logic
│   ├── config.ts             # Configuration and token mappings
│   ├── types.ts              # TypeScript interfaces
│   └── abi/
│       └── Core.json         # Contract ABI with events
├── localData.json            # Cached trade data
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

### Key Components

- **TradeMonitor**: Core class handling all monitoring and execution
- **Event Scanning**: Scans `TradeCreated`, `TradeStreamExecuted`, `TradeCancelled`, `TradeSettled` events
- **Smart Caching**: Tracks last run block to avoid rescanning
- **Execution Logic**: Calls `executeTrades(pairId)` for each unique pair ID

### Bot whitelist (Core v1.0.6+)

The Core contract has an optional bot whitelist for `executeTrades`: when at least one bot is whitelisted, only those addresses can call `executeTrades`; otherwise anyone can. **`placeTrade` is not restricted**—any user can place trades. As Core owner, call `core.addBot(botAddress)` to restrict execution to your bot. Unit tests: `forge test --match-contract CoreBotWhitelistTest`.

## 🚨 Error Handling

- Graceful handling of RPC failures
- Continues execution even if individual trades fail
- Comprehensive logging and error reporting
- Automatic retry logic for transaction submission

## 📝 Notes

- The system uses keccak256 hashing for pair IDs to match contract logic
- Token symbols are resolved from a comprehensive mapping
- All timestamps are in Unix format
- The system is designed to be production-ready with proper error handling
