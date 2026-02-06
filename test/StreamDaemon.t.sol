// // SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// import {Test, console} from "forge-std/Test.sol";
// import {StreamDaemon} from "../src/StreamDaemon.sol";
// import {IUniversalDexInterface} from "../src/interfaces/IUniversalDexInterface.sol";

// // Mock DEX interface for testing
// contract MockUniversalDexInterface is IUniversalDexInterface {
//     mapping(address => mapping(address => uint256)) private mockReserves;

//     function setMockReserves(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB) external {
//         mockReserves[tokenA][tokenB] = reserveA;
//         mockReserves[tokenB][tokenA] = reserveB;
//     }

//     function getPoolAddress(address tokenIn, address tokenOut) external pure returns (address pool) {
//         return address(0);
//     }

//     function getDexType() external pure returns (string memory) {
//         return "Mock";
//     }

//     function getDexVersion() external pure returns (string memory) {
//         return "1.0.0";
//     }

//     function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
//         return (mockReserves[tokenA][tokenB], mockReserves[tokenB][tokenA]);
//     }
// }

// contract StreamDaemonTest is Test {
//     StreamDaemon public streamDaemon;
//     MockUniversalDexInterface public mockDex;

//     address public constant TOKEN_A = address(0x1);
//     address public constant TOKEN_B = address(0x2);

//     function setUp() public {
//         // Create mock DEX
//         mockDex = new MockUniversalDexInterface();

//         // Setup dex addresses array
//         address[] memory dexAddresses = new address[](1);
//         dexAddresses[0] = address(mockDex);

//         address[] memory routers = new address[](1);

//         // Deploy StreamDaemon with the mock interface
//         streamDaemon = new StreamDaemon(dexAddresses, routers);
//     }

//     function testConstructorInitialization() public view {
//         // Check that the universalDexInterface was set correctly
//         // assertEq(address(streamDaemon.universalDexInterface()), address(mockDex)); DEPRECATED

//         // Check that the dexs array was initialized correctly
//         assertEq(streamDaemon.dexs(0), address(mockDex));
//     }

//     function testRegisterDex() public {
//         // Create a new mock DEX
//         MockUniversalDexInterface mockDex2 = new MockUniversalDexInterface();

//         // Register the new DEX
//         streamDaemon.registerDex(address(mockDex2));

//         // Check that the new DEX was added to the array
//         assertEq(streamDaemon.dexs(1), address(mockDex2));
//     }

//     function testFindHighestReserves() public {
//         // Set up mock reserves
//         mockDex.setMockReserves(TOKEN_A, TOKEN_B, 1000e18, 1000e18);

//         // Test finding highest reserves
//         (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut) =
//             streamDaemon.findHighestReservesForTokenPair(TOKEN_A, TOKEN_B);
//         assertEq(bestFetcher, address(mockDex), "Should return mock DEX");
//         assertEq(maxReserveIn, 1000e18, "Should return correct reserve in");
//         assertEq(maxReserveOut, 1000e18, "Should return correct reserve out");
//     }

//     function testSweetSpotCalculation() public view {
//         uint256 volume = 100;
//         uint256 reserves = 1000;
//         uint256 effectiveGas = 5;

//         // Test sweet spot calculation
//         uint256 sweetSpot = streamDaemon._sweetSpotAlgo(TOKEN_A, TOKEN_B, volume, reserves, reserves, effectiveGas);
//         assertTrue(sweetSpot >= 2, "Sweet spot should be at least 2");

//         // Test with different parameters
//         sweetSpot = streamDaemon._sweetSpotAlgo(TOKEN_A, TOKEN_B, 100, 100, 100, 1);
//         assertTrue(sweetSpot >= 2, "Sweet spot should be at least 2");

//         sweetSpot = streamDaemon._sweetSpotAlgo(TOKEN_A, TOKEN_B, 100, 25, 25, 4);
//         assertTrue(sweetSpot >= 2, "Sweet spot should be at least 2");
//     }

//     function testEvaluateSweetSpotAndDex() public view {
//         // Let's set some values for testing
//         uint256 volume = 100;
//         uint256 effectiveGas = 10;

//         // Call the function
//         (uint256 sweetSpot, address bestFetcher, address router) =
//             streamDaemon.evaluateSweetSpotAndDex(TOKEN_A, TOKEN_B, volume, effectiveGas);

//         // Check that the best fetcher is mockDex (which has higher reserves)
//         assertEq(bestFetcher, address(mockDex));

//         uint256 volumeSquared = volume * volume;
//         (, uint256 maxReserveIn, uint256 maxReserveOut) =
//             streamDaemon.findHighestReservesForTokenPair(TOKEN_A, TOKEN_B);
//         uint256 alpha = maxReserveIn / (maxReserveOut * maxReserveOut);

//         // Calculate the expected sweet spot using our own sqrt implementation
//         // The formula is: volume / sqrt(reserves * effectiveGas)
//         uint256 expectedSweetSpot = sqrt(volumeSquared * alpha);
//         assertEq(sweetSpot, expectedSweetSpot);
//     }

//     function testSqrtFunction() public view {
//         // Test sweet spot calculation with known results
//         uint256 sweetSpot = streamDaemon._sweetSpotAlgo(TOKEN_A, TOKEN_B, 100, 100, 100, 1);
//         assertEq(sweetSpot, 10);

//         // Test with different parameters
//         sweetSpot = streamDaemon._sweetSpotAlgo(TOKEN_A, TOKEN_B, 100, 25, 25, 4);
//         assertEq(sweetSpot, 10);
//     }

//     function testOnlyOwnerCanRegisterDex() public {
//         // Create a new address
//         address nonOwner = makeAddr("nonOwner");

//         // Try to register a new DEX from the non-owner address
//         vm.prank(nonOwner);
//         vm.expectRevert(); // This should revert since only the owner can register DEXes
//         streamDaemon.registerDex(address(0x123));
//     }

//     // Our own implementation of sqrt for testing purposes
//     function sqrt(uint256 y) internal pure returns (uint256 z) {
//         if (y > 3) {
//             z = y;
//             uint256 x = y / 2 + 1;
//             while (x < z) {
//                 z = x;
//                 x = (y / x + x) / 2;
//             }
//         } else if (y != 0) {
//             z = 1;
//         }
//     }
// }
