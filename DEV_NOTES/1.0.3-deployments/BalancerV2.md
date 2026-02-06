# Balancer V2 Integration Guide

## Overview

This document outlines the complete approach for integrating Balancer V2 into the 1SLiquidity protocol, replacing the existing hardcoded Balancer fetcher with a dynamic, registry-based system that supports multiple pools per token pair.

## Problem Statement

The existing `BalancerFetcher` only works on a per-pool basis, requiring explicit pool IDs to be passed in. In reality, we cannot derive pool IDs from token addresses as these are explicitly mapped in Balancer's subgraph. We need a dynamic system that can:

1. Discover pools based on token pairs
2. Support multiple pools per token pair
3. Select the best pool for execution
4. Maintain backward compatibility with `IUniversalDexInterface`

## Solution Architecture

### Core Components

1. **BalancerV2PoolRegistry** - Stores and manages pool information
2. **BalancerV2Fetcher** - Implements `IUniversalDexInterface` using the registry
3. **Updated IBalancerVault Interface** - Includes `queryBatchSwap` for accurate pricing
4. **Deployment Scripts** - Automated setup and population

### Key Features

- **Dynamic Pool Discovery**: Find pools by token addresses
- **Multiple Pool Support**: Store multiple pools per token pair
- **Primary Pool Selection**: Designate a "primary" pool for each pair
- **Best Price Execution**: Use `queryBatchSwap` for accurate pricing
- **Access Control**: Owner and keeper permissions
- **Backward Compatibility**: Implements existing `IUniversalDexInterface`

## Implementation Details

### 1. BalancerV2PoolRegistry Contract

**Location**: `src/adapters/BalancerV2PoolRegistry.sol`

**Key Functions**:

- `setPoolsForPair()` - Add pools for a token pair
- `addPool()` - Add individual pools
- `getPools()` - Retrieve all pools for a pair
- `getPrimary()` - Get the primary pool for a pair
- `setPrimaryIndex()` - Set which pool is primary

**Access Control**:

- Owner can manage all pools
- Keepers can add/remove pools
- Public read access to pool data

### 2. BalancerV2Fetcher Contract

**Location**: `src/adapters/BalancerV2Fetcher.sol`

**Implements**: `IUniversalDexInterface`

**Key Functions**:

- `getPoolAddress()` - Returns primary pool address
- `getPrice()` - Calculates best price across all pools
- `getBestPriceAndPool()` - Returns best pool and price
- `getDeepestPool()` - Returns pool with highest liquidity

**Integration**:

- Uses `BalancerV2PoolRegistry` for pool discovery
- Uses `IBalancerVault.queryBatchSwap()` for pricing
- Handles token decimals normalization

### 3. Updated IBalancerVault Interface

**Location**: `src/interfaces/dex/IBalancerVault.sol`

**New Additions**:

- `queryBatchSwap()` function
- `BatchSwapStep` struct
- `FundManagement` struct
- `SwapKind` enum

### 4. Pool Data Structure

```solidity
struct PoolInfo {
    address pool;      // Pool contract address
    bytes32 poolId;    // Balancer pool ID
}
```

## Data Population

### Source Data

**Balancer Pools Data**: `keeper/data/balancer-pools.json`

- 1,688 total pools analyzed
- 78 pools with vetted tokens
- 69 token pairs covered
- Real pool addresses and pool IDs

**Vetted Tokens**: `frontend/app/lib/utils/tokens-list-04-09-2025.json`

- 200+ vetted tokens
- Cross-referenced with Balancer pools
- Only tokens with both protocol and Balancer support

### Population Process

1. **Parse Balancer Data**: Extract pools with vetted tokens
2. **Generate Setup Script**: Create `SetupBalancerV2Pools.s.sol`
3. **Deploy Contracts**: Deploy registry and fetcher
4. **Populate Registry**: Add all discovered pools
5. **Set Primary Pools**: Designate primary pool for each pair

### Generated Setup Script

**Location**: `script/processes/SetupBalancerV2Pools.s.sol`

**Features**:

