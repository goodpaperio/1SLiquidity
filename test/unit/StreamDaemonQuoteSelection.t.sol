// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {StreamDaemon} from "../../src/StreamDaemon.sol";
import {IUniversalDexInterface} from "../../src/interfaces/IUniversalDexInterface.sol";

contract MockQuoteFetcher is IUniversalDexInterface {
    uint256 public reserveIn;
    uint256 public reserveOut;
    bool public shouldRevertQuote;
    uint256 public quoteOut;
    constructor(uint256 _reserveIn, uint256 _reserveOut, uint256 _quoteOut, bool _shouldRevert) {
        reserveIn = _reserveIn;
        reserveOut = _reserveOut;
        quoteOut = _quoteOut;
        shouldRevertQuote = _shouldRevert;
    }

    function getReserves(address, address) external view override returns (uint256, uint256) {
        return (reserveIn, reserveOut);
    }

    function getQuote(address, address, uint256) external view override returns (uint256 amountOut, bytes memory aux) {
        if (shouldRevertQuote) revert("mock quote revert");
        return (quoteOut, "");
    }

    function getPrice(address, address, uint256) external view override returns (uint256) {
        return quoteOut;
    }

    function getPoolAddress(address, address) external pure override returns (address) {
        return address(0);
    }

    function getDexType() external pure override returns (string memory) {
        return "Mock";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V1";
    }
}

contract StreamDaemonQuoteSelectionTest is Test {
    StreamDaemon internal streamDaemon;
    MockQuoteFetcher internal revertingHighReserveFetcher;
    MockQuoteFetcher internal healthyLowerReserveFetcher;

    address internal constant TOKEN_IN = address(0x1111);
    address internal constant TOKEN_OUT = address(0x2222);

    function setUp() public {
        revertingHighReserveFetcher = new MockQuoteFetcher(1_000_000e18, 2_000_000e18, 0, true);
        healthyLowerReserveFetcher = new MockQuoteFetcher(500_000e18, 1_000_000e18, 10e18, false);

        address[] memory dexs = new address[](2);
        address[] memory routers = new address[](2);
        dexs[0] = address(revertingHighReserveFetcher);
        dexs[1] = address(healthyLowerReserveFetcher);
        routers[0] = address(0xAAA1);
        routers[1] = address(0xAAA2);

        streamDaemon = new StreamDaemon(dexs, routers);
    }

    function testFallsBackToNextDexWhenHighestReserveQuoteReverts() public {
        (
            address bestFetcher,
            address router,
            uint256 sweetSpot,
            uint256 streamVolume,
            uint256 quotedOut,
            bytes memory quoteAux
        ) = streamDaemon.evaluateStreamPlan(TOKEN_IN, TOKEN_OUT, 100e18, true, false, 0);

        assertEq(bestFetcher, address(healthyLowerReserveFetcher), "should skip reverting quote fetcher");
        assertEq(router, address(0xAAA2), "should return router for selected fetcher");
        assertGt(sweetSpot, 0, "sweet spot should be computed");
        assertGt(streamVolume, 0, "stream volume should be computed");
        assertEq(quotedOut, 10e18, "quote should come from healthy fetcher");
        assertEq(quoteAux.length, 0, "mock aux should be empty");
    }

    function testRevertsWhenAllFetchersFailQuote() public {
        MockQuoteFetcher failingA = new MockQuoteFetcher(1_000_000e18, 2_000_000e18, 0, true);
        MockQuoteFetcher failingB = new MockQuoteFetcher(500_000e18, 1_000_000e18, 0, true);

        address[] memory dexs = new address[](2);
        address[] memory routers = new address[](2);
        dexs[0] = address(failingA);
        dexs[1] = address(failingB);
        routers[0] = address(0xBBB1);
        routers[1] = address(0xBBB2);

        StreamDaemon daemon = new StreamDaemon(dexs, routers);

        vm.expectRevert(bytes("No quote-capable DEX found for stream"));
        daemon.evaluateStreamPlan(TOKEN_IN, TOKEN_OUT, 100e18, true, false, 0);
    }
}
