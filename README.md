# DECAStream Protocol

[![Foundry](https://img.shields.io/badge/foundry-0.2.0+-blue.svg)](https://getfoundry.sh/)
[![Solidity](https://img.shields.io/badge/solidity-^0.8.13-green.svg)](https://soliditylang.org/)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)](LICENSE)

This repository contains the smart contract implementation for the **DECAStream Protocol** - a revolutionary DeFi protocol that automatically routes trades across multiple DEXs and executes them in optimal chunks to minimize slippage and maximize efficiency.

## 🚀 Overview

Ever gone through the laborious process of checking each DEX to get the best trade? What if you don't care and just send it on whichever DEX you happen to be used to? This exposure to front running, pool manipulation and unpredictable slippage rates will be a thing of the past.

**NOW RUNNING AGAINST 6 DEXs!!!**

One click and the **DECAStream Protocol** will route your trade across the DEXs with the optimum trade conditions and '**Stream**' it out chunk by chunk, block by block. As market conditions change, we adapt, finding the best performing DEX on this stream by stream basis. When your trade is fully settled, you receive your tokens in precisely the threshold you defined. Taking too long? **Cancel** the trade at any time and return tokens exchanged to that point.

**Instasettle** furthermore allows anyone to instantly settle a trade across the contract in full. Users get to define thresholds in BPS and viewing traders can settle at these rates in one click. Both maker and taker get instant (block) settling.

**Hot Pairs** lists vetter token pairs which yield the maximum savings by using the protocol. Stream out highly illliquid tokens chunk by trunk to experience less than **10BPS** in splippage and experience up to 99% price accuracy across **massive volumes**.

_What makes DECAStream epic..._

- **Automated DEX Routing**: Automatically finds the best DEX for each trade based on price, liquidity, and gas costs
- **Stream Execution**: Breaks large trades into optimal chunks executed block-by-block to yield price accuracy up to **99%**
- **Dynamic Adaptation**: Continuously monitors market conditions and adjusts execution strategy which can yield **millions of dollars** worth of savings
- **Instasettle**: Allows instant settlement of trades at predefined thresholds in OTC style. Define your settlement price and experience **ZERO** slippage.
- **Cancellation**: Enables trade cancellation at any time with full return of settled and unsettled tokens.
- **Network Fees**: Network fee of just **0.2%** across all trade environments.

## ✨ Key Features

### 🎯 Smart Trade Routing

- **Multi-DEX Support**: Integrates with UniswapV2, UniswapV3 (all fee tiers now included!), Sushiswap, Balancer and Curve
- **Price Optimization**: Automatically selects the DEX offering the best price for each trade
- **Liquidity Analysis**: Evaluates pool depths to determine optimal trade sizes

### 🔄 Stream Execution

- **Chunked Trading**: Breaks large trades into smaller, optimal chunks
- **Block-by-Block**: Executes trades across multiple blocks to minimize market impact
- **Sweet Spot Algorithm**: Proprietary algorithm determines optimal chunk sizes based on pool reserves and gas costs

### ⚡ Instasettle

- **Instant Settlement**: Anyone can instantly settle a trade at predefined BPS thresholds
- **Maker-Taker Benefits**: Both parties benefit from instant, predictable settlement

### 🛡️ Security & Control

- **Trade Cancellation**: Cancel trades at any time and receive tokens exchanged to that point
- **Owner Controls**: Configurable fee rates and DEX registrations
- **Audit Ready**: Comprehensive testing and security measures

## 🏗️ Architecture

### Core Contracts

- **`Core.sol`**: Main protocol contract handling trade execution, fee management, and user interactions
- **`StreamDaemon.sol`**: Manages DEX selection and sweet spot calculations
- **`Executor.sol`**: Executes trades on various DEXs through standardized interfaces
- **`Registry.sol`**: Maintains DEX configurations and parameter encodings
- **`Utils.sol`**: Shared utilities and data structures

### DEX Integration

- **Fetcher Contracts**: Interface with specific DEXs to get prices and reserves
- **Router Management**: Configurable router addresses for each DEX type
- **Parameter Encoding**: Standardized parameter encoding for cross-DEX compatibility

### Fee Structure

- **Stream Fees**: 10 bps for protocol + 10 bps for bots (configurable)
- **Instasettle Fees**: 10 bps for protocol (configurable)
- **Maximum Cap**: 100 bps (1%) for all fee types

## 🚀 Getting Started

### Prerequisites

- [Foundry](https://getfoundry.sh/) (latest version)
- Node.js 16+ (for additional tooling)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/DECAStream.git
cd DECAStream

# Install Foundry dependencies
forge install

# Build contracts
forge build
```

### Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Fill in your configuration
# MAINNET_RPC_URL=your_mainnet_rpc
# ETHERSCAN_API_KEY=your_etherscan_key
# DEPLOYER_PRIVATE_KEY=your_private_key
```

## 🧪 Testing

### Run All Tests

```bash
# Run all tests
forge test

# Run with verbose output
forge test -vvv

# Run specific test file
forge test --match-path test/Core.t.sol

# Run with gas reporting
forge test --gas-report
```

### Fork Testing

```bash
# Test against mainnet fork
forge test --fork-url $MAINNET_RPC_URL

# Test with specific block number
forge test --fork-url $MAINNET_RPC_URL --fork-block-number 18000000
```

### Anvil Testing

```bash
# Start local anvil instance
anvil

# Run tests against anvil
forge test --fork-url http://localhost:8545
```

## 🚀 Deployment

### Mainnet Deployment

The protocol supports two deployment strategies:

#### 1. Barebones Deployment (Recommended for Initial Launch)

```bash
# Deploy with 3 core DEXs
npm run deploy:barebones:create2:complete

# Or run step by step
npm run deploy:barebones:create2
npm run extract:addresses
```

#### 2. Full Deployment (All DEXs)

```bash
# Deploy with all supported DEXs
npm run deploy:mainnet:create2:complete
```

### Dry Run (Recommended First)

```bash
# Test deployment without broadcasting
npm run deploy:barebones:dry-run
```

### Address Computation

```bash
# Compute expected CREATE2 addresses
npm run compute:addresses
```

## 🔧 Development

### Build

```bash
forge build
```

### Format Code

```bash
forge fmt
```

### Gas Optimization

```bash
# Generate gas snapshots
forge snapshot

# Compare gas usage
forge snapshot --diff
```

### Coverage

```bash
# Generate coverage report
forge coverage
```

## 🛡️ Security

### Audit Status

- **Status**: Pre-audit
- **Scope**: Core contracts, DEX integrations, fee mechanisms
- **Timeline**: Q1 2024

### Security Features

- **Access Control**: Owner-only functions for critical operations
- **Fee Caps**: Maximum fee limits to prevent excessive charges
- **Input Validation**: Comprehensive parameter validation
- **Emergency Controls**: Ability to pause or update critical functions

### Known Limitations

- **Centralization Risk**: Owner controls for fee updates and DEX registration
- **DEX Dependencies**: Relies on external DEX contracts and oracles
- **Gas Price Volatility**: Execution costs may vary significantly

## 📚 Documentation

- **[Protocol Overview](docs/PROTOCOL_OVERVIEW.md)**: Detailed protocol mechanics
- **[DEX Integration Guide](docs/DEX_INTEGRATION_GUIDE.md)**: How to add new DEXs
- **[Maintenance Guide](docs/PROTOCOL_MAINTENANCE_GUIDE.md)**: Contract upgrade procedures
- **[API Reference](docs/API_REFERENCE.md)**: Contract function documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

Feel free to jump in, propose enhancements, fixes and features! Just:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. The authors are not responsible for any financial losses incurred through the use of this protocol.

## 🙏 Acknowledgments

- **Foundry Team**: For the excellent development framework
- **OpenZeppelin**: For secure contract libraries
- **DEX Communities**: For building the infrastructure we integrate with
- **Early Contributors**: For helping shape the protocol

---

**Built with ❤️ by the DECAStream Team**
