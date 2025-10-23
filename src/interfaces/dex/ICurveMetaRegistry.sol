// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICurveMetaRegistry
 * @dev Interface for Curve's MetaRegistry contract
 * @notice Mainnet address: 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC
 */
interface ICurveMetaRegistry {
    // Pool discovery
    function find_pools_for_coins(address from, address to) external view returns (address[] memory);
    function find_pool_for_coins(address from, address to, uint256 i) external view returns (address);

    // Translate addresses to pool indices; returns (i, j, isUnderlying)
    function get_coin_indices(address pool, address from, address to) external view
        returns (int128, int128, bool);

    // Balances (wrapped vs underlying)
    function get_balances(address pool) external view returns (uint256[8] memory);
    function get_underlying_balances(address pool) external view returns (uint256[8] memory);
}
