// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IUniversalDexInterface.sol";

interface IUniswapV3Fetcher is IUniversalDexInterface {
    function fee() external view returns (uint24);
}
