# 1SLiquidity Protocol Specifications

## 1. Introduction

### 1.1 Overview

The 1SLiquidity protocol provides an optimized framework for executing cryptocurrency trades across decentralized exchanges (DEXs) with minimal slippage and improved gas efficiency. The protocol implements a novel "streaming" approach to trade execution, whereby large trades are divided into multiple smaller trades to maximise trade output and stability, as the logic is carefully architected and optimised to maintaining predefined economic requisits. The result is a smooth, attack vector free trading experience. A 1 stop shop for liquidity across (currently...) EVM chains.

### 1.2 Objectives

- Optimize gas costs and simultaneous slippage affectsacross DeFi markets
- Support multiple DEX integrations for optimal liquidity routing
- Enable bot operators to efficiently settle trade streams

### 1.3 Key Innovations

- Dynamic trade streaming based on mathematical optimization
- An automated _'sweet spot'_ calculation balancing slippage against gas costs
- Multi-DEX routing for optimal liquidity utilization
- Gas-efficient batched trade execution mechanism

## 2. System Architecture

### 2.1 Component Overview

Several interconnected components collectively manage the lifecycle:

#### 2.1.1 Smart Contracts

- **Router**: Entry point for all user and bot interactions
- **Core**: Central contract managing trade state and orchestration
- **StreamDaemon**: Calculation engine for optimal trade streaming
- **Executor**: Handles DEX interactions and trade execution
- **Fees**: Manages fee collection and distribution
- **Utils**: Provides shared utilities and data structures

#### 2.1.2 Middleware

- **Subgraph**: Indexes blockchain events for efficient data access
- **Keeper**: Real time queries to DEXs for front end transaction construction & UI/UX

#### 2.1.3 Front-End

- **User Interface**: React application for interacting with the protocol

### 2.2 Data Flow

Trade execution follows a defined path through the system:

1. Users interact with the Front-End for trade creation, cancellation, or settlement. Keeper client fetches live prices from DEX feeds and caches them in Redis
2. Front-End submits transactions through the Router contract
3. Router validates and forwards requests to Core
4. Core manages trade state and orchestrates execution
5. StreamDaemon calculates optimal streaming parameters
6. Executor handles actual DEX interactions
7. Subgraph indexes events for UI updates
8. Bots settle trade streams, earning fees for gas reimbursement

### 2.3 Dependency Graph

```
                  ┌──────────┐
                  │          │
                  │ Front-End│
                  │          │
                  └─────┬────┘
                        │
                        ▼
┌─────────┐      ┌──────────┐
│         │      │          │
│Subgraph │◄────►┤  Router  │
│         │      │          │
└─────────┘      └─────┬────┘
                       │
                       ▼
                 ┌──────────┐
                 │          │
                 │   Core   │
                 │          │
                 └─────┬────┘
                       │
          ┌────────────┴───────────┐
          │                        │
          ▼                        ▼
   ┌──────────┐             ┌────────────┐
   │          │             │            │
   │ Executor │◄───────────►┤StreamDaemon│
   │          │             │            │
   └─────┬────┘             └─────┬──────┘
         │                        │
         ▼                        │
   ┌──────────┐                   │
   │          │                   │
   │   DEXs   │                   │
   │          │                   │
   └─────┬────┘                   │
         │                        │
         ▼                        ▼
   ┌──────────┐             ┌──────────┐
   │          │             │          │
   │   Fees   │             │  Utils   │
   │          │             │          │
   └──────────┘             └──────────┘
```

## 3. Smart Contracts

### 3.1 Router Contract

The Router serves as the primary entry point for global protocol interactions, providing security validation and forwarding calls to Core.

#### 3.1.1 Key Functions

- **createTrade**: Entry point for users to create new trades
- **cancelTrade**: Allows users to cancel pending trades
- **executeTrades**: Allows bots to execute pending trades for a specific token
- **instaSettle**: Permits immediate settlement of trades
- **instaConfig**: Manages the configuration of instasettle by the EOA owning the trade

#### 3.1.2 Security Mechanisms

- Non-contract validation prevents potential reentrancy
- Parameter validation via Utils contract
- Allowance verification for user tokens
- Gas price validation for bot executions

### 3.2 Core Contract

Central repository for trade state and orchestrates the trade lifecycle.

#### 3.2.1 Key Functions

- **createTrade**: Processes trade creation and initial execution
- **executeTrades**: Processes trade queue for a specific token
- **cancelTrade**: Handles trade cancellation and fund returns
- **instaSettle**: Manages immediate trade settlement

#### 3.2.2 Trade Queue Management

- Trades are grouped by token address
- Queue processing optimized for gas efficiency
- FIFO order processing within token queues

### 3.3 StreamDaemon Contract

Calculation services for determining optimal trade streaming parameters.

#### 3.3.1 Key Functions

- **checkSweetSpot**: Calculates optimal stream count based on reserves and gas costs
- **getStreamParameters**: Determines concrete streaming values for trades
- **updateDEXRoutes**: Manages DEX routing information

#### 3.3.2 Sweet Spot Caching

- Reserves and sweet spots cached with timestamps
- Bot-driven cache updates

### 3.4 Executor Functions

Handles the actual interaction with DEXs for trade execution.

#### 3.4.1 Key Functions

- **executeTrade**: Processes initial trade execution
- **settleTrade**: Settles subsequent trade streams
- **cancelTrade**: Handles execution-level cancellation
- **validateTradeParams**: Ensures trade parameters are valid

#### 3.4.2 DEX Interaction

- Multi-DEX support for optimal routing
- Dynamic selection based on available liquidity
- Reserve validation prior to execution

### 3.5 Fees Contract

Fees manages fee collection and distribution throughout the protocol. Its purpose is to accrue balances for system maintainers (bot operators) and distribute them accordingly upon claim.

