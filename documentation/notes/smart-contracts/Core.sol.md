# Core.sol contract

**Running Notes**

**State Variables**

**Functions**

- `executeTrades()`
  A functionality whose purpose is the settling of queued orders through in-contract identified DEX routes. This is the endpoint for a bot.

**MUST**

- cache the latest `gasPrice()` on each bot maintenance call
- cache the latest `block.timestamp` on each bot maintenance call
- `cumulativeGasEntailed` should be a part of trade metadata

**Events**

**Errors**

**Interfaces**

**Requirements**
