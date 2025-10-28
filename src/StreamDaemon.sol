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

    // temporarily efine a constant for minimum effective gas in dollars
    uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against
        // TOKEN-USDC value during execution in production

    constructor(address[] memory _dexs, address[] memory _routers) Ownable(msg.sender) {
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
        for (uint256 i = 0; i < _routers.length; i++) {
            dexToRouters[_dexs[i]] = _routers[i];
        } // @audit make sure to pass the routers in the appropriate order wrt how the dex's are inputted on deployment
    }

    function computeAlpha(uint256 scaledReserveIn, uint256 scaledReserveOut) internal pure returns (uint256 alpha) {
        // alpha = reserveOut / (reserveIn^2)
        require(scaledReserveIn > 0, "Invalid reserve");
        require(scaledReserveOut > 0, "Invalid reserve");

        if (scaledReserveIn >= scaledReserveOut) {
            alpha = (scaledReserveIn * 1e32) / (scaledReserveOut * scaledReserveOut);
        } else {
            alpha = (scaledReserveOut * 1e32) / (scaledReserveIn * scaledReserveIn);
        }
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
        dexs.push(_fetcher); // @audit this storage allocation has multiple dependancies in order to actually function,
            // including deployments of appropriate fetchers and configuration of the relevant dex's interface
        emit DEXRouteAdded(_fetcher);
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
        if (tokenOut == 0x0000000000000000000000000000000000000000 || tokenOut == 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) {
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

        // Ensure effective gas is at least the minimum
        if (effectiveGas < MIN_EFFECTIVE_GAS_DOLLARS) {
            effectiveGas = MIN_EFFECTIVE_GAS_DOLLARS;
        }

        // Use sweetSpotAlgo_v3 for slippage-based optimization
        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, bestFetcher);
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
            sweetSpot = 4;
            return sweetSpot;
        }

        // iteratively double sweet spot until slippage < 10 BPS
        uint256 lastSweetSpot = sweetSpot;
        uint256 lastSlippage = slippage;

        while (slippage > 10 && sweetSpot < 1000) {
            // cap at 1000 to prevent infinite loops
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

        // @audit for alpha testing purposes, we regulate sweet spot between 4 and 500. In production, this  should be
        // removed
        if (sweetSpot <= 4) {
            sweetSpot = 4;
        }
        if (sweetSpot > 500) {
            sweetSpot = 500;
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
