// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/interfaces/ICore.sol";
import "../../src/interfaces/IUniversalDexInterface.sol";
import "../../src/StreamDaemon.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICoreRead {
    function streamDaemon() external view returns (address);
}

/**
 * @title PlaceTradeWethUsdcCast
 * @notice Place one ~$5 WETH -> USDC trade on mainnet Core (v1.0.9 / v2.2.1 pointer).
 * @dev Uses live DEX quote and 160 bps total buffer (same as smoke scripts) for amountOutMin.
 *      Run: npm run place-trade:weth-usdc
 *      Dry-run: forge script script/processes/PlaceTradeWethUsdcCast.s.sol:PlaceTradeWethUsdcCast --rpc-url $MAINNET_RPC_URL --via-ir -vvv
 */
contract PlaceTradeWethUsdcCast is Script {
    // Mainnet Core (unchanged for v2.2.1 StreamDaemon swap-in)
    address constant CORE = 0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710;

    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    // Target ~$5 notional. This varies with ETH price.
    uint256 constant AMOUNT_WETH = 0.0015 ether;
    uint256 constant INSTASETTLE_BPS = 100;
    // 0.4% DEX + 0.2% protocol + 1.0% execution buffer = 1.6% (matches PlaceTradeSmokeV109)
    uint256 constant TOTAL_BPS_BUFFER = 160;
    uint256 constant BPS_DENOMINATOR = 10_000;

    function run() external {
        uint256 amountOutMin = _computeAmountOutMin(WETH, USDC, AMOUNT_WETH, false);

        console.log("Placing WETH -> USDC");
        console.log("amountIn (wei):", AMOUNT_WETH);
        console.log("amountOutMin (USDC 6dp):", amountOutMin);

        vm.startBroadcast();
        IERC20(WETH).approve(CORE, AMOUNT_WETH);

        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            AMOUNT_WETH,
            amountOutMin,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );

        ICore(CORE).placeTrade(tradeData);
        vm.stopBroadcast();

        console.log("PlaceTradeWethUsdcCast: trade placed");
    }

    function _computeAmountOutMin(address tokenIn, address tokenOut, uint256 amountIn, bool usePriceBased)
        internal
        returns (uint256 amountOutMin)
    {
        address streamDaemon = ICoreRead(CORE).streamDaemon();

        (, address bestDex,) = StreamDaemon(streamDaemon).evaluateSweetSpotAndDex(
            tokenIn, tokenOut, amountIn, 0, usePriceBased
        );
        require(bestDex != address(0), "PlaceTradeWethUsdcCast: no best dex");

        (uint256 quotedOut,) = IUniversalDexInterface(bestDex).getQuote(tokenIn, tokenOut, amountIn);
        if (quotedOut == 0) {
            quotedOut = IUniversalDexInterface(bestDex).getPrice(tokenIn, tokenOut, amountIn);
        }
        require(quotedOut > 0, "PlaceTradeWethUsdcCast: quote unavailable");

        uint256 effectiveBps = BPS_DENOMINATOR - TOTAL_BPS_BUFFER;
        amountOutMin = (quotedOut * effectiveBps) / BPS_DENOMINATOR;
        require(amountOutMin > 0, "PlaceTradeWethUsdcCast: amountOutMin is zero");

        console.log("Quoted USDC out (6dp):", quotedOut);
        console.log("amountOutMin (160 bps buffer):", amountOutMin);
    }
}
