// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Executor.sol";

contract ExecutorTest is Test {
    Executor executor;

    function setUp() public {
        executor = new Executor();
    }
}
