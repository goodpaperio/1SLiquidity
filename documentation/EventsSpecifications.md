# Decastream Protocol Events Specifications

## Overview
This document outlines all events that need to be emitted by the smart contracts to enable proper indexing and tracking of protocol activities through the subgraph.

## Events by Contract

### Core.sol

#### TradeCreated
```solidity
event TradeCreated(
    uint256 indexed tradeId,
    address indexed user,
    address tokenIn,
    address tokenOut, // or pair?
    uint256 amountIn,
    uint256 amountRemaining,
    uint256 minAmountOut,
    uint256 realisedAmountOut,
    bool isInstasettlable,
    uint256 instasettleBps,
    uint256 botGasAllowance,
    uint96 cumulativeGasEntailed,
    uint256 lastSweetSpot, // or streamCount
);
```
- Emitted when a new trade is created

```solidity
event TradeStreamExecuted(
    uint256 indexed tradeId,
    // address indexed executor, // who executed the stream, not essential really
    uint256 amountIn,
    uint256 realisedAmountOut,
    uint256 cumulativeGasEntailed,
    uint256 lastSweetSpot,
    // address dex // not required really
);
```
- Emitted when a trade stream is executed

#### TradeCancelled
```solidity
event TradeCancelled(
    uint256 indexed tradeId,
    // address indexed user, //not required
    uint256 amountRemaining,
    uint256 realisedAmountOut,
);
```
- Emitted when a trade is cancelled

#### TradeSettled
```solidity
event TradeSettled(
    uint256 indexed tradeId,
    // address indexed user, // required? can be derived from tradeId
    address indexed settler,
    uint256 totalAmountIn, // amountRemaining
    uint256 totalAmountOut, // instaSettleAmount
    uint256 totalFees
);
```
- Emitted when a trade is fully settled

### Router.sol
Entry point for all user and bot interactions.

#### InstaSettleConfigured
```solidity
event InstaSettleConfigured(
    uint256 indexed tradeId,
    // address indexed user, // not essential
    bool enabled,
    uint256 instasettleBps
);
```
- Emitted when instasettle is configured

### StreamDaemon.sol

#### DEXRouteAdded
```solidity
event DEXRouteAdded(
    address indexed dex
);
```
- Emitted when a new DEX route is added

#### DEXRouteRemoved
```solidity
event DEXRouteRemoved(
    address indexed dex
);
```
- Emitted when a DEX route is removed

### Fees.sol
Manages fee collection and distribution.

#### FeesClaimed
```solidity
event FeesClaimed(
    address indexed bot,
    address indexed feeToken,
    uint256 amount,
);
```
- Emitted when a bot claims accumulated fees