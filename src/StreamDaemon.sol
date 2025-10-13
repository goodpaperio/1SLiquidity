// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import { IUniversalDexInterface } from "./interfaces/IUniversalDexInterface.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // goes to Core.sol
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

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, maxReserveIn, maxReserveOut, effectiveGas);
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

    function _sweetSpotAlgo(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 effectiveGas
    )
        public
        view
        returns (uint256 sweetSpot)
    {
        // ensure no division by 0
        if (reserveIn == 0 || reserveOut == 0 || effectiveGas == 0) {
            revert("No reserves or appropriate gas estimation"); // **revert** if no reserves
        }

        uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
        uint8 decimalsOut = IERC20Metadata(tokenOut).decimals();

        // scale tokens to decimal zero
        uint256 scaledVolume = (volume * 1e16) / (10 ** decimalsIn);
        uint256 scaledReserveIn = (reserveIn * 1e16) / (10 ** decimalsIn);
        uint256 scaledReserveOut = (reserveOut * 1e16) / (10 ** decimalsOut);

        sweetSpot = _sweetSpotAlgo_v1(scaledVolume, scaledReserveIn, scaledReserveOut);

        if (scaledReserveIn > scaledReserveOut && sweetSpot > 500) {
            sweetSpot = _sweetSpotAlgo_v2(scaledVolume, scaledReserveIn);
        }

        // here we are going to add a conditional
        // which evaluates if a trade volume is < 0.01% of the pool depth
        // if so, we should set sweetSpot to 1
        // commenting out for now to test the protocol for small trades

        // if (scaledVolume < scaledReserveIn * 100 / 1000000) {
        //     sweetSpot = 1;
        // }

        if (sweetSpot == 0) {
            sweetSpot = 4;
        } else if (sweetSpot < 4) {
            sweetSpot = 4;
        }
        if (sweetSpot > 500) {
            sweetSpot = 500;
        }
        // @audit need to add a case for volume < 0.001 pool depth whereby sweetspot = 1
    }

    function _sweetSpotAlgo_v1(
        uint256 scaledVolume,
        uint256 scaledReserveIn,
        uint256 scaledReserveOut
    )
        public
        pure
        returns (uint256 sweetSpot)
    {
        uint256 alpha = computeAlpha(scaledReserveIn, scaledReserveOut);
        sweetSpot = sqrt((alpha * scaledVolume * scaledVolume) / 1e48);
    }

    function _sweetSpotAlgo_v2(uint256 scaledVolume, uint256 scaledReserveIn) public pure returns (uint256 sweetSpot) {
        sweetSpot = (scaledVolume) / sqrt(scaledReserveIn) / 1e8;
    }
}
