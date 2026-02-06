# Diagrams

This directory stores the architecture diagrams for individual components, smart contracts and process flows, together which provide a basis to implement the code for a functioning the protocol.

The diagrams should be succinct and should be updated as the project evolves through key milestones.

## Notes on Diagrams

The following are running notes made as the architecture diagrams for the protocol were initially drafted.

### Notes as Implemented (not to be used as reference)

### bot-settling-flow.puml

The final trade going out when settled by the bot must be of satisfactory volume to cover the BPS taken as fee. As such, this value _must be recorded as part of `tradeParams` metadata_. It is furthermore used to pay the bot for actions on the closure of a trade.

@audit a check should be in place to ensure that the any stream size is not too small to cover the fee.

### gate-daemon-sweet-spot-recache.puml

The manner in which the checks for sweet spots are orchestrated is done so in a way that has no degree of referencing to the actions of the off chain Keeper client. The values passed in from the front end are done so on assumptions made by the user.

This happens in affect as the sweet spots are calcuolated on chain. Since the Keeper will be run on direct parallel calls from a front end via a serverless lambda functionality and continuously check the state of varying DEXs on a minute-by-minute basis (to prevent any issues with the sweet spot cache), if a trade is referenced against the cache and found to be dissatisfacotirly outside the sweet spot threashold, the smart contract should emit an event.

It is of course a good aim to execute as fewer on chain caluclations as possible when executing a trade. As such, the utilisation of this element of funcation calling may be an issue to consider: should the EOA choose 'safe' or 'open' routes.

@audit if their conditions should fail, events will be triggered to inform the front end that a trade isn't settling due to gas price or other.

N.B. The optimum timing frequency for route updates with respect to the Keeper operating in its cron jobshould be (eventually) precisely determined from large data.
