// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWETH {
    function deposit() external payable;
}

/**
 * @title WrapEthToWethSmokeV109
 * @notice Small ETH->WETH smoke tx for wallet-side wrapping.
 * @dev This validates native wrapping path. ETHSupport path is exercised by ETH_* pairs in PlaceTradeSmokeV109.
 */
contract WrapEthToWethSmokeV109 is Script {
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    uint256 constant AMOUNT_ETH = 0.0015 ether; // ~$5

    function run() external {
        address sender = msg.sender;
        uint256 beforeEth = sender.balance;
        uint256 beforeWeth = IERC20(WETH).balanceOf(sender);

        vm.startBroadcast();
        IWETH(WETH).deposit{value: AMOUNT_ETH}();
        vm.stopBroadcast();

        uint256 afterEth = sender.balance;
        uint256 afterWeth = IERC20(WETH).balanceOf(sender);

        console.log("WrapEthToWethSmokeV109 complete");
        console.log("ETH spent:", beforeEth - afterEth);
        console.log("WETH received:", afterWeth - beforeWeth);
    }
}
