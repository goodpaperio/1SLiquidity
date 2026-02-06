// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract UniswapV2Fetcher is IUniversalDexInterface {
    address public factory;

    constructor(address _factory) {
        factory = _factory;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);

        // @audit revert or throw error
        require(pair != address(0), "Pair does not exist");
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();

        if (tokenA == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }

    function getPoolAddress(address tokenIn, address tokenOut) external view override returns (address) {
        return IUniswapV2Factory(factory).getPair(tokenIn, tokenOut);
    }

    function getDexType() external pure override returns (string memory) {
        return "UniswapV2";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view override returns (uint256) {
        // For UniswapV2, calculate price based on reserves
        (uint256 reserveIn, uint256 reserveOut) = this.getReserves(tokenIn, tokenOut);

        if (reserveIn == 0 || reserveOut == 0) {
            return 0;
        }

        // Calculate output amount using constant product formula
        // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;

        return numerator / denominator;
    }

    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        override
        returns (uint256 amountOut, bytes memory aux)
    {
        (uint256 reserveIn, uint256 reserveOut) = this.getReserves(tokenIn, tokenOut);
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) {
            return (0, "");
        }
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
        aux = ""; // No auxiliary data for v2-style pools
    }
}
