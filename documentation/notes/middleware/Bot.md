# Bot

- must cache timestamp to pairId on each stream settling call, within some limit set in contract
- must cache the latest tokenIn/eth price on each stream settling call, within timestamped calls. This will be used later to determine the effect of gas pricing on stream count breakdowns.
- the bot will call a batcher to batch transactions to the contract
