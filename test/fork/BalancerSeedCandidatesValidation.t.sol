// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/StdJson.sol";
import {BalancerV2PoolRegistry} from "../../src/adapters/BalancerV2PoolRegistry.sol";
import {BalancerV2Fetcher} from "../../src/adapters/BalancerV2Fetcher.sol";

contract BalancerSeedCandidatesValidation is Test {
    using stdJson for string;

    address private constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    BalancerV2PoolRegistry private registry;
    BalancerV2Fetcher private fetcher;

    function setUp() public {
        registry = new BalancerV2PoolRegistry(address(this));
        fetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));
    }

    function testValidateBalancerSeedCandidates() public {
        string memory filePath = vm.envOr("BALANCER_CANDIDATES_FILE", string("docs/balancer-seed-candidates.json"));
        string memory jsonFile = vm.readFile(filePath);
        uint256 totalCount = jsonFile.readUint(".totalCount");

        uint256 seeded;
        uint256 reservePassed;
        uint256 quotePassed;
        uint256 failed;

        for (uint256 i = 0; i < totalCount; i++) {
            address tokenA = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].tokenA"));
            address tokenB = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].tokenB"));
            address pool = jsonFile.readAddress(string.concat(".candidates[", vm.toString(i), "].pool"));
            string memory baseSymbol = jsonFile.readString(string.concat(".candidates[", vm.toString(i), "].baseSymbol"));
            string memory quoteName = jsonFile.readString(string.concat(".candidates[", vm.toString(i), "].quoteName"));

            registry.addPool(tokenA, tokenB, pool, true);
            seeded++;

            bool reservesOk;
            bool quoteOk;

            try fetcher.getReserves(tokenA, tokenB) returns (uint256 reserveA, uint256 reserveB) {
                reservesOk = reserveA > 0 && reserveB > 0;
            } catch {
                reservesOk = false;
            }

            uint256 amountIn = _amountForBaseSymbol(baseSymbol);
            try fetcher.getQuote(tokenA, tokenB, amountIn) returns (uint256 amountOut, bytes memory) {
                quoteOk = amountOut > 0;
            } catch {
                quoteOk = false;
            }

            if (reservesOk) reservePassed++;
            if (quoteOk) quotePassed++;

            if (!(reservesOk && quoteOk)) {
                failed++;
                emit log("balancer candidate validation failed");
                emit log_named_string("base", baseSymbol);
                emit log_named_string("quote", quoteName);
                emit log_named_address("tokenA", tokenA);
                emit log_named_address("tokenB", tokenB);
                emit log_named_address("pool", pool);
                emit log_named_uint("amountIn", amountIn);
            }
        }

        emit log_named_uint("candidates seeded", seeded);
        emit log_named_uint("reserve checks passed", reservePassed);
        emit log_named_uint("quote checks passed", quotePassed);
        emit log_named_uint("failed candidates", failed);

        assertEq(failed, 0, "some balancer seed candidates failed reserve/quote validation");
    }

    function _amountForBaseSymbol(string memory baseSymbol) internal pure returns (uint256) {
        bytes32 h = keccak256(bytes(baseSymbol));
        if (h == keccak256("USDC") || h == keccak256("USDT")) return 100 * 1e6;
        if (h == keccak256("DAI")) return 100 * 1e18;
        if (h == keccak256("WETH")) return 5e16; // 0.05 WETH
        if (h == keccak256("WBTC")) return 100_000; // 0.001 WBTC (8 decimals)
        return 1e18;
    }
}