- Deploys `BalancerV2PoolRegistry` and `BalancerV2Fetcher`
- Populates registry with 69 token pairs
- Sets up both directions (A→B and B→A)
- Uses real pool addresses and pool IDs
- Proper access control setup

## Deployment Process

### 1. Dry Run Testing

```bash
# Test on anvil fork
npm run balancer:dry-run
```

**What it does**:

- Deploys contracts on fork
- Populates registry with all pools
- Verifies pool data extraction
- Tests access control

### 2. Production Deployment

```bash
# Deploy to mainnet
forge script script/processes/SetupBalancerV2Pools.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --broadcast \
  --verify
```

### 3. Registry Integration

**Update Main Registry**:

```solidity
// Add to Registry.sol
function addBalancerV2Fetcher(address _fetcher) external onlyOwner {
    dexFetchers["BalancerV2"] = _fetcher;
    dexRouters["BalancerV2"] = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    dexExecutors["BalancerV2"] = this.executeBalancerTrade.selector;
}
```

## Trade Execution Flow

### 1. Trade Initiation

1. User calls `Core.executeTrades(pairId)`
2. `Core` calls `StreamDaemon.evaluateSweetSpotAndDex()`
3. `StreamDaemon` evaluates available DEXes including BalancerV2
4. Best DEX is selected based on price/liquidity

### 2. Trade Preparation

1. `Core` calls `Registry.prepareTradeData()`
2. `Registry` calls `BalancerV2Fetcher.getPoolAddress()`
3. `BalancerV2Fetcher` queries `BalancerV2PoolRegistry.getPrimary()`
4. Pool address and pool ID are returned

### 3. Trade Execution

1. `Core` calls `Executor.executeBalancerTrade()` via delegatecall
2. `Executor` approves tokens to Balancer Vault
3. `Executor` calls `IBalancerVault.swap()` with pool ID
4. Trade is executed and amount out is returned

## Testing Strategy

### 1. Unit Tests

**Location**: `test/BalancerV2Test.t.sol`

**Coverage**:

- Registry functionality
- Fetcher pricing
- Access control
- Pool management

### 2. Integration Tests

**Location**: `test/BalancerV2MultiPoolTest.t.sol`

**Coverage**:

- Multiple pools per pair
- Primary pool selection
- Best price calculation
- Pool removal/addition

### 3. Trade Placement Tests

**Location**: `script/processes/trade-placement/BalancerV2TradePlacement.s.sol`

**Coverage**:

- End-to-end trade execution
- Integration with existing protocol
- Real pool data testing

### 4. Dry Run Testing

**Command**: `npm run balancer:dry-run`

**Verification**:

- Contract deployment
- Registry population
- Pool data accuracy
- Access control

## Configuration

### Environment Variables

```bash
# Required for deployment
PRIVATE_KEY=your_private_key
MAINNET_RPC_URL=your_rpc_url
ETHERSCAN_API_KEY=your_api_key
```

### Package.json Scripts

```json
{
  "balancer:dry-run": "forge script script/processes/SetupBalancerV2Pools.s.sol --fork-url http://localhost:8545 -vvvv",
  "test:balancer-v2-anvil": "forge test --match-path script/processes/trade-placement/BalancerV2TradePlacement.s.sol -vvvv --fork-url http://localhost:8545 --via-ir"
}
```

## Pool Data Management

### Current Coverage

- **Total Pools**: 78 pools
- **Token Pairs**: 69 pairs
- **Pool Types**: Weighted (28), Stable (1), Other (49)
- **Coverage**: All major token pairs (WETH, USDC, USDT, WBTC, DAI, etc.)

### Adding New Pools

1. **Update Balancer Data**: Run `npm run balancer:fetch` in `/keeper`
2. **Regenerate Setup Script**: Run `node scripts/parse-balancer-pools.js`
3. **Deploy Updated Registry**: Run `npm run balancer:dry-run -- --broadcast`

### Pool Maintenance

- **Primary Pool Updates**: Use `setPrimaryIndex()` for liquidity changes
- **Pool Removal**: Use `removePoolAt()` for inactive pools
- **New Pool Addition**: Use `addPool()` for new pools

