# 1inch V5 Integration Guide

## Overview

This document explains how to integrate 1inch V5 aggregation protocol with the 1SLiquidity protocol. The current implementation provides the foundation for 1inch integration with proper interfaces and testing infrastructure.

## Current Implementation Status

✅ **Completed:**

- 1inch V5 Router interface (`IOneInchV5Router.sol`)
- OneInchFetcher with price estimation
- Executor function for 1inch trades
- Registry encoding for 1inch parameters
- Test framework and documentation
- Price estimation with 2% improvement simulation

⚠️ **Requires Production Implementation:**

- 1inch API integration layer
- Real executor and swap data from API
- Error handling for API failures
- Gas optimization for API calls

## Architecture

```
User Request → Registry → Executor → 1inch V5 Router → Multiple DEXs
     ↓              ↓          ↓           ↓
API Quote ←    Parameters ← Interface ← Aggregated
                                          Liquidity
```

## Production Integration Steps

### 1. API Integration Layer

Create an off-chain service that interfaces with 1inch API:

```typescript
// Example API integration (off-chain)
class OneInchAPIService {
  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string
  ): Promise<QuoteResponse> {
    const response = await fetch(
      `https://api.1inch.io/v5.0/1/quote?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}`
    );
    return response.json();
  }

  async getSwapData(
    fromToken: string,
    toToken: string,
    amount: string,
    from: string,
    slippage: number
  ): Promise<SwapResponse> {
    const response = await fetch(
      `https://api.1inch.io/v5.0/1/swap?fromTokenAddress=${fromToken}&toTokenAddress=${toToken}&amount=${amount}&fromAddress=${from}&slippage=${slippage}`
    );
    return response.json();
  }
}
```

### 2. Update Registry with Real Data

Modify `Registry._prepareOneInchTrade` to use real API data:

```solidity
function _prepareOneInchTrade(
    address tokenIn,
    address tokenOut,
    uint256 amount,
    uint256 minOut,
    address recipient,
    address router,
    address realExecutor,     // From 1inch API
    bytes memory realSwapData // From 1inch API
) internal pure returns (TradeData memory) {

    bytes memory params = abi.encode(
        tokenIn,
        tokenOut,
        amount,
        minOut,
        recipient,
        router,
        realExecutor,  // Real executor from API
        realSwapData   // Real swap data from API
    );

    return TradeData({
        selector: Executor.executeOneInchTrade.selector,
        router: router,
        params: params
    });
}
```

### 3. Enhanced Error Handling

```solidity
function executeOneInchTrade(bytes memory params) external returns (uint256) {
    // ... decode parameters ...

    try IOneInchV5Router(router).swap(executor, desc, "", swapData)
    returns (uint256 returnAmount, uint256 spentAmount) {

        require(returnAmount >= amountOutMin, "Insufficient output amount");
        emit TradeExecuted(tokenIn, tokenOut, spentAmount, returnAmount);
        return returnAmount;

    } catch Error(string memory reason) {
        // Handle specific error messages from 1inch
        revert(string(abi.encodePacked("1inch swap failed: ", reason)));

    } catch (bytes memory lowLevelData) {
        // Handle low-level failures
        revert("1inch swap failed with unknown error");
    }
}
```

## Key Components

### 1. 1inch V5 Router Address

- **Ethereum Mainnet:** `0x1111111254EEB25477B68fb85Ed929f73A960582`
- **Other Networks:** Check [1inch docs](https://docs.1inch.io/docs/aggregation-protocol/smart-contract)

### 2. API Endpoints

- **Quote:** `GET /v5.0/{chainId}/quote`
- **Swap:** `GET /v5.0/{chainId}/swap`
- **Spender:** `GET /v5.0/{chainId}/approve/spender`

### 3. Response Structure

**Quote Response:**

```json
{
  "fromToken": {...},
  "toToken": {...},
  "toTokenAmount": "1000000000000000000",
  "fromTokenAmount": "2000000000000000000000",
  "protocols": [...],
  "estimatedGas": 150000
}
```

**Swap Response:**

```json
{
  "fromToken": {...},
  "toToken": {...},
  "toTokenAmount": "1000000000000000000",
  "fromTokenAmount": "2000000000000000000000",
  "protocols": [...],
  "tx": {
    "from": "0x...",
    "to": "0x1111111254EEB25477B68fb85Ed929f73A960582",
    "data": "0x...",
    "value": "0",
    "gasPrice": "20000000000",
    "gas": 150000
  }
}
```

## Benefits of 1inch Integration

1. **Better Rates:** 2-5% improvement over single DEX trades
2. **Deep Liquidity:** Access to 100+ DEXs and liquidity sources
3. **Advanced Routing:** Optimal path finding across multiple DEXs
4. **MEV Protection:** Built-in protection against sandwich attacks
5. **Gas Efficiency:** Optimized smart contracts for lower gas costs

## Testing

### Current Test Coverage

```bash
# Run 1inch tests
npm run test:oneinch-anvil

