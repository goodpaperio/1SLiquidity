// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface ICurvePool {
    // Standard Curve pool functions
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);

    // Use uint256 version which is more common in newer Curve pools
    function balances(uint256 i) external view returns (uint256);

    // Pool token addresses
    function coins(uint256 i) external view returns (address);

    // Pool metadata
    function A() external view returns (uint256);
    function fee() external view returns (uint256);
}
