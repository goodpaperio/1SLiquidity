# Contract Verification Instructions for v1.0.4

## Deployed Contracts

- **Core**: `0x66be9da4d7312d48c855be1fc4c1e979b6e94cc2`
- **StreamDaemon**: `0xbf1c6d73db66812eb67af1594587f33487951108`

## Verification Methods

### Method 1: Solidity (Single file) - RECOMMENDED

This is the simplest method using the flattened contracts.

### Step 1: Navigate to Etherscan

1. Go to https://etherscan.io/address/[CONTRACT_ADDRESS]
2. Click on the **"Contract"** tab
3. Click **"Verify and Publish"** button
4. Select **"Solidity (Single file)"** as the verification method

### Step 2: Verify Core Contract

**Contract Address**: `0x66be9da4d7312d48c855be1fc4c1e979b6e94cc2`

**Settings:**

- **Compiler Type**: `Solidity (Single file)` or `Solidity (Standard JSON Input)` if using the JSON method
- **Compiler Version**: `v0.8.30+commit.8c6c36b1` (or match your exact compilation version)
- **License**: `MIT` (or `UNLICENSED` as per the contract)
- **Optimization**: `Yes`
- **Optimization Runs**: `200`
- **Via IR**: `Yes` (if enabled during compilation)

**Constructor Arguments (ABI-encoded)**:

```
0x000000000000000000000000bf1c6d73db66812eb67af1594587f33487951108000000000000000000000000a03762eff4f98cda57dea0a8eb62ab872c8328780000000000000000000000005eaee88b493de2d646a8c29bb5b09a79c5322df40000000000000000000000000000000000000000000000000000000000000000
```

**Or use the following if Etherscan asks for individual parameters:**

- `_streamDaemon`: `0xbf1c6d73db66812eb67af1594587f33487951108`
- `_executor`: `0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878`
- `_registry`: `0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4`
- `_ethSupport`: `0x0000000000000000000000000000000000000000`

**Contract Source Code**:

1. Open `flattened/Core.sol` in your editor
2. Copy the **entire contents** of the file
3. Paste it into the "Enter the Solidity Contract Code below" field on Etherscan

### Step 3: Verify StreamDaemon Contract

**Contract Address**: `0xbf1c6d73db66812eb67af1594587f33487951108`

**Settings:**

- **Compiler Type**: `Solidity (Single file)` or `Solidity (Standard JSON Input)`
- **Compiler Version**: `v0.8.30+commit.8c6c36b1` (or match your exact compilation version)
- **License**: `MIT`
- **Optimization**: `Yes`
- **Optimization Runs**: `200`
- **Via IR**: `Yes` (if enabled during compilation)

**Constructor Arguments (ABI-encoded)**:

```
0x000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000006000000000000000000000000cdd26c4361aeb4b20f9e5a2119c7aac08b9da089000000000000000000000000cb08e56888e59c121ad8745cea19f75c5ccccf1b000000000000000000000000a54f8ae895b33814c1f4824dccbed6597ccac518000000000000000000000000c319a30e3aefc844f8ed9ca5dccdab592299cb4300000000000000000000000057cfc5ad0812747afbb3dcd98b23b94883a341bc000000000000000000000000f9abe8a26ecf289b7e16ccf88d67252dda2215a600000000000000000000000000000000000000000000000000000000000000060000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488d000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564000000000000000000000000d9e1ce17f2641f24ae83637ab66a2cca9c378b9f000000000000000000000000f9abe8a26ecf289b7e16ccf88d67252dda2215a6
```

**Or use the following if Etherscan asks for individual parameters:**

**DEX Addresses Array** (6 addresses):

1. `0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089` (UniswapV2Fetcher)
2. `0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B` (UniswapV3Fetcher 0.05%)
3. `0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518` (UniswapV3Fetcher 0.3%)
4. `0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43` (UniswapV3Fetcher 1%)
5. `0x57cfC5AD0812747afbb3dCD98B23b94883A341BC` (SushiswapFetcher)
6. `0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6` (BalancerV2Fetcher)

