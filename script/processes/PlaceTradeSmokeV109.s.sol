// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/interfaces/ICore.sol";
import "../../src/interfaces/IUniversalDexInterface.sol";
import "../../src/StreamDaemon.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IETHSupportPlaceTrade {
    function placeTradeWithETH(
        address tokenOut,
        uint256 amountOutMin,
        bool isInstasettlable,
        bool usePriceBased,
        uint256 instasettleBps,
        bool onlyInstasettle
    ) external payable returns (uint256);
}

interface ICoreRead {
    function streamDaemon() external view returns (address);
}

/**
 * @title PlaceTradeSmokeV109
 * @notice Place a single small mainnet smoke trade on v1.0.9 contracts.
 * @dev Usage:
 *      PAIR=ETH_DAI forge script script/processes/PlaceTradeSmokeV109.s.sol:PlaceTradeSmokeV109 --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey --via-ir -vvvv
 */
contract PlaceTradeSmokeV109 is Script {
    // v1.0.9 deployment
    address constant CORE = 0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710;
    address constant ETH_SUPPORT = 0x93A21f27BbC9ABdf725E09ae6FE714D5C9428Bf4;

    // Base tokens
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    // Quote tokens
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address constant ENS = 0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72;
    address constant RPL = 0xD33526068D116cE69F19A9ee46F0bd304F21A51f;
    address constant GRT = 0xc944E90C64B2c07662A292be6244BDf05Cda44a7;

    // ~$5 notionals (approximate)
    uint256 constant AMOUNT_ETH_OR_WETH = 0.0015 ether;
    uint256 constant AMOUNT_USDC = 5e6;
    uint256 constant INSTASETTLE_BPS = 100;
    // 0.4% DEX + 0.2% protocol + 1.0% extra execution buffer = 1.6%
    uint256 constant TOTAL_BPS_BUFFER = 160;
    uint256 constant BPS_DENOMINATOR = 10_000;

    function run() external {
        string memory pair = vm.envOr("PAIR", string(""));
        require(bytes(pair).length > 0, "PlaceTradeSmokeV109: set PAIR");

        vm.startBroadcast();

        if (_eq(pair, "ETH_DAI")) _placeEthTrade(DAI);
        else if (_eq(pair, "WETH_LINK")) _placeWethTrade(LINK);
        else if (_eq(pair, "USDC_WETH")) _placeUsdcTrade(WETH);
        else if (_eq(pair, "ETH_ENS")) _placeEthTrade(ENS);
        else if (_eq(pair, "WETH_RPL")) _placeWethTrade(RPL);
        else if (_eq(pair, "USDC_GRT")) _placeUsdcTrade(GRT);
        else revert("PlaceTradeSmokeV109: unsupported PAIR");

        vm.stopBroadcast();
        console.log("PlaceTradeSmokeV109: trade placed for", pair);
    }

    function _placeWethTrade(address tokenOut) internal {
        uint256 amountOutMin = _computeAmountOutMin(WETH, tokenOut, AMOUNT_ETH_OR_WETH);
        IERC20(WETH).approve(CORE, AMOUNT_ETH_OR_WETH);
        bytes memory tradeData = abi.encode(
            WETH,
            tokenOut,
            AMOUNT_ETH_OR_WETH,
            amountOutMin,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
        ICore(CORE).placeTrade(tradeData);
    }

    function _placeUsdcTrade(address tokenOut) internal {
        uint256 amountOutMin = _computeAmountOutMin(USDC, tokenOut, AMOUNT_USDC);
        IERC20(USDC).approve(CORE, AMOUNT_USDC);
        bytes memory tradeData = abi.encode(
            USDC,
            tokenOut,
            AMOUNT_USDC,
            amountOutMin,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
        ICore(CORE).placeTrade(tradeData);
    }

    function _placeEthTrade(address tokenOut) internal {
        uint256 amountOutMin = _computeAmountOutMin(WETH, tokenOut, AMOUNT_ETH_OR_WETH);
        IETHSupportPlaceTrade(ETH_SUPPORT).placeTradeWithETH{value: AMOUNT_ETH_OR_WETH}(
            tokenOut,
            amountOutMin,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
    }

    function _computeAmountOutMin(address tokenIn, address tokenOut, uint256 amountIn) internal returns (uint256) {
        address streamDaemonAddr = ICoreRead(CORE).streamDaemon();

        (, address bestDex,) = StreamDaemon(streamDaemonAddr).evaluateSweetSpotAndDex(tokenIn, tokenOut, amountIn, 0, false);
        require(bestDex != address(0), "PlaceTradeSmokeV109: no best dex");

        (uint256 quotedOut,) = IUniversalDexInterface(bestDex).getQuote(tokenIn, tokenOut, amountIn);
        if (quotedOut == 0) {
            quotedOut = IUniversalDexInterface(bestDex).getPrice(tokenIn, tokenOut, amountIn);
        }
        require(quotedOut > 0, "PlaceTradeSmokeV109: quote unavailable");

        uint256 effectiveBps = BPS_DENOMINATOR - TOTAL_BPS_BUFFER;
        uint256 amountOutMin = (quotedOut * effectiveBps) / BPS_DENOMINATOR;
        require(amountOutMin > 0, "PlaceTradeSmokeV109: amountOutMin is zero");

        console.log("Quoted out:", quotedOut);
        console.log("amountOutMin (160 bps buffer):", amountOutMin);
        return amountOutMin;
    }

    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}
