// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {console} from "forge-std/console.sol";
import {Deploys} from "test/shared/Deploys.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {MockERC20} from "test/mock/MockERC20.sol";
import {AMockFetcher} from "test/mock/MockFetcher.sol";

contract SweetSpotAlgoTest is Deploys {
    MockERC20 tokenIn;
    MockERC20 tokenOut;
    AMockFetcher mockFetcher;

    function setUp() public override {
        super.setUp();

        console.log("executor", address(executor));
        console.log("streamDaemon", address(streamDaemon));
        console.log("registry", address(registry));
        console.log("core", address(core));

        // Deploy mock tokens with different decimals
        tokenIn = new MockERC20("Token In", "TKI", 18);
        tokenOut = new MockERC20("Token Out", "TKO", 8);
        
        // Get the first mock fetcher from the deployed DEXes
        mockFetcher = AMockFetcher(dexes[0]);
    }

    function test_SweetSpotAlgo_NormalCase() public {
        // Setup: 1M tokens in reserves, 100k volume
        uint256 reserveIn = 5_000_000 * 10 ** 18;
        uint256 reserveOut = 500_000 * 10 ** 8;
        uint256 volume = 400_000 * 10 ** 18; // 100k tokens
        
        // Set reserves on the mock fetcher
        mockFetcher.setReserves(reserveIn, reserveOut);

        uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), volume, address(mockFetcher)
        );

        // Sweet spot should be between 4 and 500
        assertTrue(sweetSpot >= 4 && sweetSpot <= 500, "Sweet spot out of bounds");
    }

    // function skip_test_SweetSpotAlgo_MinimumSweetSpot() public {
    //     // Setup: Very small reserves and volume to test minimum sweet spot
    //     uint256 reserveIn = 100 * 10 ** 18; // 100 tokens
    //     uint256 reserveOut = 100 * 10 ** 18; // 100 tokens
    //     uint256 volume = 1 * 10 ** 18; // 1 token
    //     
    //     // Set reserves on the mock fetcher
    //     mockFetcher.setReserves(reserveIn, reserveOut);

    //     uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
    //         address(tokenIn), address(tokenOut), volume, address(mockFetcher)
    //     );

    //     assertEq(sweetSpot, 4, "Should return minimum sweet spot of 4");
    // }

    // function skip_test_SweetSpotAlgo_MaximumSweetSpot() public {
    //     // Setup: Very large reserves and volume to test maximum sweet spot
    //     uint256 reserveIn = 1_000_000_000 * 10 ** 18; // 1B tokens
    //     uint256 reserveOut = 1_000_000_000 * 10 ** 18; // 1B tokens
    //     uint256 volume = 1_000_000 * 10 ** 18; // 1M tokens
    //     
    //     // Set reserves on the mock fetcher
    //     mockFetcher.setReserves(reserveIn, reserveOut);

    //     uint256 sweetSpot = streamDaemon._sweetSpotAlgo(
    //         address(tokenIn), address(tokenOut), volume, address(mockFetcher)
    //     );

    //     assertEq(sweetSpot, 500, "Should return maximum sweet spot of 500");
    // }

    function test_SweetSpotAlgo_ZeroReserves() public {
        uint256 volume = 100_000 * 10 ** 18;
        
        // Set zero reserves on the mock fetcher
        mockFetcher.setReserves(0, 0);

        // Should revert with "Zero reserves"
        vm.expectRevert("Zero reserves");
        streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), volume, address(mockFetcher)
        );
    }

    function test_SweetSpotAlgo_ZeroReserveIn() public {
        uint256 volume = 100_000 * 10 ** 18;
        
        // Set zero reserveIn on the mock fetcher
        mockFetcher.setReserves(0, 1_000_000 * 10 ** 8);

        // Should revert with "Zero reserves"
        vm.expectRevert("Zero reserves");
        streamDaemon._sweetSpotAlgo(
            address(tokenIn), address(tokenOut), volume, address(mockFetcher)
        );
    }
}
