# Executor.sol Contract

## State

- **gasAllowanceForSingleStream** // used in incrementing the cumulativeGasEntailed, and used in checks to ensure the running gas cost doesn't excede the botAllocation. If it does, the trade should auto cancel

## **Notes**

- trade metadata must include:

```
botAllocation // formed of approximated gas cost + BPS for trade settlement
tokenIn
tokenOut
pairId
targetAmountOut // amountOut*(1-slippage)
realisedAmountOut // @audit must be incremented on each stream execution
cumulativeGasEntailed
?isInstasettlable
?slippage
?gasLimit
?streamCount
?suggestedSweetSpot
attempts


```

- if the trade metadata fails checks (e.g. stream size too small to pay fees, gas price limit too low, etc) the trade should be cancelled on a certain attempt.

## `executeStream()`

_Parameters_
