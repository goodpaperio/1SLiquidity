// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Utils.sol";

interface ICore {
    function placeTrade(bytes calldata tradeData) external payable;
    function executeTrades(bytes32 pairId) external;
    function instasettle(uint256 tradeId) external payable;
    function getPairIdTradeIds(bytes32 pairId) external view returns (uint256[] memory);
    function trades(uint256 tradeId) external view returns (Utils.Trade memory);
}
