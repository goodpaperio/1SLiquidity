// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/StdJson.sol";
import {StreamDaemon} from "../../src/StreamDaemon.sol";
import {UniswapV2Fetcher} from "../../src/adapters/UniswapV2Fetcher.sol";
import {UniswapV3Fetcher} from "../../src/adapters/UniswapV3Fetcher.sol";
import {SushiswapFetcher} from "../../src/adapters/SushiswapFetcher.sol";
import {BalancerV2Fetcher} from "../../src/adapters/BalancerV2Fetcher.sol";
import {BalancerV2PoolRegistry} from "../../src/adapters/BalancerV2PoolRegistry.sol";

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
    address private constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

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

    // Keep references for matrix winner diagnostics.
    address private dexUniV2;
    address private dexUniV3_100;
    address private dexUniV3_500;
    address private dexUniV3_3000;
    address private dexUniV3_10000;
    address private dexSushi;
    address private dexBalancer;

    function setUp() public {
        string memory dexMode = vm.envOr("MATRIX_DEX_MODE", string("core+balancer"));
        bool includeCore = !_isMode(dexMode, "balancer-only");
        bool includeBalancer = !_isMode(dexMode, "core");

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
        BalancerV2PoolRegistry balancerRegistry = new BalancerV2PoolRegistry(address(this));
        _seedBalancerFromCandidates(balancerRegistry);
        BalancerV2Fetcher balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerRegistry));

        dexUniV2 = address(uniswapV2Fetcher);
        dexUniV3_100 = address(uniswapV3Fetcher100);
        dexUniV3_500 = address(uniswapV3Fetcher500);
        dexUniV3_3000 = address(uniswapV3Fetcher3000);
        dexUniV3_10000 = address(uniswapV3Fetcher10000);
        dexSushi = address(sushiswapFetcher);
        dexBalancer = address(balancerFetcher);

        uint256 dexCount = 0;
        if (includeCore) dexCount += 6;
        if (includeBalancer) dexCount += 1;
        require(dexCount > 0, "matrix mode has no DEX enabled");

        address[] memory dexs = new address[](dexCount);
        address[] memory routers = new address[](dexCount);
        uint256 cursor = 0;

        if (includeCore) {
            dexs[cursor] = dexUniV2;
            routers[cursor] = UNISWAP_V2_ROUTER;
            cursor++;
            dexs[cursor] = dexUniV3_100;
            routers[cursor] = UNISWAP_V3_ROUTER;
            cursor++;
            dexs[cursor] = dexUniV3_500;
            routers[cursor] = UNISWAP_V3_ROUTER;
            cursor++;
            dexs[cursor] = dexUniV3_3000;
            routers[cursor] = UNISWAP_V3_ROUTER;
            cursor++;
            dexs[cursor] = dexUniV3_10000;
            routers[cursor] = UNISWAP_V3_ROUTER;
            cursor++;
            dexs[cursor] = dexSushi;
            routers[cursor] = SUSHISWAP_ROUTER;
            cursor++;
        }

        if (includeBalancer) {
            dexs[cursor] = dexBalancer;
            routers[cursor] = BALANCER_VAULT;
        }

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
        uint256 failuresNoQuoteCapable;
        uint256 failuresOtherReason;
        uint256 failuresLowLevel;

        uint256 winnerUniV2;
        uint256 winnerUniV3_100;
        uint256 winnerUniV3_500;
        uint256 winnerUniV3_3000;
        uint256 winnerUniV3_10000;
        uint256 winnerSushi;
        uint256 winnerBalancer;
        uint256 winnerOther;

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
                    if (bestFetcher == dexUniV2) winnerUniV2++;
                    else if (bestFetcher == dexUniV3_100) winnerUniV3_100++;
                    else if (bestFetcher == dexUniV3_500) winnerUniV3_500++;
                    else if (bestFetcher == dexUniV3_3000) winnerUniV3_3000++;
                    else if (bestFetcher == dexUniV3_10000) winnerUniV3_10000++;
                    else if (bestFetcher == dexSushi) winnerSushi++;
                    else if (bestFetcher == dexBalancer) winnerBalancer++;
                    else winnerOther++;
                } else {
                    failed++;
                    emit log("matrix invalid zero/empty response");
                    emit log_named_string("base", matrixBaseSymbols[i]);
                    emit log_named_address("tokenIn", tokenIn);
                    emit log_named_address("tokenOut", tokenOut);
                }
            } catch Error(string memory reason) {
                failed++;
                if (_eq(reason, "No quote-capable DEX found for stream")) {
                    failuresNoQuoteCapable++;
                } else {
                    failuresOtherReason++;
                }
                emit log_named_string("matrix revert reason", reason);
                emit log_named_string("base", matrixBaseSymbols[i]);
                emit log_named_address("tokenIn", tokenIn);
                emit log_named_address("tokenOut", tokenOut);
            } catch (bytes memory lowLevelData) {
                failed++;
                failuresLowLevel++;
                emit log_named_uint("matrix low-level revert bytes", lowLevelData.length);
                emit log_named_string("base", matrixBaseSymbols[i]);
                emit log_named_address("tokenIn", tokenIn);
                emit log_named_address("tokenOut", tokenOut);
            }
        }

        string memory modeLabel = usePriceBased ? "price" : "reserve";
        emit log_named_string("matrix mode", modeLabel);
        emit log_named_uint("failures_no_quote_capable", failuresNoQuoteCapable);
        emit log_named_uint("failures_other_reason", failuresOtherReason);
        emit log_named_uint("failures_low_level", failuresLowLevel);

        emit log_named_uint("winners_uniswap_v2", winnerUniV2);
        emit log_named_uint("winners_uniswap_v3_100", winnerUniV3_100);
        emit log_named_uint("winners_uniswap_v3_500", winnerUniV3_500);
        emit log_named_uint("winners_uniswap_v3_3000", winnerUniV3_3000);
        emit log_named_uint("winners_uniswap_v3_10000", winnerUniV3_10000);
        emit log_named_uint("winners_sushiswap", winnerSushi);
        emit log_named_uint("winners_balancer", winnerBalancer);
        emit log_named_uint("winners_other", winnerOther);
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

    function _seedBalancerFromCandidates(BalancerV2PoolRegistry registry) internal {
        string memory filePath = vm.envOr("BALANCER_CANDIDATES_FILE", string("docs/balancer-seed-candidates.json"));
        string memory jsonFile = vm.readFile(filePath);
        uint256 totalCount = jsonFile.readUint(".totalCount");

        for (uint256 i = 0; i < totalCount; i++) {
            address tokenA = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].tokenA"));
            address tokenB = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].tokenB"));
            address pool = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].pool"));
            registry.addPool(tokenA, tokenB, pool, true);
        }
    }

    function _eq(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }

    function _isMode(string memory configuredMode, string memory expectedMode) internal pure returns (bool) {
        return _eq(configuredMode, expectedMode);
    }
}
