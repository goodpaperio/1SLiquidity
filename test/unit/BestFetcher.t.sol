// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {Deploys} from "test/shared/Deploys.sol";
import {console} from "forge-std/console.sol";
import {MockFetcher1, MockFetcher2} from "test/mock/MockFetcher.sol";
import {MockERC20} from "test/mock/MockERC20.sol";
import {StreamDaemon} from "src/StreamDaemon.sol";

contract BestFetcherTest is Deploys {
    MockFetcher1 dex1;
    MockFetcher2 dex2;
    MockERC20 tokenIn;
    MockERC20 tokenOut;

    function setUp() public override {
        super.setUp();

        // Deploy mock tokens
        tokenIn = new MockERC20("Token In", "TKI", 18);
        tokenOut = new MockERC20("Token Out", "TKO", 6);

        // Deploy mock DEXs
        dex1 = new MockFetcher1();
        dex2 = new MockFetcher2();

        // Register DEXs with StreamDaemon
        address[] memory dexs = new address[](2);
        address[] memory routers = new address[](2);
        dexs[0] = address(dex1);
        dexs[1] = address(dex2);
        routers[0] = address(1);
        routers[1] = address(2);

        // Deploy new StreamDaemon with our mock DEXs
        streamDaemon = new StreamDaemon(dexs, routers);
    }

    function test_FindHighestReserves_NormalCase() public {
        // Set up reserves for each DEX
        dex1.setReserves(1000 * 10 ** 18, 1000 * 10 ** 6);
        dex2.setReserves(2000 * 10 ** 18, 2000 * 10 ** 6);

        // Find highest reserves
        (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            streamDaemon.findHighestReservesForTokenPair(address(tokenIn), address(tokenOut));

        // Verify results
        assertEq(bestFetcher, address(dex2), "DEX2 should have highest reserves");
        assertEq(maxReserveIn, 2000 * 10 ** 18, "Incorrect maxReserveIn");
        assertEq(maxReserveOut, 2000 * 10 ** 6, "Incorrect maxReserveOut");
    }

    function test_FindHighestReserves_ZeroReserves() public {
        // Set up reserves where one DEX has zero reserves
        dex1.setReserves(0, 0);
        dex2.setReserves(2000 * 10 ** 18, 2000 * 10 ** 6);

        // Find highest reserves
        (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            streamDaemon.findHighestReservesForTokenPair(address(tokenIn), address(tokenOut));

        // Verify results - should ignore DEX1's zero reserves
        assertEq(bestFetcher, address(dex2), "DEX2 should have highest reserves");
        assertEq(maxReserveIn, 2000 * 10 ** 18, "Incorrect maxReserveIn");
        assertEq(maxReserveOut, 2000 * 10 ** 6, "Incorrect maxReserveOut");
    }

    function test_FindHighestReserves_AllZeroReserves() public {
        // Set all DEXs to have zero reserves
        dex1.setReserves(0, 0);
        dex2.setReserves(0, 0);

        // Should revert when no DEX has reserves
        vm.expectRevert("No DEX found for token pair");
        streamDaemon.findHighestReservesForTokenPair(address(tokenIn), address(tokenOut));
    }

    function test_FindHighestReserves_DexReverts() public {
        // Set up reserves
        dex1.setReserves(1000 * 10 ** 18, 1000 * 10 ** 6);
        dex2.setReserves(0, 0); // Make DEX2 revert

        // Find highest reserves - should skip DEX2 and use DEX3
        (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            streamDaemon.findHighestReservesForTokenPair(address(tokenIn), address(tokenOut));

        // Verify results
        assertEq(bestFetcher, address(dex1), "DEX1 should have highest reserves after DEX2 revert");
        assertEq(maxReserveIn, 1000 * 10 ** 18, "Incorrect maxReserveIn");
        assertEq(maxReserveOut, 1000 * 10 ** 6, "Incorrect maxReserveOut");
    }

    function test_FindHighestReserves_AllDexsRevert() public {
        // Make all DEXs revert
        dex1.setReserves(0, 0);
        dex2.setReserves(0, 0);

        // Should revert when all DEXs revert
        vm.expectRevert("No DEX found for token pair");
        streamDaemon.findHighestReservesForTokenPair(address(tokenIn), address(tokenOut));
    }

    function test_FindHighestReserves_OppositeDirection() public {
        // Test reserves in opposite direction (tokenOut -> tokenIn)
        // Reserve format is (tokenOut, tokenIn) so first value is for tokenOut (6 decimals)
        // and second value is for tokenIn (18 decimals)
        dex1.setReserves(1000 * 10 ** 6, 1000 * 10 ** 18);
        dex2.setReserves(2000 * 10 ** 6, 2000 * 10 ** 18);

        // Find highest reserves - calling with (tokenOut, tokenIn)
        // expects reserves in that order (tokenOut decimals, then tokenIn decimals)
        (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
            streamDaemon.findHighestReservesForTokenPair(address(tokenOut), address(tokenIn));

        // Should still find the highest reserves in the correct direction
        assertEq(bestFetcher, address(dex2), "DEX2 should have highest reserves");
        assertEq(maxReserveIn, 2000 * 10 ** 6, "Incorrect maxReserveIn"); // tokenOut has 6 decimals
        assertEq(maxReserveOut, 2000 * 10 ** 18, "Incorrect maxReserveOut"); // tokenIn has 18 decimals
    }
}
