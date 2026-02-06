// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";
import "../interfaces/dex/ICurvePool.sol";

contract CurveFetcher is IUniversalDexInterface {
    address public pool;

    // Token to index mapping - we'll need to determine this dynamically
    mapping(address => int128) public tokenToIndex;

    constructor(address _pool) {
        pool = _pool;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        // For Curve, we need to determine which token is at which index
        // This is a simplified approach - in production you'd want to query the pool's token list
        int128 indexA = _getTokenIndex(tokenA);
        int128 indexB = _getTokenIndex(tokenB);

        if (indexA >= 0 && indexB >= 0) {
            return (_getBalance(indexA), _getBalance(indexB));
        }

        // Fallback to hardcoded indices if mapping fails
        return (_getBalance(0), _getBalance(1));
    }

    function getPoolAddress(address tokenIn, address tokenOut) external view override returns (address) {
        return pool;
    }

    function getDexType() external pure override returns (string memory) {
        return "Curve";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }

    function _getBalance(int128 index) internal view returns (uint256) {
        // Convert int128 to uint256 for the interface
        if (index < 0) return 0;

        try ICurvePool(pool).balances(uint256(int256(index))) returns (uint256 balance) {
            return balance;
        } catch {
            return 0; // Return 0 if we can't get the balance
        }
    }

    function _getTokenIndex(address token) internal view returns (int128) {
        // This is a simplified approach - in reality you'd query the pool's token list
        // For now, we'll use a basic mapping approach
        if (tokenToIndex[token] != 0) {
            return tokenToIndex[token];
        }

        // Try to determine index by checking coins
        // For Curve 3Pool: index 0 = DAI, index 1 = USDC, index 2 = USDT
        try ICurvePool(pool).coins(0) returns (address token0) {
            if (token == token0) return 0;

            try ICurvePool(pool).coins(1) returns (address token1) {
                if (token == token1) return 1;

                try ICurvePool(pool).coins(2) returns (address token2) {
                    if (token == token2) return 2;
                } catch {
                    // Pool might only have 2 tokens
                }
            } catch {
                // Pool might only have 1 token
            }
        } catch {
            // Can't query coins, fallback to simple logic
            if (token == 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) return 1; // USDC
            if (token == 0xdAC17F958D2ee523a2206206994597C13D831ec7) return 2; // USDT
            if (token == 0x6B175474E89094C44Da98b954EedeAC495271d0F) return 0; // DAI
            return 0; // Default to index 0
        }

        return -1; // Token not found
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view override returns (uint256) {
        // For Curve, calculate price based on reserves
        (uint256 reserveIn, uint256 reserveOut) = this.getReserves(tokenIn, tokenOut);

        if (reserveIn == 0 || reserveOut == 0) {
            return 0;
        }

        // Simple price calculation based on reserves ratio
        // This is a simplified version - Curve has more complex pricing
        return (amountIn * reserveOut) / reserveIn;
    }

    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        override
        returns (uint256 amountOut, bytes memory aux)
    {
        amountOut = this.getPrice(tokenIn, tokenOut, amountIn);
        aux = ""; // no auxiliary data for Curve legacy fetcher
    }
}
