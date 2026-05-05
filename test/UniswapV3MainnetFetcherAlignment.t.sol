// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../script/addresses/MainnetAddresses.sol";
import "../src/interfaces/IUniversalDexInterface.sol";
import "../src/interfaces/IUniswapV3Fetcher.sol";
import "../src/interfaces/IRegistry.sol";
import "../src/Registry.sol";

/**
 * @title Regression: deployed UniswapV3Fetcher must match Registry/Core execution path.
 * @dev Run: `forge test --match-contract UniswapV3MainnetFetcherAlignment -vv --fork-url $MAINNET_RPC_URL`
 *      Skip (e.g. local CI without fork): `SKIP_MAINNET_ALIGNMENT=1 forge test ...`
 * @dev See `docs/PRODUCTION_FIX_V3.md` if this fails on fee500 fetcher (bad getQuote bytecode).
 */
contract UniswapV3MainnetFetcherAlignment is Test {
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    function setUp() public {
        // Local CI without RPC: SKIP_MAINNET_ALIGNMENT=1 forge test ...
        if (vm.envOr("SKIP_MAINNET_ALIGNMENT", uint256(0)) != 0) {
            vm.skip(true);
        }
    }

    function _getPool(address a, address b, uint24 fee) internal view returns (address) {
        (address t0, address t1) = a < b ? (a, b) : (b, a);
        (bool ok, bytes memory data) =
            V3_FACTORY.staticcall(abi.encodeWithSignature("getPool(address,address,uint24)", t0, t1, fee));
        require(ok, "factory staticcall failed");
        return abi.decode(data, (address));
    }

    /// @dev Uses low-level `call` + length guard: malformed deploys return 96 bytes `(uint256,uint256,address)`-shaped
    ///      data that **reverts Solidity's ABI decoder** for `(uint256,bytes)` (see docs/PRODUCTION_FIX_V3.md).
    function _assertQuoteMatchesFee(address fetcher, uint24 expectedFee, string memory label) internal {
        uint256 amountIn = 1e18;

        (bool callOk, bytes memory ret) = address(fetcher).call(
            abi.encodeWithSelector(IUniversalDexInterface.getQuote.selector, WETH, USDC, amountIn)
        );
        assertTrue(callOk, string.concat(label, ": getQuote call reverted"));

        // Min size for (uint256, bytes) when `bytes` is abi.encode(uint24,address) — 64 bytes payload + ABI head/tail.
        assertGe(
            ret.length,
            160,
            string.concat(
                label,
                ": getQuote return not valid ABI for (uint256,bytes); redeploy fetcher from src/adapters/UniswapV3Fetcher.sol. See docs/PRODUCTION_FIX_V3.md"
            )
        );

        (uint256 amountOut, bytes memory aux) = abi.decode(ret, (uint256, bytes));
        assertGt(amountOut, 0, string.concat(label, ": quoted amount out"));
        assertGe(aux.length, 64, string.concat(label, ": aux too short"));

        (uint24 feeInAux, address poolInAux) = abi.decode(aux, (uint24, address));
        assertEq(feeInAux, expectedFee, string.concat(label, ": aux fee must match this fetcher's tier"));

        address poolFromFactory = _getPool(WETH, USDC, feeInAux);
        assertEq(poolInAux, poolFromFactory, string.concat(label, ": aux pool must match factory for aux fee"));

        // Use **repo** Registry (8-arg + quoteAux); pinned mainnet Registry may still be the old ABI.
        Registry reg = new Registry();
        reg.setRouter("UniswapV3", UNISWAP_V3_ROUTER);
        IRegistry.TradeData memory td =
            reg.prepareTradeData(fetcher, WETH, USDC, amountIn, 1, address(this), aux);
        assertTrue(td.params.length > 0, string.concat(label, ": prepareTradeData params"));
        (, , , , , uint24 encodedFee, , ) =
            abi.decode(td.params, (address, address, uint256, uint256, address, uint24, uint160, address));
        assertEq(encodedFee, feeInAux, string.concat(label, ": Registry must encode fee from quoteAux"));
    }

    function test_mainnetV3Fetcher_500_quoteRegistryAligned() public {
        vm.chainId(MainnetAddresses.CHAIN_ID);
        _assertQuoteMatchesFee(MainnetAddresses.UNISWAP_V3_FETCHER_500, 500, "UNISWAP_V3_FETCHER_500");
    }

    function test_mainnetV3Fetcher_3000_quoteRegistryAligned() public {
        vm.chainId(MainnetAddresses.CHAIN_ID);
        _assertQuoteMatchesFee(MainnetAddresses.UNISWAP_V3_FETCHER_3000, 3000, "UNISWAP_V3_FETCHER_3000");
    }

    function test_mainnetV3Fetcher_10000_quoteRegistryAligned() public {
        vm.chainId(MainnetAddresses.CHAIN_ID);
        _assertQuoteMatchesFee(MainnetAddresses.UNISWAP_V3_FETCHER_10000, 10000, "UNISWAP_V3_FETCHER_10000");
    }
}
