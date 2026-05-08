// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/StdJson.sol";
import {StreamDaemon} from "../../src/StreamDaemon.sol";
import {UniswapV2Fetcher} from "../../src/adapters/UniswapV2Fetcher.sol";
import {UniswapV3Fetcher} from "../../src/adapters/UniswapV3Fetcher.sol";
import {SushiswapFetcher} from "../../src/adapters/SushiswapFetcher.sol";

contract QuoteMatrixEvaluator is Test {
    using stdJson for string;

    // Mainnet infra
    address private constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address private constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address private constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address private constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address private constant UNISWAP_V3_QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;
    address private constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address private constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // Base tokens
    address private constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address private constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address private constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    StreamDaemon private streamDaemon;

    address[] private matrixTokenIns;
    address[] private matrixTokenOuts;
    string[] private matrixBaseSymbols;
    mapping(bytes32 => bool) private seenPairs;

    function setUp() public {
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        UniswapV3Fetcher uniswapV3Fetcher100 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 100);
        UniswapV3Fetcher uniswapV3Fetcher500 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 500);
        UniswapV3Fetcher uniswapV3Fetcher3000 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 3000);
        UniswapV3Fetcher uniswapV3Fetcher10000 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 10000);
        uniswapV3Fetcher100.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniswapV3Fetcher500.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniswapV3Fetcher3000.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniswapV3Fetcher10000.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);

        address[] memory dexs = new address[](6);
        address[] memory routers = new address[](6);
        dexs[0] = address(uniswapV2Fetcher);
        dexs[1] = address(uniswapV3Fetcher100);
        dexs[2] = address(uniswapV3Fetcher500);
        dexs[3] = address(uniswapV3Fetcher3000);
        dexs[4] = address(uniswapV3Fetcher10000);
        dexs[5] = address(sushiswapFetcher);
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = UNISWAP_V3_ROUTER;
        routers[2] = UNISWAP_V3_ROUTER;
        routers[3] = UNISWAP_V3_ROUTER;
        routers[4] = UNISWAP_V3_ROUTER;
        routers[5] = SUSHISWAP_ROUTER;

        streamDaemon = new StreamDaemon(dexs, routers);

        _addPairsFromFile(USDC, "USDC", "config/usdc_pairs_clean.json");
        _addPairsFromFile(USDT, "USDT", "config/usdt_pairs_clean.json");
        _addPairsFromFile(WETH, "WETH", "config/weth_pairs_clean.json");
        _addPairsFromFile(WBTC, "WBTC", "config/wbtc_pairs_clean.json");
        _addPairsFromFile(DAI, "DAI", "config/dai_pairs_clean.json");
    }

    function testQuoteMatrixReserveBased() public {
        (uint256 passed, uint256 failed) = _runMatrix(false);
        emit log_named_uint("reserve mode total", matrixTokenIns.length);
        emit log_named_uint("reserve mode passed", passed);
        emit log_named_uint("reserve mode failed", failed);
        assertEq(failed, 0, "reserve-based quote matrix has failures");
    }

    function testQuoteMatrixPriceBased() public {
        if (!vm.envOr("RUN_PRICE_BASED_MATRIX", true)) {
            return;
        }

        (uint256 passed, uint256 failed) = _runMatrix(true);
        emit log_named_uint("price mode total", matrixTokenIns.length);
        emit log_named_uint("price mode passed", passed);
        emit log_named_uint("price mode failed", failed);
        assertEq(failed, 0, "price-based quote matrix has failures");
    }

    function _runMatrix(bool usePriceBased) internal returns (uint256 passed, uint256 failed) {
        for (uint256 i = 0; i < matrixTokenIns.length; i++) {
            address tokenIn = matrixTokenIns[i];
            address tokenOut = matrixTokenOuts[i];
            uint256 amountIn = _amountForBaseToken(tokenIn);

            try streamDaemon.evaluateStreamPlan(tokenIn, tokenOut, amountIn, true, usePriceBased, 0) returns (
                address bestFetcher,
                address router,
                uint256 sweetSpot,
                uint256 streamVolume,
                uint256 quotedOut,
                bytes memory
            ) {
                bool valid = bestFetcher != address(0) && router != address(0) && sweetSpot > 0 && streamVolume > 0
                    && quotedOut > 0;
                if (valid) {
                    passed++;
                } else {
                    failed++;
                    emit log("matrix invalid zero/empty response");
                    emit log_named_string("base", matrixBaseSymbols[i]);
                    emit log_named_address("tokenIn", tokenIn);
                    emit log_named_address("tokenOut", tokenOut);
                }
            } catch Error(string memory reason) {
                failed++;
                emit log_named_string("matrix revert reason", reason);
                emit log_named_string("base", matrixBaseSymbols[i]);
                emit log_named_address("tokenIn", tokenIn);
                emit log_named_address("tokenOut", tokenOut);
            } catch (bytes memory lowLevelData) {
                failed++;
                emit log_named_uint("matrix low-level revert bytes", lowLevelData.length);
                emit log_named_string("base", matrixBaseSymbols[i]);
                emit log_named_address("tokenIn", tokenIn);
                emit log_named_address("tokenOut", tokenOut);
            }
        }
    }

    function _addPairsFromFile(address baseToken, string memory baseSymbol, string memory filePath) internal {
        string memory jsonFile = vm.readFile(filePath);
        uint256 totalCount = jsonFile.readUint(".totalCount");
        for (uint256 i = 0; i < totalCount; i++) {
            string memory itemPath = string.concat(".pairs[", vm.toString(i), "].address");
            address quoteToken = jsonFile.readAddress(itemPath);
            if (quoteToken == address(0) || quoteToken == baseToken) {
                continue;
            }

            bytes32 pairId = keccak256(abi.encode(baseToken, quoteToken));
            if (seenPairs[pairId]) {
                continue;
            }
            seenPairs[pairId] = true;
            matrixTokenIns.push(baseToken);
            matrixTokenOuts.push(quoteToken);
            matrixBaseSymbols.push(baseSymbol);
        }
    }

    function _amountForBaseToken(address token) internal pure returns (uint256) {
        if (token == USDC || token == USDT) return 100 * 1e6;
        if (token == DAI) return 100 * 1e18;
        if (token == WETH) return 5e16; // 0.05 WETH
        if (token == WBTC) return 100_000; // 0.001 WBTC (8 decimals)
        return 1e18;
    }
}
