# DEX Calculator Module

This module provides a clean, extensible way to calculate swap amounts for different decentralized exchanges (DEXes) like Uniswap V2, Uniswap V3, SushiSwap, etc. using actual on-chain contract calls.

## Design Principles (SOLID)

The design follows SOLID principles:

1. **Single Responsibility Principle**: Each calculator class is responsible only for calculating swap amounts for a specific DEX implementation.

2. **Open/Closed Principle**: The system is open for extension (new DEX calculators can be added) but closed for modification (existing calculator implementations don't need to be changed to add new ones).

3. **Liskov Substitution Principle**: All calculator implementations can be used interchangeably through the `DexCalculator` interface.

4. **Interface Segregation Principle**: The `DexCalculator` interface defines only the methods needed by clients.

5. **Dependency Inversion Principle**: High-level modules depend on abstractions (the `DexCalculator` interface), not concrete implementations.

## Key Components

### 1. DexCalculator Interface

The core abstraction that all DEX calculators implement:

```typescript
interface DexCalculator {
  calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string>
  calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string>
  getPairAddress(reserveData: ReserveData): string
  getExchangeFee(): number
}
```

### 2. BaseDexCalculator

An abstract base class that implements common functionality:

```typescript
abstract class BaseDexCalculator implements DexCalculator {
  protected provider: ethers.providers.Provider
  protected chainId: string

  constructor(chainId: string = '1') {
    this.provider = getSharedProvider(chainId)
    this.chainId = chainId
  }

  abstract calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string>
  abstract calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string>
  abstract getExchangeFee(): number

  getPairAddress(reserveData: ReserveData): string {
    return reserveData?.pairAddress || ''
  }

  protected formatOutput(
    amount: ethers.BigNumber,
    decimals: number = 18
  ): string {
    // Format BigNumber to string with proper decimals
  }
}
```

### 3. Concrete Implementations

Specific DEX calculators like:

- `UniswapV2Calculator`: Uses Uniswap V2 Router's `getAmountOut` and `getAmountIn` contract methods
- `SushiSwapCalculator`: Uses SushiSwap Router's equivalent methods
- `UniswapV3Calculator`: Uses Uniswap V3 Quoter for concentrated liquidity quotes with specific fee tiers

### 4. Factory Pattern

The `DexCalculatorFactory` creates the appropriate calculator based on the DEX type and chain ID:

```typescript
class DexCalculatorFactory {
  static createCalculator(
    dexType: string,
    feePercent?: number,
    chainId: string = '1'
  ): DexCalculator {
    switch (dexType.toLowerCase()) {
      case 'uniswap-v2':
        return new UniswapV2Calculator(chainId)
      case 'sushiswap':
        return new SushiSwapCalculator(chainId)
      default:
        // Check if it's a Uniswap V3 pool with fee tier
        if (dexType.startsWith('uniswap-v3')) {
          const feeTier = extractFeeTier(dexType)
          const feePercentage = feeTier / 10000
          return new UniswapV3Calculator(feePercentage, chainId, feeTier)
        }
        return new UniswapV2Calculator(chainId)
    }
  }
}
```

## On-Chain Calculation Approach

This implementation uses direct contract calls to DEX router/quoter contracts for maximum accuracy:

1. **Uniswap V2/SushiSwap**: Uses the router's `getAmountOut`/`getAmountIn` functions
2. **Uniswap V3**: Uses the quoter contract's `quoteExactInputSingle`/`quoteExactOutputSingle` functions with specific fee tiers

Benefits of on-chain calculations:

- Exact formula match with the DEX's own implementation
- Accounts for all protocol-specific logic and fee handling
- Automatically adapts to any protocol updates

## Uniswap V3 Support

The module supports Uniswap V3 pools with different fee tiers (0.05%, 0.3%, 1%):

1. **Fee Tier Extraction**: DEX identifiers like "uniswap-v3-3000" specify the fee tier (3000 basis points = 0.3%)
2. **Concentrated Liquidity**: Uses the Quoter contract to get accurate pricing for concentrated liquidity
3. **Fee Tier Handling**: Each Uniswap V3 pool can have different fee tiers (500, 3000, 10000 basis points)
4. **Pool Selection**: The system chooses the best V3 pool based on liquidity depth

Example DEX identifier format:

- `uniswap-v3-500` = Uniswap V3 with 0.05% fee
- `uniswap-v3-3000` = Uniswap V3 with 0.3% fee
- `uniswap-v3-10000` = Uniswap V3 with 1% fee

## Failover Mechanism

Each calculator includes a fallback to local calculation in case the contract call fails:

```typescript
try {
  // Try contract call first
  const amountOutWei = await this.quoter.quoteExactInputSingle(
    tokenIn,
    tokenOut,
    this.feeTier,
    amountInWei,
    0 // no price limit
  )
  return this.formatOutput(amountOutWei)
} catch (error) {
  // Fall back to local calculation if contract call fails
  if (
    parseFloat(reserveData.reserves.token0) > 0 &&
    parseFloat(reserveData.reserves.token1) > 0
  ) {
    // Fallback to V2 formula for V3 pools
    const v2Calculator = new UniswapV2Calculator(this.chainId)
    return await v2Calculator.calculateOutputAmount(amountIn, reserveData)
  }
  return 'Insufficient liquidity'
}
```

## Chain Support

The system supports multiple blockchain networks through configuration:

1. A global contract address configuration (`CONTRACT_ADDRESSES`)
2. Chain-specific address mappings (`NETWORK_ADDRESSES`)
3. A helper function to get the right address for the current chain (`getContractAddress`)

## Usage in Components

The component using these calculators needs to handle the asynchronous nature of the calculations:

```typescript
// Create the calculator with the current chain ID and extract fee tier if needed
const calculator = DexCalculatorFactory.createCalculator(
  reserveData.dex, // e.g., 'uniswap-v3-3000'
  undefined,
  chainId
)

// Use in an async function
const calculateAmounts = async () => {
  try {
    // Get output amount
    const outputAmount = await calculator.calculateOutputAmount(
      inputAmount,
      reserveData
    )

    // Process the result
    if (outputAmount === 'Insufficient liquidity') {
      // Handle error
    } else {
      // Update UI with calculation result
    }
  } catch (error) {
    // Handle calculation errors
  }
}
```

## Pool Selection Strategy

The system ranks pools in this order of preference:

1. Uniswap V3 pools with the highest liquidity (based on reserve depth)
2. Uniswap V2 pools
3. SushiSwap pools

For V3 pools, the system automatically extracts the fee tier from the DEX identifier and configures the calculator accordingly.

## Extending for New DEXes

To add support for a new DEX:

1. Create a new calculator class implementing `DexCalculator` or extending `BaseDexCalculator`
2. Add the necessary contract ABIs in the config
3. Add contract addresses to the configuration
4. Implement the calculation methods using contract calls
5. Add the new DEX type to the factory's switch statement

## Handling Calculation Errors

The module implements robust error handling:

- Returns 'Insufficient liquidity' when reserves are too low
- Handles division by zero errors
- Returns '0' for other calculation errors
- Preserves decimal precision using ethers.js BigNumber
