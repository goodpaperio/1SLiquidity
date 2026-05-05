// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";

/**
 * Compute storage slots for Core.trades[1] to compare with Tenderly trace.
 * Utils.Trade: owner+attempts(0), tokenIn(1), tokenOut(2), amountIn(3), amountRemaining(4), ...
 * Run: forge test --match-contract StorageLayoutTest -vvv
 */
contract StorageLayoutTest is Test {
    function testTradesStorageSlots() public {
        // From: forge inspect Core storageLayout --via-ir
        // trades is at slot 12 (ethSupport + 3x uint16 pack into slot 5)
        uint256 tradesSlot = 12;
        bytes32 base = keccak256(abi.encode(uint256(1), tradesSlot));
        uint256 slotAmountIn = uint256(base) + 3;
        uint256 slotAmountRemaining = uint256(base) + 4;

        console.log("trades[1] base (hex):");
        console.logBytes32(base);
        console.log("amountIn slot (offset 3):");
        console.logBytes32(bytes32(slotAmountIn));
        console.log("amountRemaining slot (offset 4):");
        console.logBytes32(bytes32(slotAmountRemaining));
        console.log("Tenderly trace had SSTORE to 0xd421...b60 (value 5M). Is that +3 or +4?");
    }
}
