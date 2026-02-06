// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IUniversalDexInterface} from "src/interfaces/IUniversalDexInterface.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract AMockFetcher is IUniversalDexInterface {
    uint256 public reserveA;
    uint256 public reserveB;

    function setReserves(uint256 _reserveA, uint256 _reserveB) external {
        reserveA = _reserveA;
        reserveB = _reserveB;
    }

    function getReserves(address, address) external view override returns (uint256, uint256) {
        return (reserveA, reserveB);
    }

    function getPoolAddress(address, address) external pure override returns (address) {
        return address(0);
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external pure override returns (uint256) {
        // Return a mock price - simple 1:1 ratio for testing
        return amountIn;
    }

    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        pure
        override
        returns (uint256 amountOut, bytes memory aux)
    {
        // Mirror getPrice for simplicity in tests
        amountOut = amountIn;
        aux = "";
    }
}

contract MockFetcher1 is AMockFetcher {
    function getDexType() external pure override returns (string memory) {
        return "Mock2";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V1";
    }
}

contract MockFetcher2 is AMockFetcher {
    function getDexType() external pure override returns (string memory) {
        return "Mock2";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }
}
