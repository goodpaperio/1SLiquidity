// write a contract here which is an interface alllowing the interfaced call of ETHSupport
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IETHSupport {
    function placeTradeWithETH(address tokenOut, uint256 amountOutMin, bool isInstasettlable, bool usePriceBased) external payable returns (uint256);
    function placeTradeWithETHCustom(bytes calldata tradeData) external payable returns (uint256);
    function emergencyWithdrawETH() external;
    function emergencyWithdrawWETH() external;
    function emergencyWithdrawToken(address token) external;
    function getWETHBalance() external view returns (uint256);
    function getETHBalance() external view returns (uint256);
    function unwrap(uint256 amount, address destination) external;
    function unwrapAndRoute(address token, address to, bytes calldata data) external;
}