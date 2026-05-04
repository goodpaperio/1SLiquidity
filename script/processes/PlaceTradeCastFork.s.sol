// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/interfaces/ICore.sol";
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

/**
 * @title PlaceTradeCastFork
 * @notice Same as PlaceTradeCast but for local Anvil fork: funds msg.sender from whales then places one ~$5 trade.
 * @dev Run with fork: npm run anvil:hard-start (in one terminal), then npm run place-trade:fork -- WETH_DAI
 *      Pairs: WETH_DAI, WETH_PEPE, USDC_DAI, USDC_PEPE, ETH_DAI, ETH_PEPE
 */
contract PlaceTradeCastFork is Script {
    address constant CORE = 0x0367A0B3299Ff8b6Af83E52BAe99D62270374ea2;
    address constant ETH_SUPPORT = 0xB970aF8dA1909230a32819602d97a0C0d44C5FB5;

    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant PEPE = 0x6982508145454Ce325dDbE47a25d4ec3d2311933;

    address constant WETH_WHALE = 0x2F0b23f53734252Bda2277357e97e1517d6B042A;
    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;

    uint256 constant AMOUNT_WETH = 0.0015 ether;
    uint256 constant AMOUNT_USDC = 5e6;
    uint256 constant AMOUNT_OUT_MIN = 0;
    uint256 constant INSTASETTLE_BPS = 100;

    uint256 constant FUND_WETH = 1 ether;
    uint256 constant FUND_USDC = 500e6;

    function run() external {
        string memory pair = vm.envOr("PAIR", string(""));
        require(bytes(pair).length > 0, "PlaceTradeCastFork: set PAIR (e.g. WETH_DAI, USDC_PEPE, ETH_DAI)");

        address tokenOut;
        if (keccak256(bytes(pair)) == keccak256("WETH_DAI")) tokenOut = DAI;
        else if (keccak256(bytes(pair)) == keccak256("WETH_PEPE")) tokenOut = PEPE;
        else if (keccak256(bytes(pair)) == keccak256("USDC_DAI")) tokenOut = DAI;
        else if (keccak256(bytes(pair)) == keccak256("USDC_PEPE")) tokenOut = PEPE;
        else if (keccak256(bytes(pair)) == keccak256("ETH_DAI")) tokenOut = DAI;
        else if (keccak256(bytes(pair)) == keccak256("ETH_PEPE")) tokenOut = PEPE;
        else revert("PlaceTradeCastFork: invalid PAIR. Use WETH_DAI, WETH_PEPE, USDC_DAI, USDC_PEPE, ETH_DAI, ETH_PEPE");

        // Fund signer from whales (simulated only; not broadcast)
        _fundFromWhales();

        vm.startBroadcast();

        if (keccak256(bytes(pair)) == keccak256("ETH_DAI") || keccak256(bytes(pair)) == keccak256("ETH_PEPE")) {
            _placeEthTrade(tokenOut);
        } else if (keccak256(bytes(pair)) == keccak256("WETH_DAI") || keccak256(bytes(pair)) == keccak256("WETH_PEPE")) {
            _placeWethTrade(tokenOut);
        } else {
            _placeUsdcTrade(tokenOut);
        }

        vm.stopBroadcast();
        console.log("PlaceTradeCastFork: trade placed for pair", pair);
    }

    function _fundFromWhales() internal {
        vm.prank(WETH_WHALE);
        IERC20(WETH).transfer(msg.sender, FUND_WETH);
        vm.prank(USDC_WHALE);
        IERC20(USDC).transfer(msg.sender, FUND_USDC);
    }

    function _placeWethTrade(address tokenOut) internal {
        IERC20(WETH).approve(CORE, AMOUNT_WETH);
        bytes memory tradeData = abi.encode(
            WETH,
            tokenOut,
            AMOUNT_WETH,
            AMOUNT_OUT_MIN,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
        ICore(CORE).placeTrade(tradeData);
    }

    function _placeUsdcTrade(address tokenOut) internal {
        IERC20(USDC).approve(CORE, AMOUNT_USDC);
        bytes memory tradeData = abi.encode(
            USDC,
            tokenOut,
            AMOUNT_USDC,
            AMOUNT_OUT_MIN,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
        ICore(CORE).placeTrade(tradeData);
    }

    function _placeEthTrade(address tokenOut) internal {
        IETHSupportPlaceTrade(ETH_SUPPORT).placeTradeWithETH{value: AMOUNT_WETH}(
            tokenOut,
            AMOUNT_OUT_MIN,
            false,
            false,
            INSTASETTLE_BPS,
            false
        );
    }
}
