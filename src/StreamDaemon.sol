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

    // function _sweetSpotAlgo(
    //     address tokenIn,
    //     address tokenOut,
    //     uint256 volume,
    //     uint256 reserveIn,
    //     uint256 reserveOut,
    //     uint256 effectiveGas
    // ) public view returns (uint256 sweetSpot) {
    //     // ensure no division by 0
    //     if (reserveIn == 0 || reserveOut == 0 || effectiveGas == 0) {
    //         revert("No reserves or appropriate gas estimation"); // **revert** if no reserves
    //     }

    //     uint8 decimalsIn = IERC20Metadata(tokenIn).decimals();
    //     uint8 decimalsOut = IERC20Metadata(tokenOut).decimals();

    //     // scale tokens to decimal zero
    //     uint256 scaledVolume = (volume * 1e16) / (10 ** decimalsIn);
    //     uint256 scaledReserveIn = (reserveIn * 1e16) / (10 ** decimalsIn);
    //     uint256 scaledReserveOut = (reserveOut * 1e16) / (10 ** decimalsOut);

    //     sweetSpot = _sweetSpotAlgo_v1(scaledVolume, scaledReserveIn, scaledReserveOut);

    //     if (scaledReserveIn > scaledReserveOut && sweetSpot > 500) {
    //         sweetSpot = _sweetSpotAlgo_v2(scaledVolume, scaledReserveIn);
    //     }

    //     // here we are going to add a conditional
    //     // which evaluates if a trade volume is < 0.01% of the pool depth
    //     // if so, we should set sweetSpot to 1
    //     // commenting out for now to test the protocol for small trades

    //     // if (scaledVolume < scaledReserveIn * 100 / 1000000) {
    //     //     sweetSpot = 1;
    //     // }

    //     if (sweetSpot == 0) {
    //         sweetSpot = 4;
    //     } else if (sweetSpot < 4) {
    //         sweetSpot = 4;
    //     }
    //     if (sweetSpot > 500) {
    //         sweetSpot = 500;
    //     }
    //     // @audit need to add a case for volume < 0.001 pool depth whereby sweetspot = 1
    // }

    // function _sweetSpotAlgo_v1(uint256 scaledVolume, uint256 scaledReserveIn, uint256 scaledReserveOut)
    //     public
    //     pure
    //     returns (uint256 sweetSpot)
    // {
    //     uint256 alpha = computeAlpha(scaledReserveIn, scaledReserveOut);
    //     sweetSpot = sqrt((alpha * scaledVolume * scaledVolume) / 1e48);
    // }

    // function _sweetSpotAlgo_v2(uint256 scaledVolume, uint256 scaledReserveIn) public pure returns (uint256 sweetSpot)
    // {
    //     sweetSpot = (scaledVolume) / sqrt(scaledReserveIn) / 1e8;
    // }

    // /**
    //  * @dev SweetSpotAlgo v3 with polynomial interpolation for slippage-based volume optimization
    //  * Uses mathematical interpolation to find optimal volume with 1% slippage instead of brute force halving
    //  */
    // function _sweetSpotAlgo_v3(
    //     address tokenIn,
    //     address tokenOut,
    //     uint256 volume,
    //     address bestFetcher
    // ) public returns (uint256 sweetSpot) {
    //     // Step 1: Get observed price from reserves
    //     uint256 observedPrice = _calculateObservedPrice(tokenIn, tokenOut, bestFetcher);

    //     if (observedPrice == 0) {
    //         return 1; // Fallback to minimum sweet spot
    //     }

    //     // Step 2: Sample slippage at two strategic points
    //     uint256 volume1 = volume; // Full volume
    //     uint256 volume2 = volume / 4; // Quarter volume

    //     uint256 predictedPrice1 = _calculatePredictedPrice(tokenIn, tokenOut, volume1, bestFetcher);
    //     uint256 predictedPrice2 = _calculatePredictedPrice(tokenIn, tokenOut, volume2, bestFetcher);
    //     uint256 slippage1 = _calculateSlippage(observedPrice, predictedPrice1);
    //     uint256 slippage2 = _calculateSlippage(observedPrice, predictedPrice2);

    //     // Step 3: Interpolate to find volume where slippage = 100 bps (1%)
    //     uint256 targetSlippage = 100; // 1% in basis points
    //     uint256 optimalVolume = _interpolateOptimalVolume(volume1, volume2, slippage1, slippage2, targetSlippage);

    //     // Step 4: Verify the interpolation with actual quote
    //     uint256 actualSlippage = _calculateSlippage(observedPrice, _calculatePredictedPrice(tokenIn, tokenOut,
    // optimalVolume, bestFetcher));

    //     // Step 5: If interpolation is off, do one refinement
    //     if (actualSlippage > targetSlippage * 110 / 100) { // 10% tolerance
    //         optimalVolume = _refineVolume(optimalVolume, actualSlippage, targetSlippage, tokenIn, tokenOut,
    // bestFetcher, observedPrice);
    //     }

    //     // Step 6: Calculate sweet spot based on volume reduction
    //     sweetSpot = _calculateSweetSpotFromVolume(optimalVolume, volume);

    //     // Debug logging
    //     console.log("DEBUG: Original volume:", volume);
    //     console.log("DEBUG: Optimal volume:", optimalVolume);
    //     console.log("DEBUG: Volume ratio:", (volume * 1e18) / optimalVolume);
    //     console.log("DEBUG: Observed Price:", observedPrice);
    //     console.log("DEBUG: Predicted Price1:", predictedPrice1);
    //     console.log("DEBUG: Predicted Price2:", predictedPrice2);
    //     console.log("DEBUG: Slippage1:", slippage1);
    //     console.log("DEBUG: Slippage2:", slippage2);
    //     console.log("DEBUG: Actual slippage:", actualSlippage);
    //     console.log("DEBUG: Sweet spot:", sweetSpot);

    //     return sweetSpot;
    // }

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
            return 4; // Fallback to minimum sweet spot
        }
        uint256 actualReserveIn = reserveIn;
        uint256 actualReserveOut = reserveOut;
        uint256 actualVolume = volume;

        sweetSpot = 1;

        uint256 effectiveVolume = actualVolume / sweetSpot;
        uint256 slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);

        // @audit for alpha testing purposes, we minimise sweet spot to 4. In production, this  should be removed

        if (slippage <= 10) {
            return 4;
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

    // /**
    //  * @dev Interpolate optimal volume using logarithmic interpolation
    //  * Assumes slippage ~ volume^n relationship
    //  */
    // function _interpolateOptimalVolume(
    //     uint256 volume1,
    //     uint256 volume2,
    //     uint256 slippage1,
    //     uint256 slippage2,
    //     uint256 targetSlippage
    // ) internal pure returns (uint256) {

    //     if (slippage1 == slippage2) {
    //         return volume2; // No interpolation needed
    //     }

    //     // Always try to find the optimal volume, even if current slippage is acceptable
    //     // This ensures we find the maximum volume that stays within the target slippage

    //     if (slippage2 >= targetSlippage) {
    //         return volume2; // Even quarter volume is too high
    //     }

    //     // Logarithmic interpolation
    //     // Using fixed-point arithmetic for precision
    //     uint256 logV1 = _log2(volume1);
    //     uint256 logV2 = _log2(volume2);
    //     uint256 logS1 = _log2(slippage1);
    //     uint256 logS2 = _log2(slippage2);
    //     uint256 logTarget = _log2(targetSlippage);

    //     // Linear interpolation in log space
    //     // logV_target = logV1 + (logV2 - logV1) * (logTarget - logS1) / (logS2 - logS1)
    //     uint256 logVTarget;
    //     if (logS2 > logS1) {
    //         logVTarget = logV1 + ((logV2 - logV1) * (logTarget - logS1)) / (logS2 - logS1);
    //     } else {
    //         // If slippage values are too close, use simple linear interpolation
    //         logVTarget = logV1 + (logV2 - logV1) / 2;
    //     }

    //     return _exp2(logVTarget);
    // }

    // /**
    //  * @dev Refine volume using binary search if interpolation is inaccurate
    //  */
    // function _refineVolume(
    //     uint256 currentVolume,
    //     uint256 /* currentSlippage */,
    //     uint256 targetSlippage,
    //     address tokenIn,
    //     address tokenOut,
    //     address bestFetcher,
    //     uint256 observedPrice
    // ) internal returns (uint256) {

    //     // Simple binary search refinement
    //     uint256 low = currentVolume / 2;
    //     uint256 high = currentVolume;
    //     uint256 mid;

    //     for (uint256 i = 0; i < 5; i++) { // Max 5 iterations
    //         mid = (low + high) / 2;
    //         uint256 midSlippage = _calculateSlippage(observedPrice, _calculatePredictedPrice(tokenIn, tokenOut, mid,
    // bestFetcher));

    //         if (midSlippage > targetSlippage) {
    //             high = mid;
    //         } else {
    //             low = mid;
    //         }

    //         if (high - low <= high / 100) break; // 1% precision
    //     }

    //     return mid;
    // }

    // /**
    //  * @dev Calculate sweet spot based on volume reduction factor
    //  */
    // function _calculateSweetSpotFromVolume(
    //     uint256 optimizedVolume,
    //     uint256 originalVolume
    // ) internal pure returns (uint256) {
    //     if (originalVolume == 0) return 1;

    //     // Calculate sweet spot based on volume reduction
    //     // If volume was reduced by factor N, sweet spot should be approximately N
    //     uint256 volumeRatio = (originalVolume * 1e18) / optimizedVolume;

    //     // For debugging: return the actual ratio as sweet spot to see what's happening
    //     // This will help us understand the actual volume reduction
    //     if (volumeRatio <= 1e18) return 1; // No reduction
    //     if (volumeRatio <= 2e18) return 2; // Halved
    //     if (volumeRatio <= 4e18) return 4; // Quartered
    //     if (volumeRatio <= 8e18) return 8; // 1/8th
    //     if (volumeRatio <= 16e18) return 16; // 1/16th
    //     if (volumeRatio <= 32e18) return 32; // 1/32nd
    //     if (volumeRatio <= 64e18) return 64; // 1/64th
    //     if (volumeRatio <= 128e18) return 128; // 1/128th
    //     if (volumeRatio <= 256e18) return 256; // 1/256th
    //     if (volumeRatio <= 512e18) return 512; // 1/512th

    //     return 500; // Maximum sweet spot
    // }

    // /**
    //  * @dev Calculate log2 using bit manipulation for efficiency
    //  */
    // function _log2(uint256 x) internal pure returns (uint256) {
    //     if (x == 0) return 0;

    //     uint256 result = 0;
    //     if (x >= 0x100000000000000000000000000000000) {
    //         x >>= 128;
    //         result += 128;
    //     }
    //     if (x >= 0x10000000000000000) {
    //         x >>= 64;
    //         result += 64;
    //     }
    //     if (x >= 0x100000000000000) {
    //         x >>= 32;
    //         result += 32;
    //     }
    //     if (x >= 0x1000000000000) {
    //         x >>= 16;
    //         result += 16;
    //     }
    //     if (x >= 0x10000000000) {
    //         x >>= 8;
    //         result += 8;
    //     }
    //     if (x >= 0x100000000) {
    //         x >>= 4;
    //         result += 4;
    //     }
    //     if (x >= 0x1000000) {
    //         x >>= 2;
    //         result += 2;
    //     }
    //     if (x >= 0x10000) {
    //         x >>= 1;
    //         result += 1;
    //     }

    //     return result;
    // }

    // /**
    //  * @dev Calculate 2^x using bit manipulation
    //  */
    // function _exp2(uint256 x) internal pure returns (uint256) {
    //     if (x == 0) return 1;
    //     if (x >= 256) return type(uint256).max; // Prevent overflow

    //     uint256 result = 1;
    //     uint256 base = 2;

    //     while (x > 0) {
    //         if (x & 1 == 1) {
    //             result = result * base;
    //         }
    //         base = base * base;
    //         x >>= 1;
    //     }

    //     return result;
    // }

    // /**
    //  * @dev Interpolate optimal volume using logarithmic interpolation for v4
    //  */
    // function _interpolateOptimalVolumeV4(
    //     uint256 volume1,
    //     uint256 volume2,
    //     uint256 slippage1,
    //     uint256 slippage2,
    //     uint256 targetSlippage
    // ) internal pure returns (uint256) {

    //     if (slippage1 == slippage2) {
    //         return volume2; // No interpolation needed
    //     }

    //     if (slippage2 >= targetSlippage) {
    //         return volume2; // Even quarter volume is too high
    //     }

    //     // Logarithmic interpolation
    //     // Using fixed-point arithmetic for precision
    //     uint256 logV1 = _log2(volume1);
    //     uint256 logV2 = _log2(volume2);
    //     uint256 logS1 = _log2(slippage1);
    //     uint256 logS2 = _log2(slippage2);
    //     uint256 logTarget = _log2(targetSlippage);

    //     // Linear interpolation in log space
    //     // logV_target = logV1 + (logV2 - logV1) * (logTarget - logS1) / (logS2 - logS1)
    //     uint256 logVTarget;
    //     if (logS2 > logS1) {
    //         logVTarget = logV1 + ((logV2 - logV1) * (logTarget - logS1)) / (logS2 - logS1);
    //     } else {
    //         // If slippage values are too close, use simple linear interpolation
    //         logVTarget = logV1 + (logV2 - logV1) / 2;
    //     }

    //     return _exp2(logVTarget);
    // }

    // /**
    //  * @dev Refine volume using binary search for v4
    //  */
    // function _refineVolumeV4(
    //     uint256 currentVolume,
    //     uint256 currentSlippage,
    //     uint256 targetSlippage,
    //     uint256 reserveIn,
    //     uint256 reserveOut
    // ) internal pure returns (uint256) {

    //     // Binary search refinement - search between quarter volume and current volume
    //     uint256 low = currentVolume / 4;  // Start from quarter volume
    //     uint256 high = currentVolume;     // End at current volume
    //     uint256 mid;

    //     for (uint256 i = 0; i < 8; i++) { // More iterations for better precision
    //         mid = (low + high) / 2;
    //         uint256 midSlippage = _calculateSlippageV4(mid, reserveIn, reserveOut);

    //         if (midSlippage > targetSlippage) {
    //             high = mid; // Reduce volume
    //         } else {
    //             low = mid;  // Increase volume
    //         }

    //         if (high - low <= high / 1000) break; // 0.1% precision
    //     }

    //     return mid;
    // }
}