## Security Considerations

### Access Control

- **Owner**: Full control over registry
- **Keepers**: Can add/remove pools
- **Public**: Read-only access to pool data

### Pool Validation

- **Address Validation**: Ensures pool addresses are valid
- **Pool ID Extraction**: Calls `getPoolId()` on pool contracts
- **Token Pair Validation**: Ensures tokens exist in pools

### Upgrade Path

- **Registry Upgrades**: Can be upgraded independently
- **Fetcher Upgrades**: Can be replaced without affecting registry
- **Backward Compatibility**: Maintains existing interface

## Performance Metrics

### Expected Performance

- **Pool Discovery**: < 1ms per pair
- **Price Calculation**: < 10ms per quote
- **Trade Execution**: Same as current Balancer
- **Gas Costs**: Similar to current implementation

### Optimization Opportunities

- **Caching**: Cache frequently accessed pools
- **Batch Operations**: Batch pool additions
- **Gas Optimization**: Optimize storage patterns

## Monitoring and Maintenance

### Key Metrics

- **Pool Count**: Track number of active pools
- **Trade Volume**: Monitor Balancer V2 usage
- **Price Accuracy**: Compare with other DEXes
- **Gas Usage**: Monitor execution costs

### Maintenance Tasks

- **Regular Updates**: Update pool data weekly
- **Pool Health**: Monitor pool liquidity
- **Performance**: Track execution metrics
- **Security**: Regular access control audits

## Troubleshooting

### Common Issues

1. **Checksum Errors**: Use proper EIP-55 checksum addresses
2. **Access Control**: Ensure proper owner/keeper setup
3. **Pool Data**: Verify pool addresses and IDs
4. **Gas Limits**: Check transaction gas limits

### Debug Commands

```bash
# Check registry state
cast call $REGISTRY_ADDRESS "getPools(address,address)" $TOKEN_A $TOKEN_B

# Verify pool data
cast call $POOL_ADDRESS "getPoolId()"

# Check access control
cast call $REGISTRY_ADDRESS "owner()"
```

## Future Enhancements

### Planned Features

1. **Multi-hop Swaps**: Support for complex routing
2. **Dynamic Fees**: Adjust fees based on pool conditions
3. **Liquidity Monitoring**: Real-time liquidity tracking
4. **Auto-rebalancing**: Automatic pool selection optimization

### Integration Opportunities

1. **Other DEXes**: Similar pattern for other DEX integrations
2. **Cross-chain**: Support for other chains
3. **Advanced Routing**: Multi-DEX routing strategies

## Conclusion

The Balancer V2 integration provides a robust, scalable solution for dynamic pool discovery and execution. The registry-based approach allows for easy maintenance and updates while maintaining backward compatibility with the existing protocol architecture.

The implementation successfully addresses the original problem of hardcoded pool IDs by providing a dynamic system that can discover and manage pools based on token pairs, supporting multiple pools per pair and selecting the best option for execution.

## Files Created/Modified

### New Files

- `src/adapters/BalancerV2PoolRegistry.sol`
- `src/adapters/BalancerV2Fetcher.sol`
- `src/interfaces/dex/IBalancerVault.sol` (updated)
- `script/processes/SetupBalancerV2Pools.s.sol`
- `test/BalancerV2Test.t.sol`
- `test/BalancerV2MultiPoolTest.t.sol`
- `script/processes/trade-placement/BalancerV2TradePlacement.s.sol`
- `scripts/parse-balancer-pools.js`
- `scripts/fix-checksums.js`

### Modified Files

- `package.json` (added scripts)
- `src/Registry.sol` (needs BalancerV2 integration)

### Generated Files

- `script/processes/SetupBalancerV2Pools.s.sol` (auto-generated from pool data)

## Next Steps

1. **Deploy Contracts**: Run `npm run balancer:dry-run -- --broadcast`
2. **Update Registry**: Add BalancerV2 integration to main Registry
3. **Test Integration**: Run comprehensive test suite
4. **Monitor Performance**: Track metrics and optimize
5. **Maintain Pools**: Regular updates and maintenance
