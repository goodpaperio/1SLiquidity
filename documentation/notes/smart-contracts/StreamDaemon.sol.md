# StreamDaemon.sol Contract

**Preface**

The following text is comprosied of running notes made during the design and architecting of the entire protocol. It is a WIP and may feature breaking changes to the final product.

## Intro

It's important to wrap your head around how a stream works before reading further here.

Essentially a stream is some dynamic fraction of a trade volume. We split it up to balance slippage achieved vs gas cost entailed.

Ultimately, we find that the slippage entailed is restricted primarily by the reserves of any token pair within the DEX (along with, of course, some consideration towards +/- x%) liquidity depth. This yields an optimum number of streams considering gas cost impacts as slippage impact decreases exponentially.

**Notes**

- DEXs and tokens must be listed in the `StreamDaemon` contract // **DEPRACATED** no longer needs to be 'listed' rather is populated on any bot maintenance call
- there should exist a function to add a new DEX to the daemon, as well as populate it with pair routes. Use a mapping like `mapping(address => mapping(bytes32[] => address[])) public dexTokenInTokenOutSweetSpot` to store the routes, and relevant parameters passed to the fucntion call in listing a new DEX **DEPRACATED**
- The `dexTokenInTokenOutSweetSpot` mapping should obey a schema for sweet spots, moving in 10% shifts when iterating // **DEPRACATED** this is needless now since we have our sweet spot equation
- `pairIdUpdateTime` should be cached and called in checks when referencing the DEXs // [tick]
- pairId routes should be able to be updated [tick]
- ...as well as removed // **DEPRACATED**
- N.B. We can use ERC165 _supports interface_ to check that newly populate routes satisfy the interface required to interact with a DEX's basic function calls (e.g. `getReserves`)
- Whilst this may initially be set by the owner, eventually it may be offloaded to a DAO [tick]
- Tokens would require whitelisting and votes cast on them // **DEPRACATED** sers are at their own volition to utilise the off-chain store of token/pairIds. They may choose to pass a new token pair, which has no endpoint, directly into the contract. [tick]

## Algorithm & Mechanics

**Sweet Spot Algorithm**

The aim of the sweet spot algorithm is to (a) determine the optimal number of streams for a given trade, and (b) to determine the DEX to route a stream to in the settling of the trade.

We can derive some equations which describe the dynamics of the `amountIn` to `streamCount`.

The following are variables involved in the process:

- `amountIn` // = `tradeVolume / sweetSpot` where `tradeVolume` is the amount of tokens to be spent on a trade and `sweetSpot` is the number of streams proportional to this trade volume
- `slippage` // = `slippage` is the amount of slippage to be used on a trade, entered when a trade is constructed
- `gas cost` // = `gas cost` is the amount of gas to be used multiplied by the `gasPrice`. This should be cached upon the call of `Bot`'s `executeTrades` function and read from trade metadata in the formulation of `botFee`
- `feeTier` // = `feeTier` returned from the `KeeperClient` which will cache fee tiers for common tokens and default to 3000 for unlisted tokens. Passing the wrong value in will just revert a tx thus doesn't provide a vector for attacks

We define the algorithm to work in terms of slippage attained which we can calculate from reserves. These can be pinged async in a single function call (should include 1% depth check).

What we are looking to ascertain is that the total trade volume is strictly less than <1% (or some user determined value) of a pool's liquidity. If yes, we look at 2% depth to cross compare. Whichever we find, we then split the trade proportionally to the reserve in that pool for the following trade chunk, ensuring a ratio of >=100:1.

To take gas into consideration, a known gas volume will be used in trade executions, or a limit for this can be set. From there, we can utilise cached gas prices, cached on timelocked Bot calls, with the known gas usage to determine our gas cost per call. Now, we need to compare this to ensure it is less than the stream size. Note that we will rely on off chain calculations to determine this value. Vulnerabilities herer are mitigated since it is only a 'best work' approach in evaluating this number, and if a user spams or attempts to set low values, the calls will either simply be front run or rejected, thus showing no incentive for attackers in the first place.

## Calculus for Ascertaining Core Equation\*\*

So, we firstly look at gas cost. Then we look at slippage losses on a per trade basis. Then we combine the two and find the minima via derivation.

![Gas Cost](https://latex.codecogs.com/svg.image?\text{Gas%20Cost}%20=%20N%20\cdot%20G)

![Slippage per trade](https://latex.codecogs.com/svg.image?\text{Slippage%20per%20trade}%20=%20\frac{v}{R}%20\cdot%20v%20=%20\frac{v^2}{R})

![Total Slippage](<https://latex.codecogs.com/svg.image?\text{Total%20Slippage}%20=%20N%20\cdot%20\frac{v^2}{R}%20=%20N%20\cdot%20\frac{(V/N)^2}{R}%20=%20\frac{V^2}{N%20\cdot%20R}>)

**Combined expression**

![Combined T(N)](<https://latex.codecogs.com/svg.image?T(N)%20=%20N%20\cdot%20G%20+%20\frac{V^2}{N%20\cdot%20R}>)

**Let’s Find the Minimum**

To find the optimal `N` we minimize:

![V(N)](<https://latex.codecogs.com/svg.image?T(N)%20=%20G%20\cdot%20N%20+%20\frac{V^2}{R%20\cdot%20N}>)

**Derivation**

We can find the minimum analytically by taking the derivative and solving:

![dV/dN](https://latex.codecogs.com/svg.image?\frac{dT}{dN}%20=%20G%20-%20\frac{V^2}{R%20\cdot%20N^2})

Set `dV/dN` to zero:

![Solve for N squared](https://latex.codecogs.com/svg.image?G%20=%20\frac{V^2}{R%20\cdot%20N^2}%20\quad%20\Rightarrow%20\quad%20N^2%20=%20\frac{V^2}{G%20\cdot%20R})

![N](https://latex.codecogs.com/svg.image?\Rightarrow%20\quad%20N%20=%20\frac{V}{\sqrt{G%20\cdot%20R}})

...which gives us an equation to use for a given trade volume, gas cost, and reserve size. This can effectively be calculated on chain and removes the need for loops.

## Assumptions

Some notes on assumptions made in the algorithm:

- the pool liquidity rebalance happens on a block by block basis
- trades are a relatively small percentage of pool liquidity (due to the slippage being judged without a delta of volume added to the reserve in the denominator of the initial slippage equation).The actual impact of this is that the slippage is overestimated, and so the number of streams is overestimated. This is a 'best work' approach. It therefore will not accurately consider real slippage and relative gas costs in larger trades.

**@audit** this should be tested to find the break points, which may be restricted in contract, e.g. max% of pool liquidity, etc.

**Scaling**

Taking this deterministic approach to the fundamental equation does not consider constants which may be added to the equation (since their effect on derivatives is non existent) or external factors which may iteratively change the resulting DEX returned.

- the pool fee tier // in determining total cost
- the +/-2% liquidity depth in contract
- a cache for pairId => DEX => volume may yet be implemented which caches values on a bot run. The affectiveness of this

@audit needs research
