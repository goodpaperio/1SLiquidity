// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { IUniversalDexInterface } from "./interfaces/IUniversalDexInterface.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // @audit following eternal storage pattern may go to Core.sol
    mapping(address => address) public dexToRouters; // goes to Core.sol

    event DEXRouteAdded(address indexed dex);
    event DEXRouteRemoved(address indexed dex);
    event DEXRouterUpdated(address indexed dex, address indexed router);

    // temporarily efine a constant for minimum effective gas in dollars
    // uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against
        // TOKEN-USDC value during execution in production
    uint256 public DEFAULT_SWEET_SPOT = 4;
    uint256 public MAXIMUM_SWEET_SPOT = 500;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address internal constant ETH_SENTINEL = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    constructor(address[] memory _dexs, address[] memory _routers) Ownable(msg.sender) {
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
        for (uint256 i = 0; i < _routers.length; i++) {
            dexToRouters[_dexs[i]] = _routers[i];
        } // @audit make sure to pass the routers in the appropriate order wrt how the dex's are inputted on deployment
    }

    function setDefaultSweetSpot(uint256 _defaultSweetSpot) external onlyOwner {
        DEFAULT_SWEET_SPOT = _defaultSweetSpot;
    }

    function setMaximumSweetSpot(uint256 _maximumSweetSpot) external onlyOwner {
        MAXIMUM_SWEET_SPOT = _maximumSweetSpot;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function registerDex(address _fetcher) external onlyOwner {
        require(_fetcher != address(0), "invalid fetcher");
        require(!_dexExists(_fetcher), "fetcher already registered");
        dexs.push(_fetcher); // @audit this storage allocation has multiple dependancies in order to actually function,
            // including deployments of appropriate fetchers and configuration of the relevant dex's interface
        emit DEXRouteAdded(_fetcher);
    }

    function registerDexWithRouter(address _fetcher, address _router) external onlyOwner {
        require(_fetcher != address(0), "invalid fetcher");
        require(_router != address(0), "invalid router");
        require(!_dexExists(_fetcher), "fetcher already registered");
        dexs.push(_fetcher);
        dexToRouters[_fetcher] = _router;
        emit DEXRouteAdded(_fetcher);
        emit DEXRouterUpdated(_fetcher, _router);
    }

    function setDexRouter(address _fetcher, address _router) external onlyOwner {
        require(_fetcher != address(0), "invalid fetcher");
        require(_router != address(0), "invalid router");
        require(_dexExists(_fetcher), "fetcher not registered");
        dexToRouters[_fetcher] = _router;
        emit DEXRouterUpdated(_fetcher, _router);
    }

    function removeDex(address _fetcher) external onlyOwner {
        for (uint256 i = 0; i < dexs.length; i++) {
            if (dexs[i] == _fetcher) {
                dexs[i] = dexs[dexs.length - 1];
                dexs.pop();
                delete dexToRouters[_fetcher];
                emit DEXRouteRemoved(_fetcher);
                break;
            }
        }
    }

    function _dexExists(address _fetcher) internal view returns (bool) {
        for (uint256 i = 0; i < dexs.length; i++) {
            if (dexs[i] == _fetcher) return true;
        }
        return false;
    }

    function evaluateSweetSpotAndDex(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        uint256 effectiveGas,
        bool usePriceBased
    )
        public
        view
        returns (uint256 sweetSpot, address bestFetcher, address router)
    {
        address identifiedFetcher;
        uint256 maxReserveIn;
        uint256 maxReserveOut;

        // lets implement this conditional: if (tokenOut == 0x0000000000000000000000000000000000000000 | 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) { let tokenOut == WETH }
        if (tokenOut == 0x0000000000000000000000000000000000000000 || tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
            tokenOut = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // drop address in here @ethsupport
        }

        if (usePriceBased) {
            // Price-based DEX selection
            (identifiedFetcher, maxReserveIn, maxReserveOut) = findBestPriceForTokenPair(tokenIn, tokenOut, volume);
            bestFetcher = identifiedFetcher;
            router = dexToRouters[bestFetcher];
        } else {
            // Reserve-based DEX selection
            (identifiedFetcher, maxReserveIn, maxReserveOut) = findHighestReservesForTokenPair(tokenIn, tokenOut);
            bestFetcher = identifiedFetcher;
            router = dexToRouters[bestFetcher];
        }

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, bestFetcher);
    }

    function evaluateStreamPlan(
        address tokenIn,
        address tokenOut,
        uint256 amountRemaining,
        bool targetOutPending,
        bool usePriceBased,
        uint256 preferredSweetSpot
    )
        external
        returns (
            address bestFetcher,
            address router,
            uint256 sweetSpot,
            uint256 streamVolume,
            uint256 quotedOut,
            bytes memory quoteAux
        )
    {
        address quoteTokenOut = tokenOut;
        if (quoteTokenOut == address(0) || quoteTokenOut == ETH_SENTINEL) {
            quoteTokenOut = WETH;
        }

        uint256 n = dexs.length;
        bool[] memory visited = new bool[](n);
        // One probe per DEX per planning call; pick next-best from cached scores (no O(n²) reserve/price re-reads).
        uint256[] memory scores = new uint256[](n);
        for (uint256 s = 0; s < n; s++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[s]);
            if (usePriceBased) {
                try fetcher.getPrice(tokenIn, quoteTokenOut, amountRemaining) returns (uint256 price) {
                    if (price > 0) {
                        scores[s] = price;
                    }
                } catch {}
            } else {
                try fetcher.getReserves(tokenIn, quoteTokenOut) returns (uint256 reserveIn, uint256) {
                    if (reserveIn > 0) {
                        scores[s] = reserveIn;
                    }
                } catch {}
            }
        }

        for (uint256 i = 0; i < n; i++) {
            (bool found, uint256 idx) = _bestUnvisitedDexIndex(scores, visited, usePriceBased);
            if (!found) {
                break;
            }

            visited[idx] = true;
            address candidate = dexs[idx];
            address candidateRouter = dexToRouters[candidate];
            if (candidateRouter == address(0)) {
                continue;
            }

            uint256 candidateSweetSpot;
            try this._sweetSpotAlgo(tokenIn, quoteTokenOut, amountRemaining, candidate) returns (uint256 computedSweetSpot) {
                candidateSweetSpot = computedSweetSpot;
            } catch {
                continue;
            }

            if (preferredSweetSpot >= 1 && preferredSweetSpot <= 4) {
                candidateSweetSpot = preferredSweetSpot;
            }

            if (candidateSweetSpot == 0) {
                continue;
            }

            if (targetOutPending) {
                streamVolume = amountRemaining / candidateSweetSpot;
            } else {
                candidateSweetSpot = 1;
                streamVolume = amountRemaining;
            }

            if (streamVolume == 0) {
                continue;
            }

            try IUniversalDexInterface(candidate).getQuote(tokenIn, quoteTokenOut, streamVolume) returns (
                uint256 candidateQuoteOut,
                bytes memory candidateQuoteAux
            ) {
                if (candidateQuoteOut == 0) {
                    continue;
                }

                bestFetcher = candidate;
                router = candidateRouter;
                sweetSpot = candidateSweetSpot;
                quotedOut = candidateQuoteOut;
                quoteAux = candidateQuoteAux;
                return (bestFetcher, router, sweetSpot, streamVolume, quotedOut, quoteAux);
            } catch {
                continue;
            }
        }

        revert("No quote-capable DEX found for stream");
    }

    /// @dev Reserve mode: highest `scores[i]` among unvisited; price mode: lowest positive `scores[i]` (ties → lower index).
    function _bestUnvisitedDexIndex(uint256[] memory scores, bool[] memory visited, bool usePriceBased)
        internal
        pure
        returns (bool found, uint256 bestIdx)
    {
        uint256 len = scores.length;
        if (usePriceBased) {
            uint256 bestPrice = type(uint256).max;
            for (uint256 i = 0; i < len; i++) {
                if (visited[i]) continue;
                uint256 p = scores[i];
                if (p == 0) continue;
                if (p < bestPrice) {
                    bestPrice = p;
                    bestIdx = i;
                    found = true;
                }
            }
        } else {
            uint256 bestReserveIn;
            for (uint256 i = 0; i < len; i++) {
                if (visited[i]) continue;
                uint256 r = scores[i];
                if (r > bestReserveIn) {
                    bestReserveIn = r;
                    bestIdx = i;
                    found = true;
                }
            }
        }
    }

    function findBestPriceForTokenPair(
        address tokenIn,
        address tokenOut,
        uint256 volume
    )
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        uint256 bestPrice = type(uint256).max;

        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);

            try fetcher.getPrice(tokenIn, tokenOut, volume) returns (uint256 price) {
                // Only consider non-zero prices
                if (price > 0 && price < bestPrice) {
                    bestPrice = price;
                    bestFetcher = address(fetcher);

                    // Get reserves for sweet spot calculation
                    try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveIn, uint256 reserveOut) {
                        maxReserveIn = reserveIn;
                        maxReserveOut = reserveOut;
                    } catch {
                        // If getReserves fails, we still have the best price
                    }
                }
            } catch {
                // Skip if price fetch fails
            }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev always written in terms of
     *  **the token that is being added to the pool** (tokenIn)
     */
    function findHighestReservesForTokenPair(
        address tokenIn,
        address tokenOut
    )
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);
            try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveTokenIn, uint256 reserveTokenOut) {
                if (reserveTokenIn > maxReserveIn && reserveTokenIn > 0) {
                    maxReserveIn = reserveTokenIn;
                    maxReserveOut = reserveTokenOut;
                    bestFetcher = address(fetcher);
                }
            } catch Error(string memory reason) {
                reason;
            }
            // catch (bytes memory lowLevelData) {
            // }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev Sweet Spot Algorithm v4 - Using constant product formula (x*y=k)
     * Simple iterative approach: double sweet spot until slippage < 10 BPS
     */
    function _sweetSpotAlgo(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        address bestFetcher
    )
        public
        view
        returns (uint256 sweetSpot)
    {
        // Step 1: Read reserves from the DEX
        (uint256 reserveIn, uint256 reserveOut) = IUniversalDexInterface(bestFetcher).getReserves(tokenIn, tokenOut);

        if (reserveIn == 0 || reserveOut == 0) {
            revert("Zero reserves");
            // return 4; // Fallback to minimum sweet spot
        }
        uint256 actualReserveIn = reserveIn;
        uint256 actualReserveOut = reserveOut;
        uint256 actualVolume = volume;

        sweetSpot = 1;

        uint256 effectiveVolume = actualVolume / sweetSpot;
        uint256 slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);

        // @audit for alpha testing purposes, we minimise sweet spot to 4. In production, this  should be removed

        if (slippage <= 10) {
            sweetSpot = DEFAULT_SWEET_SPOT;
            return sweetSpot;
        }

        // iteratively double sweet spot until slippage < 10 BPS
        uint256 lastSweetSpot = sweetSpot;
        uint256 lastSlippage = slippage;

        while (slippage > 10 && sweetSpot < MAXIMUM_SWEET_SPOT) {
            // cap at MAXIMUM_SWEET_SPOT to prevent infinite loops
            lastSweetSpot = sweetSpot;
            lastSlippage = slippage;

            sweetSpot = sweetSpot * 2;
            effectiveVolume = actualVolume / sweetSpot;

            // ensure we don't divide by zero
            if (effectiveVolume == 0) {
                break;
            }

            slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);
        }

        // binary search refinement if we crossed the target threshold
        if (lastSlippage > 10 && slippage <= 10) {
            uint256 low = lastSweetSpot;
            uint256 high = sweetSpot;

            for (uint256 i = 0; i < 5; i++) {
                uint256 mid = (low + high) / 2;
                uint256 midVolume = actualVolume / mid;

                if (midVolume == 0) {
                    break;
                }

                uint256 midSlippage = _calculateSlippage(midVolume, actualReserveIn, actualReserveOut);

                if (midSlippage <= 10) {
                    high = mid;
                    sweetSpot = mid;
                } else {
                    low = mid;
                }
            }
        }

        // @audit for alpha testing purposes, we regulate sweet spot between DEFAULT_SWEET_SPOT and MAXIMUM_SWEET_SPOT.
        // In production, these constraints should be configurable or removed
        if (sweetSpot <= 4) {
            sweetSpot = DEFAULT_SWEET_SPOT;
        }
        if (sweetSpot > MAXIMUM_SWEET_SPOT) {
            sweetSpot = MAXIMUM_SWEET_SPOT;
        }
    }

    /**
     * @dev Calculate slippage using constant product formula (x*y=k) for v4
     */
    function _calculateSlippage(
        uint256 volumeIn,
        uint256 reserveIn,
        uint256 reserveOut
    )
        internal
        pure
        returns (uint256 slippageBps)
    {
        // All values are now actual token amounts (not raw decimals)

        // k = reserveIn * reserveOut
        uint256 k = reserveIn * reserveOut;

        // volumeOut = reserveOut - (k / (reserveIn + volumeIn))
        uint256 denominator = reserveIn + volumeIn;

        if (denominator == 0) {
            return 0; // Return 0 slippage to prevent division by zero
        }

        uint256 volumeOut = reserveOut - (k / denominator);

        // Realized price = volumeOut / volumeIn (actual token amounts)
        // We need to scale for precision in the ratio calculation
        uint256 realizedPrice = volumeOut;
        uint256 realizedPriceBase = volumeIn;

        // Observed price = reserveOut / reserveIn (actual token amounts)
        uint256 observedPrice = reserveOut;
        uint256 observedPriceBase = reserveIn;

        // Calculate slippage: 1 - (realizedPrice / observedPrice)
        // priceRatio = (realizedPrice / realizedPriceBase) / (observedPrice / observedPriceBase)
        // priceRatio = (realizedPrice * observedPriceBase) / (realizedPriceBase * observedPrice)

        if (realizedPriceBase == 0 || observedPrice == 0) {
            return 0; // Return 0 slippage to prevent division by zero
        }

        uint256 priceRatio = (realizedPrice * observedPriceBase * 10_000) / (realizedPriceBase * observedPrice);

        // If priceRatio > 10000, it means we're getting a better price (negative slippage), set to 0
        if (priceRatio > 10_000) {
            slippageBps = 0;
        } else {
            slippageBps = 10_000 - priceRatio; // Slippage in basis points
        }
    }
}
