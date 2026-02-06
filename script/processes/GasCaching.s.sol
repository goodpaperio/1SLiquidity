// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../Protocol.s.sol";

contract GasCaching is Protocol {
// function setUp() public override {
//     super.setUp();
// }

// function testGasRecording() public {
//     // Record gas for a simple operation
//     core.initiateGasRecord();
//     // Do some operations
//     uint256 dummy = 1 + 1;
//     core.closeGasRecord();

//     assertGt(core.lastGasUsed(), 0, "Gas used should be greater than 0");
//     assertGt(core.lastGasPrice(), 0, "Gas price should be greater than 0");
//     assertGt(core.lastGasCost(), 0, "Gas cost should be greater than 0");
// }

// function testTWAPGasCost() public {
//     // Record multiple gas costs
//     for(uint i = 0; i < 5; i++) {
//         core.initiateGasRecord();
//         // Do some operations
//         uint256 dummy = 1 + 1;
//         core.closeGasRecord();
//     }

//     uint256 twap = core.readTWAPGasCost(3);
//     assertGt(twap, 0, "TWAP gas cost should be greater than 0");
// }

// function testGasCostForTrade() public {
//     // Record gas for a trade
//     core.initiateGasRecord();

//     uint256 amountIn = formatTokenAmount(WETH, 1);
//     uint256 amountOutMin = formatTokenAmount(USDC, 1800);

//     approveToken(WETH, address(core), amountIn);

//     core.placeTrade(
//         WETH,
//         USDC,
//         amountIn,
//         amountOutMin,
//         false,
//         0.1 ether
//     );

//     core.closeGasRecord();

//     assertGt(core.lastGasUsed(), 0, "Trade gas used should be greater than 0");
//     assertGt(core.lastGasPrice(), 0, "Trade gas price should be greater than 0");
//     assertGt(core.lastGasCost(), 0, "Trade gas cost should be greater than 0");
// }

// function testGasCostForMultipleTrades() public {
//     uint256 totalGasCost = 0;

//     for(uint i = 0; i < 3; i++) {
//         core.initiateGasRecord();

//         uint256 amountIn = formatTokenAmount(WETH, 1);
//         uint256 amountOutMin = formatTokenAmount(USDC, 1800);

//         approveToken(WETH, address(core), amountIn);

//         core.placeTrade(
//             WETH,
//             USDC,
//             amountIn,
//             amountOutMin,
//             false,
//             0.1 ether
//         );

//         core.closeGasRecord();
//         totalGasCost += core.lastGasCost();
//     }

//     assertGt(totalGasCost, 0, "Total gas cost should be greater than 0");

//     // Check TWAP
//     uint256 twap = core.readTWAPGasCost(3);
//     assertGt(twap, 0, "TWAP gas cost should be greater than 0");
//     assertApproxEqRel(twap, totalGasCost / 3, 0.1e18, "TWAP should be approximately average of gas costs");
// }
}