#### 3.5.1 Key Functions

- **transferFees**: Transfers fee amounts during settlement
- **claimFees**: Allows bots to claim accumulated fees
- **queryFees**: Provides view function for claimable fees

#### 3.5.2 Fee Structure

- Protocol fees for platform sustainability
- Bot fees for incentivizing settlement operations
- Dynamic fee calculation based on execution parameters

### 3.6 Utils Contract

Provides shared utility functions and data structures across the protocol.

#### 3.6.1 Key Functions

- **generatePairId**: Creates unique identifiers for token pairs
- **validateTradeParams**: Validates trade parameters
- **calculateFeeAmount**: Computes fee amounts
- **calculateStreamAmount**: Determines amount per stream
- **verifyDeadline**: Validates time-based constraints

#### 3.6.2 Shared Data Structures

- TradeParams: Core structure for trade information
- StreamParams: Structure for stream calculations

### 3.7 Key Algorithms

#### 3.7.1 Sweet Spot Algorithm

The sweet spot algorithm represents the core innovation of the protocol, optimizing trade streaming to balance slippage against gas costs.

##### Mathematical Foundation

The algorithm minimizes the combined cost function:
T(N) = G · N + V²/(R · N)

Where:

- N = Number of streams
- G = Gas cost per stream
- V = Total trade volume
- R = Pool reserve size

##### Derivation

Setting the derivative to zero and solving:
dT/dN = G - V²/(R · N²) = 0
N = V/√(G · R)

This formula determines the optimal number of streams for a given trade volume, gas cost, and reserve size.

##### Implementation Considerations

- Fee tier adjustments for different DEX models
- Liquidity depth validation (1% and 2% depth checks)
- Minimum threshold to ensure gas cost viability
- Cache timing for recalculation efficiency

#### 3.7.2 Stream Execution Algorithm

- Total streams based on sweet spot calculation
- Streams fulfilled counter for tracking progress
- Remainder handling for full amount settlement
- Special handling for final stream in a trade
- Fee calculation and distribution
- Status updates and event emission

## 4. Middleware

### 4.1 Subgraph Implementation

The protocol should leverage smoething like The Graph protocol for indexing blockchain events/ providing efficient data access.

#### 4.1.1 Entities

- **Trade**: Represents individual trades with their complete lifecycle
- **Stream**: Tracks individual trade streams and their execution status
- **User**: Aggregates user-specific trade information and statistics
- **Token**: Maintains token metadata and trade volume metrics
- **DEXRoute**: Records DEX routing information and utilization statistics

#### 4.1.2 Proposed Events

_@audit not to be considered succinct or production ready_

- TradeCreated events for new trade tracking
- TradeStreamExecuted for stream settlement monitoring
- TradeCancelled for cancellation tracking
- InstaSettleEvent for immediate settlement records
- FeesClaimed for bot fee distribution analysis
- TradeStreamCreated for stream creation monitoring
- DEXRouteAdded for DEX route monitoring
- DEXRouteRemoved for DEX route monitoring

#### 4.1.3 GraphQL API

- Good query interface for all protocol entities
- Real-time subscription for UI
- Aggregation queries for historical performance analysis

### 4.2 Keeper Client

#### 4.2.1 Core Functionality

### 4.3 Keeper

Provides the infrastructure for users to gauge trade shape when placing trades. It affectively fetches DEX reserves and processes them to give predicted settlement conditions. aside amounts and tokens, the only piece of calculated information that is passed on chain fron the front end is here, as the data is used to construct `botFeeAllocation` in the smart contract trade's entry.

The Keeper consists of serverless lambda functions that run asynchronously in parallel to fetch real-time DEX price data for the front-end interface. The data fetched from the DEXs is cached in Redis as a user pings a request for non-common tokens (hard coded and otherwise derived from subgraph datas). Any maths that is applied on chain is as such "rendered" client side.

#### 4.3.1 Core Functionality

- **DEX Price Fetching**: Real time price data collection from multiple DEXs
- **Reserves Monitoring**: Monitors on-chain reserves for pending settlements
- **Depth Monitoring**: Algorithm for reading appropriate depths exists at a given DEX (@dev limit can be user set)
- **Equations & Algorithms**: All maths is rendered client side
- **Parallel Processing**: Asynchronous data gathering across multiple liquidity sources
- **Caching Layer**: Short-term caching to minimize redundant requests

#### 4.3.2 Technical Implementation

- Serverless AWS lambda functions
- Event-driven architecture
- API Gateway for front-end requests
- Redis for high-performance caching

## 5. Front-End

### 5.1 User Interface

The design of the front end should contain feature windows which deisplay the core processes user's are exposed to for the protocol. The landing poage should be predominantly a CTA, whilst a 'Global Dashboard' may be introduced at a much later date.

#### 5.1.1 Key Features

- **Trade Entry**: Interface for creating, monitoring, and cancelling trades. Features gas cost, fees and slippage estimation
- **Position Tracking**: Dashboard for tracking active streams
- **History**: Dashboard for tracking historical streams
- **Advanced Features**: Advanced trade tweaks for a trade entry, bypassing the sweet spot algorithm
- **Gas Estimation**: Dynamic gas cost estimation for trade operations
- **DEX Selection**: Optional interface for choosing preferred DEXs

#### 5.1.2 Technical Stack

- Next.js front-end framework
- Web3.js for blockchain interactions
- AWS for serverless functions
- Redis for caching

#### 5.1.3 User Experience Considerations

- Real-time price and slippage estimations (first point of consideration for dev)
- Visual representation of trade streaming process
- Responsive design for mobile and desktop interfaces
- Wallet integration with all wallet providers (Rainbow kit style)

### Furture Considerations

- Uprade instasettle to degrade with time
