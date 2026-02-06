# Keeper Client

Will be built out of a typescript backend, able to be run from a github action cronjob or similar.

The client:

**MUST**

- populate DEX data into the sugbraph for trade construction in the UI
- trigger recaching of DEX data into the smart contracts for use in trade executions
- utilise websockets to monitor DEX dynamics and trigger updates to the subgraoh **asynchronously**
- utilise websockets to monitor DEX dynamics and trigger calls in the smart contracts appropriately
- represent (hold encrypted keys to) an EOA's wallet
- cache the `feeTiers()` for tokens in the server side keeper client, or default return `3000` for effectively unlisted/unrevognised tokens

**NOTES**

- The client will be run on Next.js serverless lambda functions
- The client will utilise Redis for caching recently fetched datas
- The amount of gas to be deducted on closure of a trade/position is to be included in the trade's metadata and is calculated based on fetched datas from the DEXs in estimating the expected number of streams wrt sweet spots at time of trade placement. this fee is to be taken by a bot/keeper on the closing of a trade/position
- The stream size is **ONLY EVER CALCULATED ON CHAIN**