**Router Addresses Array** (6 addresses):

1. `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D` (UniswapV2 Router)
2. `0xE592427A0AEce92De3Edee1F18E0157C05861564` (UniswapV3 Router)
3. `0xE592427A0AEce92De3Edee1F18E0157C05861564` (UniswapV3 Router)
4. `0xE592427A0AEce92De3Edee1F18E0157C05861564` (UniswapV3 Router)
5. `0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F` (Sushiswap Router)
6. `0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6` (BalancerV2Fetcher - used as router)

**Contract Source Code**:

1. Open `flattened/StreamDaemon.sol` in your editor
2. Copy the **entire contents** of the file
3. Paste it into the "Enter the Solidity Contract Code below" field on Etherscan

## Alternative: Using Foundry Verify Command

### Core Verification:

```bash
forge verify-contract \
  0x66be9da4d7312d48c855be1fc4c1e979b6e94cc2 \
  src/Core.sol:Core \
  --etherscan-api-key $API_KEY_ETHERSCAN \
  --chain mainnet \
  --constructor-args $(cast abi-encode 'constructor(address,address,address,address)' 0xbf1c6d73db66812eb67af1594587f33487951108 0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878 0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4 0x0000000000000000000000000000000000000000) \
  --compiler-version 0.8.30 \
  --optimizer-runs 200 \
  --via-ir
```

### StreamDaemon Verification:

```bash
forge verify-contract \
  0xbf1c6d73db66812eb67af1594587f33487951108 \
  src/StreamDaemon.sol:StreamDaemon \
  --etherscan-api-key $API_KEY_ETHERSCAN \
  --chain mainnet \
  --constructor-args $(cast abi-encode 'constructor(address[],address[])' '[0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089,0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B,0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518,0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43,0x57cfC5AD0812747afbb3dCD98B23b94883A341BC,0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6]' '[0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D,0xE592427A0AEce92De3Edee1F18E0157C05861564,0xE592427A0AEce92De3Edee1F18E0157C05861564,0xE592427A0AEce92De3Edee1F18E0157C05861564,0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F,0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6]') \
  --compiler-version 0.8.30 \
  --optimizer-runs 200 \
  --via-ir
```

## Method 2: Standard JSON Input

If Etherscan requires Standard JSON Input format, **pre-generated JSON files are available** in the `flattened/` directory:

- `flattened/Core-standard-json-input.json` (167KB)
- `flattened/StreamDaemon-standard-json-input.json` (20KB)

To use Standard JSON Input:

1. Select **"Solidity (Standard JSON Input)"** on Etherscan
2. Upload the corresponding JSON file from `flattened/` directory:
   - For Core: `flattened/Core-standard-json-input.json`
   - For StreamDaemon: `flattened/StreamDaemon-standard-json-input.json`
3. Compiler version: `v0.8.30+commit.8c972834`
4. Enter the constructor arguments (same as Method 1)

**Alternative**: If you need to generate the JSON manually, use this structure:

```json
{
  "language": "Solidity",
  "sources": {
    "flattened/Core.sol": {
      "content": "[paste entire flattened Core.sol content here]"
    }
  },
  "settings": {
    "optimizer": {
      "enabled": true,
      "runs": 200
    },
    "viaIR": true,
    "evmVersion": "shanghai",
    "outputSelection": {
      "*": {
        "*": ["abi", "evm.bytecode", "evm.deployedBytecode"]
      }
    }
  }
}
```

3. Compiler version: `v0.8.30+commit.8c972834`
4. Upload this JSON file to Etherscan

**Note**: For Standard JSON Input, you can use the flattened .sol content as the source, but you must wrap it in the JSON structure above.

## Notes

- The flattened contracts are in the `flattened/` directory
- Core was deployed with `address(0)` for ETHSupport, which was then set via `setETHSupport()` call
- StreamDaemon was deployed with 6 DEXs (Curve excluded)
- All contracts use Solidity 0.8.30 with optimizer runs 200 and via-ir enabled
- **Recommended**: Use "Solidity (Single file)" method with flattened contracts
