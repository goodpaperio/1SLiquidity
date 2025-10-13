// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";
import { Deploys } from "test/shared/Deploys.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Common logic needed by all fork tests.
abstract contract Fork_Test is Deploys {
    function setUp() public virtual override {
        vm.createSelectFork({ blockNumber: 23_512_534, urlOrAlias: "mainnet" });
        super.setUp();
    }

    function getTokenDecimals(address token) public view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    function formatTokenAmount(address token, uint256 amount) public view returns (uint256) {
        return amount * (10 ** getTokenDecimals(token));
    }

    function getTokenBalance(address token, address account) public view returns (uint256) {
        return IERC20(token).balanceOf(account);
    }
}