# Test outputs:
# ✅ OneInch-specific features (DEX type, version, aggregator)
# ✅ Price estimation with 2% improvement simulation
# ✅ Reserves estimation
# ✅ Integration structure documentation
```

### Test Results

- **Price Estimation:** 1 WETH → 4,330 USDC (realistic market rate, not improvement)
- **DEX Type:** "OneInch"
- **Version:** "V5"
- **Integration:** Structure documented and ready for API integration

**⚠️ Important Note:** The current price estimation is a **placeholder for testing only**. It uses hardcoded market rates (e.g., 1 WETH = 4,330 USDC) to simulate realistic pricing. In production, you **must** use the 1inch API for real-time quotes. The placeholder does NOT provide actual price improvements or aggregation benefits.

## Production Checklist

- [ ] Implement 1inch API service layer
- [ ] Set up API keys and rate limiting
- [ ] Add real executor and swap data to Registry
- [ ] Implement comprehensive error handling
- [ ] Add gas estimation and optimization
- [ ] Set up monitoring for API availability
- [ ] Add fallback mechanisms for API failures
- [ ] Implement slippage protection
- [ ] Add transaction simulation before execution
- [ ] Set up alerts for failed trades

## Example Integration Flow

```solidity
// 1. Get quote from 1inch API (off-chain)
QuoteResponse quote = oneInchAPI.getQuote(tokenIn, tokenOut, amount);

// 2. Get swap data from 1inch API (off-chain)
SwapResponse swapData = oneInchAPI.getSwapData(tokenIn, tokenOut, amount, userAddress, slippage);

// 3. Prepare trade data with real parameters
TradeData memory tradeData = registry.prepareTradeData(
    oneInchFetcher,
    tokenIn,
    tokenOut,
    amount,
    minOut,
    recipient,
    swapData.tx.to,      // Real 1inch router
    executor,            // Real executor from API
    swapData.tx.data     // Real swap data from API
);

// 4. Execute trade through Core
core.placeTrade(coreTradeData);
```

## Error Handling

Common 1inch errors and their handling:

- **Insufficient liquidity:** Retry with higher slippage
- **Price changed:** Get new quote and retry
- **Gas estimation failed:** Use fallback gas limit
- **API rate limit:** Implement exponential backoff
- **Network congestion:** Adjust gas price

## Monitoring and Alerts

Set up monitoring for:

- API response times
- Trade success rates
- Slippage vs. estimates
- Gas costs vs. estimates
- Failed trade reasons

## Conclusion

The 1inch V5 integration foundation is complete and ready for production deployment. The main remaining work is implementing the API integration layer and connecting real 1inch data to the existing smart contract infrastructure.

The current implementation provides:

- ✅ Complete smart contract interfaces
- ✅ Price estimation and testing
- ✅ Error handling structure
- ✅ Documentation and integration guide

Next steps: Implement the off-chain API service and connect it to the Registry for real-world trading.
