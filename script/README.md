# Scripts Directory Organization

This directory contains all Foundry scripts for testing, deployment, and protocol management.

## Directory Structure

```
script/
├── processes/                    # Process-related scripts
│   ├── trade-placement/         # DEX trade placement tests
│   │   ├── UniswapV2TradePlacement.s.sol
│   │   ├── UniswapV3TradePlacement.s.sol
│   │   ├── SushiswapTradePlacement.s.sol
│   │   ├── BalancerTradePlacement.s.sol
│   │   ├── CurveTradePlacement.s.sol
│   │   ├── OneInchTradePlacement.s.sol
│   │   └── TradePlacement.s.sol
│   ├── deployment/              # Deployment and verification scripts
│   │   ├── DeployBarebones.s.sol
│   │   ├── DeployMainnet.s.sol
│   │   ├── Deploy.s.sol
│   │   └── VerifyDeployment.s.sol
│   ├── Instasettle.s.sol        # Instasettle process
│   ├── MultiSettle.s.sol        # Multi-settlement process
│   ├── QuantumMultiSettle.s.sol # Quantum multi-settlement
│   ├── TradeCancel.s.sol        # Trade cancellation
│   ├── GasCaching.s.sol         # Gas optimization
│   └── Bot.s.sol                # Bot functionality
├── Protocol.s.sol                # Protocol testing
├── SingleDexProtocol.s.sol       # Single DEX protocol testing
├── TestSingleReserves.s.sol      # Reserves testing
├── Deployments.sol               # Deployment utilities
└── FindWhales.s.sol              # Whale finding utilities
```

## Usage

### Trade Placement Tests

```bash
# Test individual DEXs
npm run test:uniswap-v2
npm run test:sushiswap
npm run test:balancer
npm run test:curve
npm run test:oneinch

# Test with Anvil fork
npm run test:uniswap-v2-anvil
npm run test:sushiswap-anvil
# ... etc
```

### Deployment Scripts

```bash
# Deploy barebones protocol
npm run deploy:barebones:god-mode

# Dry run deployment
npm run deploy:barebones:dry-run

# Deploy and extract addresses
npm run deploy:and:extract
```

### Address Extraction

```bash
# Extract addresses from deployment
npm run extract:addresses
```

## File Organization Benefits

✅ **Clear Separation**: Trade placement vs deployment scripts  
✅ **Easy Navigation**: Related files grouped together  
✅ **Maintainable**: Logical structure for future additions  
✅ **Team Friendly**: New developers can quickly find relevant scripts  
✅ **Scalable**: Easy to add new DEXs or deployment targets

## Adding New Scripts

### New DEX Integration

Place new DEX trade placement scripts in `script/processes/trade-placement/`

### New Deployment Target

Place new deployment scripts in `script/processes/deployment/`

### New Process

Place new process scripts directly in `script/processes/`

## Notes

- All file paths in `package.json` have been updated to reflect the new structure
- The `extract-addresses.sh` script creates `deployment-addresses.json` in the root directory
- Deployment addresses are automatically extracted from Foundry's broadcast files
