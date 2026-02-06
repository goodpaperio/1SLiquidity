// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Deploys} from "test/shared/Deploys.sol";
import {console} from "forge-std/console.sol";
import {StreamDaemon} from "src/StreamDaemon.sol";

// Test contract that exposes the internal sqrt function
contract StreamDaemonTest is StreamDaemon {
    constructor() StreamDaemon(new address[](0), new address[](0)) {}

    function testSqrt(uint256 y) public view returns (uint256) {
        return sqrt(y);
    }
}

contract SqrtTest is Deploys {
    StreamDaemonTest testContract;

    function setUp() public override {
        super.setUp();
        testContract = new StreamDaemonTest();
    }

    function test_Sqrt_Zero() public {
        uint256 result = testContract.testSqrt(0);
        assertEq(result, 0, "sqrt(0) should return 0");
    }

    function test_Sqrt_One() public {
        uint256 result = testContract.testSqrt(1);
        assertEq(result, 1, "sqrt(1) should return 1");
    }

    function test_Sqrt_Two() public {
        uint256 result = testContract.testSqrt(2);
        assertEq(result, 1, "sqrt(2) should return 1");
    }

    function test_Sqrt_Three() public {
        uint256 result = testContract.testSqrt(3);
        assertEq(result, 1, "sqrt(3) should return 1");
    }

    function test_Sqrt_PerfectSquares() public {
        // Test some perfect squares
        uint256[] memory inputs = new uint256[](5);
        uint256[] memory expected = new uint256[](5);

        inputs[0] = 4;
        expected[0] = 2;
        inputs[1] = 9;
        expected[1] = 3;
        inputs[2] = 16;
        expected[2] = 4;
        inputs[3] = 25;
        expected[3] = 5;
        inputs[4] = 100;
        expected[4] = 10;

        for (uint256 i = 0; i < inputs.length; i++) {
            uint256 result = testContract.testSqrt(inputs[i]);
            assertEq(
                result,
                expected[i],
                string.concat("sqrt(", vm.toString(inputs[i]), ") should return ", vm.toString(expected[i]))
            );
        }
    }

    function test_Sqrt_LargeNumbers() public {
        // Test some large numbers
        uint256[] memory inputs = new uint256[](4);
        uint256[] memory expected = new uint256[](4);

        inputs[0] = 1_000_000;
        expected[0] = 1000;
        inputs[1] = 1_000_000_000;
        expected[1] = 31_622;
        inputs[2] = 1_000_000_000_000;
        expected[2] = 1_000_000;
        inputs[3] = type(uint256).max;
        expected[3] = 2 ** 128 - 1; // sqrt(2^256 - 1) = 2^128 - 1

        for (uint256 i = 0; i < inputs.length; i++) {
            uint256 result = testContract.testSqrt(inputs[i]);
            assertEq(
                result,
                expected[i],
                string.concat("sqrt(", vm.toString(inputs[i]), ") should return ", vm.toString(expected[i]))
            );
        }
    }

    function test_Sqrt_NonPerfectSquares() public {
        // Test some non-perfect squares
        uint256[] memory inputs = new uint256[](4);
        uint256[] memory expected = new uint256[](4);

        inputs[0] = 5;
        expected[0] = 2; // sqrt(5) ≈ 2.236...
        inputs[1] = 7;
        expected[1] = 2; // sqrt(7) ≈ 2.645...
        inputs[2] = 8;
        expected[2] = 2; // sqrt(8) ≈ 2.828...
        inputs[3] = 10;
        expected[3] = 3; // sqrt(10) ≈ 3.162...

        for (uint256 i = 0; i < inputs.length; i++) {
            uint256 result = testContract.testSqrt(inputs[i]);
            assertEq(
                result,
                expected[i],
                string.concat("sqrt(", vm.toString(inputs[i]), ") should return ", vm.toString(expected[i]))
            );
        }
    }

    function test_Sqrt_Accuracy() public {
        // Test that sqrt(x) * sqrt(x) <= x < (sqrt(x) + 1) * (sqrt(x) + 1)
        uint256[] memory inputs = new uint256[](5);
        inputs[0] = 123_456_789;
        inputs[1] = 987_654_321;
        inputs[2] = 1_234_567_890;
        inputs[3] = 9_876_543_210;
        inputs[4] = 12_345_678_901;

        for (uint256 i = 0; i < inputs.length; i++) {
            uint256 sqrtResult = testContract.testSqrt(inputs[i]);
            uint256 lowerBound = sqrtResult * sqrtResult;
            uint256 upperBound = (sqrtResult + 1) * (sqrtResult + 1);

            assertTrue(lowerBound <= inputs[i], "sqrt(x) * sqrt(x) should be <= x");
            assertTrue(inputs[i] < upperBound, "x should be < (sqrt(x) + 1) * (sqrt(x) + 1)");
        }
    }
}
