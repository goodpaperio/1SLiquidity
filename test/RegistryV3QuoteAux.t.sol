// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Registry.sol";
import "../src/interfaces/IRegistry.sol";
import "../src/interfaces/IUniswapV3Fetcher.sol";
import "../src/interfaces/IUniversalDexInterface.sol";

/// @notice Ensures Registry uses `getQuote` aux fee (when valid) instead of only `fee()`.
contract RegistryV3QuoteAuxTest is Test {
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    /// @dev fee() says 500 but aux carries 3000 + real 0.3% pool — Registry must encode 3000.
    function test_registry_prefersValidQuoteAuxOverFee() public {
        vm.createSelectFork(vm.envOr("MAINNET_RPC_URL", string("https://ethereum.publicnode.com")));

        (address t0, address t1) = WETH < USDC ? (WETH, USDC) : (USDC, WETH);
        address pool3000 = IUniswapV3FactoryStub(V3_FACTORY).getPool(t0, t1, 3000);
        assertTrue(pool3000 != address(0));

        MockV3Fetcher f = new MockV3Fetcher(V3_FACTORY, 500, 3000, pool3000);

        Registry reg = new Registry();
        reg.setRouter("UniswapV3", UNISWAP_V3_ROUTER);

        bytes memory aux = abi.encode(uint24(3000), pool3000);
        IRegistry.TradeData memory td =
            reg.prepareTradeData(address(f), WETH, USDC, 1 ether, 1, address(this), aux);

        (, , , , , uint24 encodedFee, , ) =
            abi.decode(td.params, (address, address, uint256, uint256, address, uint24, uint160, address));
        assertEq(encodedFee, 3000);
    }

    /// @dev Empty aux falls back to fee().
    function test_registry_emptyAuxUsesFee() public {
        MockV3Fetcher f = new MockV3Fetcher(V3_FACTORY, 3000, 3000, address(0x1234));

        Registry reg = new Registry();
        reg.setRouter("UniswapV3", UNISWAP_V3_ROUTER);

        IRegistry.TradeData memory td =
            reg.prepareTradeData(address(f), WETH, USDC, 1 ether, 1, address(this), hex"");

        (, , , , , uint24 encodedFee, , ) =
            abi.decode(td.params, (address, address, uint256, uint256, address, uint24, uint160, address));
        assertEq(encodedFee, 3000);
    }
}

interface IUniswapV3FactoryStub {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

contract MockV3Fetcher is IUniswapV3Fetcher {
    address public immutable factoryAddr;
    uint24 public fee;
    uint24 internal quoteFee;
    address internal quotePool;

    constructor(address _factory, uint24 _fee, uint24 _quoteFee, address _quotePool) {
        factoryAddr = _factory;
        fee = _fee;
        quoteFee = _quoteFee;
        quotePool = _quotePool;
    }

    function factory() external view returns (address) {
        return factoryAddr;
    }

    function getDexType() external pure returns (string memory) {
        return "UniswapV3";
    }

    function getDexVersion() external pure returns (string memory) {
        return "3";
    }

    function getReserves(address, address) external pure returns (uint256, uint256) {
        return (0, 0);
    }

    function getPoolAddress(address, address) external view returns (address) {
        return quotePool;
    }

    function getPrice(address, address, uint256) external pure returns (uint256) {
        return 0;
    }

    function getQuote(address, address, uint256) external returns (uint256, bytes memory) {
        return (1 ether, abi.encode(quoteFee, quotePool));
    }
}
