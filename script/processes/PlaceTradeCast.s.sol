// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/interfaces/ICore.sol";
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
    function BPS_SLIPPAGE() external view returns (uint256);
}

/**
 * @title PlaceTradeCast
 * @notice Place a single ~$5 trade on mainnet Core (v1.0.7). No whale funding; signer must have balance.
 * @dev Run with: PAIR=WETH_DAI npm run place-trade (or place-trade.sh WETH_DAI)
 *      Pairs: WETH_DAI, WETH_PEPE, USDC_DAI, USDC_WETH, USDC_PEPE, ETH_DAI, ETH_PEPE
 */
contract PlaceTradeCast is Script {
    // v1.0.7 deployment (mainnet)
    address constant CORE = 0x4f055d064556Ce4433C53b7c21eBe4f6Ab96A8a3;
    address constant ETH_SUPPORT = 0xB970aF8dA1909230a32819602d97a0C0d44C5FB5;

    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant PEPE = 0x6982508145454Ce325dDbE47a25d4ec3d2311933;

    uint256 constant AMOUNT_WETH = 0.0015 ether; // ~$5
    uint256 constant AMOUNT_USDC = 5e6;          // $5
    uint256 constant INSTASETTLE_BPS = 100;

    function run() external {
        string memory pair = vm.envOr("PAIR", string(""));
        require(bytes(pair).length > 0, "PlaceTradeCast: set PAIR (e.g. WETH_DAI, USDC_PEPE, ETH_DAI)");

        address tokenOut;
        if (keccak256(bytes(pair)) == keccak256("WETH_DAI")) tokenOut = DAI;
        else if (keccak256(bytes(pair)) == keccak256("WETH_PEPE")) tokenOut = PEPE;
        else if (keccak256(bytes(pair)) == keccak256("USDC_DAI")) tokenOut = DAI;
        else if (keccak256(bytes(pair)) == keccak256("USDC_WETH")) tokenOut = WETH;
        else if (keccak256(bytes(pair)) == keccak256("USDC_PEPE")) tokenOut = PEPE;
        else if (keccak256(bytes(pair)) == keccak256("ETH_DAI")) tokenOut = DAI;
        else if (keccak256(bytes(pair)) == keccak256("ETH_PEPE")) tokenOut = PEPE;
        else revert("PlaceTradeCast: invalid PAIR. Use WETH_DAI, WETH_PEPE, USDC_DAI, USDC_WETH, USDC_PEPE, ETH_DAI, ETH_PEPE");

        vm.startBroadcast();

        if (keccak256(bytes(pair)) == keccak256("ETH_DAI") || keccak256(bytes(pair)) == keccak256("ETH_PEPE")) {
            _placeEthTrade(tokenOut);
        } else if (keccak256(bytes(pair)) == keccak256("WETH_DAI") || keccak256(bytes(pair)) == keccak256("WETH_PEPE")) {
            _placeWethTrade(tokenOut);
        } else {
            _placeUsdcTrade(tokenOut);
        }

        vm.stopBroadcast();
        console.log("PlaceTradeCast: trade placed for pair", pair);
    }

    function _placeWethTrade(address tokenOut) internal {
        uint256 amountOutMin = _computeAmountOutMin(WETH, tokenOut, AMOUNT_WETH, false);
        IERC20(WETH).approve(CORE, AMOUNT_WETH);
        bytes memory tradeData = abi.encode(
            WETH,
            tokenOut,
            AMOUNT_WETH,
            amountOutMin,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
        ICore(CORE).placeTrade(tradeData);
    }

    function _placeUsdcTrade(address tokenOut) internal {
        uint256 amountOutMin = _computeAmountOutMin(USDC, tokenOut, AMOUNT_USDC, false);
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
        uint256 amountOutMin = _computeAmountOutMin(WETH, tokenOut, AMOUNT_WETH, false);
        IETHSupportPlaceTrade(ETH_SUPPORT).placeTradeWithETH{value: AMOUNT_WETH}(
            tokenOut,
            amountOutMin,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
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
        require(quotedOut > 0, "PlaceTradeCast: quote unavailable");
        require(bpsSlippage < 1000, "PlaceTradeCast: invalid BPS_SLIPPAGE");

        uint256 slippageCoefficient = 1000 - bpsSlippage;
        amountOutMin = (quotedOut * slippageCoefficient) / 1000;
        require(amountOutMin > 0, "PlaceTradeCast: amountOutMin is zero");
    }
}
