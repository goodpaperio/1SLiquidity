// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/interfaces/ICore.sol";
import "../../src/StreamDaemon.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ICoreRead {
    function streamDaemon() external view returns (address);
    function BPS_SLIPPAGE() external view returns (uint256);
}

/**
 * @title PlaceTradeWethUsdcCast
 * @notice Place one ~$5 WETH -> USDC trade on mainnet Core (v1.0.8).
 * @dev Uses live DEX quote and applies Core BPS slippage to compute amountOutMin.
 *      Run via: npm run place-trade:weth-usdc
 */
contract PlaceTradeWethUsdcCast is Script {
    // v1.0.8 deployment (mainnet)
    address constant CORE = 0xa017d75FeD4E71799FdE4457191a1E3e295C3b0B;

    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    // Target ~$5 notional. This varies with ETH price.
    uint256 constant AMOUNT_WETH = 0.0015 ether;
    uint256 constant INSTASETTLE_BPS = 100;

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
        uint256 bpsSlippage = ICoreRead(CORE).BPS_SLIPPAGE();

        (, address bestDex,) = StreamDaemon(streamDaemon).evaluateSweetSpotAndDex(
            tokenIn, tokenOut, amountIn, 0, usePriceBased
        );

        (uint256 quotedOut,) = IUniversalDexInterface(bestDex).getQuote(tokenIn, tokenOut, amountIn);
        if (quotedOut == 0) {
            quotedOut = IUniversalDexInterface(bestDex).getPrice(tokenIn, tokenOut, amountIn);
        }
        require(quotedOut > 0, "PlaceTradeWethUsdcCast: quote unavailable");
        require(bpsSlippage < 1000, "PlaceTradeWethUsdcCast: invalid BPS_SLIPPAGE");

        uint256 slippageCoefficient = 1000 - bpsSlippage;
        amountOutMin = (quotedOut * slippageCoefficient) / 1000;
        require(amountOutMin > 0, "PlaceTradeWethUsdcCast: amountOutMin is zero");
    }
}
