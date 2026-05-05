// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../script/addresses/MainnetAddresses.sol";
import "../src/interfaces/IUniversalDexInterface.sol";

/**
 * @notice Smoke test for **deployed** UniswapV2 fetcher (sync with `MainnetAddresses`).
 * @dev Run with mainnet fork. V2 has no fee tiers; this only catches “wrong address / broken bytecode”.
 */
contract UniswapV2MainnetFetcherSmoke is Test {
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function test_mainnetV2Fetcher_reservesAndType() public {
        vm.chainId(MainnetAddresses.CHAIN_ID);
        address f = MainnetAddresses.UNISWAP_V2_FETCHER;
        assertEq(keccak256(bytes(IUniversalDexInterface(f).getDexType())), keccak256(bytes("UniswapV2")));
        (uint256 r0, uint256 r1) = IUniversalDexInterface(f).getReserves(WETH, USDC);
        assertTrue(r0 > 0 && r1 > 0, "WETH/USDC reserves");
    }
}
