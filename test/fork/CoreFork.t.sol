// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Fork_Test } from "test/fork/Fork.t.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { Config } from "../../config/Config.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IUniversalDexInterface } from "src/interfaces/IUniversalDexInterface.sol";

import "forge-std/console.sol";

contract CoreForkTest is Fork_Test {
    using SafeERC20 for IERC20;

    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;
    address constant USDT_WHALE = 0x5754284f345afc66a98fbB0a0Afe71e0F007B949;
    address constant WETH_WHALE = 0x8EB8a3b98659Cce290402893d0123abb75E3ab28;
    address constant WBTC_WHALE = 0xBF72Da2Bd84c5170618Fbe5914B0ECA9638d5eb5;

    // Event for tracking individual token results
    event TokenTestResult(string indexed baseToken, string tokenName, address tokenAddress, bool success);

    // Config and token pair addresses
    Config public config;
    address[] public usdcPairAddresses;
    address[] public usdtPairAddresses;
    address[] public wethPairAddresses;
    address[] public wbtcPairAddresses;

    function setUp() public virtual override {
        super.setUp();

        // Initialize config and load all token pair addresses
        console.log("Loading all token pair addresses...");
        config = new Config();
        config.loadAllTokenPairAddresses();

        // Get all addresses in local arrays
        usdcPairAddresses = config.getUSDCPairAddresses();
        usdtPairAddresses = config.getUSDTPairAddresses();
        wethPairAddresses = config.getWETHPairAddresses();
        wbtcPairAddresses = config.getWBTCPairAddresses();

        console.log("Number of USDC addresses loaded:", usdcPairAddresses.length);
        console.log("Number of USDT addresses loaded:", usdtPairAddresses.length);
        console.log("Number of WETH addresses loaded:", wethPairAddresses.length);
        console.log("Number of WBTC addresses loaded:", wbtcPairAddresses.length);
        console.log("Setup complete with all token pairs loaded");
    }

    // ===== UTILITY FUNCTIONS TO ACCESS ADDRESSES =====

    // USDC functions
    function getUSDCPairAddress(uint256 index) public view returns (address) {
        require(index < usdcPairAddresses.length, "Index out of bounds");
        return usdcPairAddresses[index];
    }

    function getUSDCPairAddressesCount() public view returns (uint256) {
        return usdcPairAddresses.length;
    }

    function isUSDCPair(address tokenAddress) public view returns (bool) {
        return config.isUSDCPairAddress(tokenAddress);
    }

    // USDT functions
    function getUSDTPairAddress(uint256 index) public view returns (address) {
        require(index < usdtPairAddresses.length, "Index out of bounds");
        return usdtPairAddresses[index];
    }

    function getUSDTPairAddressesCount() public view returns (uint256) {
        return usdtPairAddresses.length;
    }

    function isUSDTPair(address tokenAddress) public view returns (bool) {
        return config.isUSDTPairAddress(tokenAddress);
    }

    // WETH functions
    function getWETHPairAddress(uint256 index) public view returns (address) {
        require(index < wethPairAddresses.length, "Index out of bounds");
        return wethPairAddresses[index];
    }

    function getWETHPairAddressesCount() public view returns (uint256) {
        return wethPairAddresses.length;
    }

    function isWETHPair(address tokenAddress) public view returns (bool) {
        return config.isWETHPairAddress(tokenAddress);
    }

    // WBTC functions
    function getWBTCPairAddress(uint256 index) public view returns (address) {
        require(index < wbtcPairAddresses.length, "Index out of bounds");
        return wbtcPairAddresses[index];
    }

    function getWBTCPairAddressesCount() public view returns (uint256) {
        return wbtcPairAddresses.length;
    }

    function isWBTCPair(address tokenAddress) public view returns (bool) {
        return config.isWBTCPairAddress(tokenAddress);
    }

    // Global functions
    function getTokenByName(string memory tokenName) public view returns (address) {
        return config.getTokenAddress(tokenName);
    }

    // ===== UTILITY FUNCTIONS FOR TESTING =====

    /**
     * @dev Execute a specific trade using the same logic as test_TradeSpecificPair_forked
     */
    function _executeSpecificTrade(
        address fromToken,
        address toToken,
        uint256 amountIn,
        address whaleAddress
    )
        internal
        returns (bool, string memory)
    {
        require(fromToken != address(0), "From token address is zero");
        require(toToken != address(0), "To token address is zero");
        require(amountIn > 0, "Amount in must be greater than 0");

        vm.startPrank(whaleAddress);
        SafeERC20.forceApprove(IERC20(fromToken), address(core), amountIn);

        try core.placeTrade(abi.encode(fromToken, toToken, amountIn, 0, false, false)) {
            vm.stopPrank();
            return (true, "");
        } catch Error(string memory reason) {
            vm.stopPrank();
            return (false, reason);
        } catch (bytes memory lowLevelData) {
            vm.stopPrank();
            string memory errorMsg = _bytesToString(lowLevelData);
            return (false, errorMsg);
        }
    }

    /**
     * @dev Generic function to test trades for a range of tokens
     */
    function _testTradesForTokenRange(
        string memory tokenSymbol,
        address[] memory pairAddresses,
        address baseToken,
        address whaleAddress,
        uint256 amountIn,
        uint256 startIndex,
        uint256 endIndex
    )
        internal
    {
        uint256 actualEnd = endIndex > pairAddresses.length ? pairAddresses.length : endIndex;
        uint256 testCount = actualEnd - startIndex;

        if (testCount == 0) return;

        uint256 successCount = 0;
        uint256 failureCount = 0;

        for (uint256 i = startIndex; i < actualEnd; i++) {
            address tokenAddress = pairAddresses[i];

            if (tokenAddress != address(0)) {
                // Skip tokens with no liquidity
                if (amountIn == 0) {
                    continue;
                }

                string memory tokenName = config.getTokenName(tokenAddress);
                (bool success, string memory reason) =
                    _executeSpecificTrade(baseToken, tokenAddress, amountIn, whaleAddress);

                emit TokenTestResult(tokenSymbol, tokenName, tokenAddress, success);

                if (success) {
                    successCount++;
                    console.log(string.concat("SUCCESS_TOKEN:", tokenSymbol, ":", tokenName));
                } else {
                    failureCount++;
                    console.log(string.concat("FAILED_TOKEN:", tokenSymbol, ":", tokenName, ":", reason));
                }
            } else {
                failureCount++;
            }
        }

        // Simple console summary
        console.log(string.concat("\n=== SUMMARY for ", tokenSymbol, " ==="));
        console.log(string.concat("Success: ", vm.toString(successCount), " / ", vm.toString(testCount)));
        console.log(string.concat("Failed: ", vm.toString(failureCount), " / ", vm.toString(testCount)));
    }

    /**
     * @dev Test all tokens in chunks of 10 to avoid OutOfGas
     */
    function _testTradesForToken(
        string memory tokenSymbol,
        address[] memory pairAddresses,
        address baseToken,
        address whaleAddress,
        uint256 amountIn
    )
        internal
    {
        uint8 chunkSize = 3;
        uint256 totalPairs = pairAddresses.length;
        uint256 numChunks = (totalPairs + chunkSize - 1) / chunkSize; // Ceiling division

        uint256 totalSuccess = 0;
        uint256 totalFailed = 0;

        console.log(
            string.concat(
                "Testing ", tokenSymbol, " in ", vm.toString(numChunks), " chunks of ", vm.toString(chunkSize)
            )
        );

        for (uint256 chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
            uint256 startIdx = chunkIndex * chunkSize;
            uint256 endIdx = startIdx + chunkSize;
            if (endIdx > totalPairs) endIdx = totalPairs;

            string memory chunkLabel = string.concat(tokenSymbol, "_chunk_", vm.toString(chunkIndex + 1));

            uint256 successCount = 0;
            uint256 failureCount = 0;

            for (uint256 i = startIdx; i < endIdx; i++) {
                address tokenAddress = pairAddresses[i];

                if (tokenAddress != address(0) && amountIn > 0) {
                    (bool success,) = _executeSpecificTrade(baseToken, tokenAddress, amountIn, whaleAddress);

                    if (success) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                } else {
                    failureCount++;
                }
            }

            totalSuccess += successCount;
            totalFailed += failureCount;

            // Log chunk summary
            console.log(string.concat("=== SUMMARY for ", chunkLabel, " ==="));
            console.log(string.concat("Success: ", vm.toString(successCount), " / ", vm.toString(endIdx - startIdx)));
            console.log(string.concat("Failed: ", vm.toString(failureCount), " / ", vm.toString(endIdx - startIdx)));
        }

        // Log total summary
        console.log(string.concat("\n=== TOTAL SUMMARY for ", tokenSymbol, " ==="));
        console.log(string.concat("Success: ", vm.toString(totalSuccess), " / ", vm.toString(totalPairs)));
        console.log(string.concat("Failed: ", vm.toString(totalFailed), " / ", vm.toString(totalPairs)));
    }

    /**
     * @dev Convert bytes to readable string for error messages (simplified)
     */
    function _bytesToString(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "Unknown error";

        // Try to decode as a revert reason (Error(string) selector + string)
        if (data.length >= 4) {
            bytes4 errorSelector = bytes4(data);

            // Error(string) selector is 0x08c379a0
            if (errorSelector == 0x08c379a0 && data.length > 4) {
                // Decode the string from the error data
                (string memory reason) = abi.decode(_slice(data, 4, data.length - 4), (string));
                return reason;
            }

            // Panic(uint256) selector is 0x4e487b71
            if (errorSelector == 0x4e487b71 && data.length >= 36) {
                (uint256 code) = abi.decode(_slice(data, 4, data.length - 4), (uint256));
                return string.concat("Panic: ", vm.toString(code));
            }
        }

        // Simplified: just return generic error instead of hex conversion
        return "Trade execution failed";
    }

    /**
     * @dev Slice bytes array
     */
    function _slice(bytes memory data, uint256 start, uint256 length) internal pure returns (bytes memory) {
        bytes memory result = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = data[start + i];
        }
        return result;
    }

    // ===== TESTS =====

    function test_USDCAddressesLoaded() public view {
        // Verify that addresses are loaded
        assertTrue(usdcPairAddresses.length > 0, "No USDC addresses loaded");
        console.log("Total USDC addresses:", usdcPairAddresses.length);

        // Verify some known tokens (using lowercase names as in JSON)
        address usdc = getTokenByName("usdc");
        address weth = getTokenByName("weth");
        address wbtc = getTokenByName("wbtc");
        address usdt = getTokenByName("usdt");

        assertTrue(usdc != address(0), "USDC not found");
        assertTrue(weth != address(0), "WETH not found");
        assertTrue(wbtc != address(0), "WBTC not found");
        assertTrue(usdt != address(0), "USDT not found");

        console.log("USDC address:", usdc);
        console.log("WETH address:", weth);
        console.log("WBTC address:", wbtc);
        console.log("USDT address:", usdt);

        // Display the first 5 tokens
        console.log("\nFirst 5 tokens:");
        uint256 displayCount = usdcPairAddresses.length > 5 ? 5 : usdcPairAddresses.length;
        for (uint256 i = 0; i < displayCount; i++) {
            address addr = usdcPairAddresses[i];
            string memory name = config.getTokenName(addr);
            console.log("Token", i, ":", name);
            console.log("  Address:", addr);
        }
    }

    // === Main Tests (use env vars START_INDEX and END_INDEX to control range) ===

    function test_PlaceTradeWithUSDCTokens() public {
        address usdc = getTokenByName("usdc");
        uint256 start = 0;
        uint256 end = usdcPairAddresses.length;

        try vm.envUint("START_INDEX") returns (uint256 s) {
            start = s;
        } catch { }
        try vm.envUint("END_INDEX") returns (uint256 e) {
            end = e;
        } catch { }

        _testTradesForTokenRange("USDC", usdcPairAddresses, usdc, USDC_WHALE, formatTokenAmount(usdc, 1000), start, end);
    }

    function test_PlaceTradeWithUSDTTokens() public {
        address usdt = getTokenByName("usdt");
        uint256 start = 0;
        uint256 end = usdtPairAddresses.length;

        try vm.envUint("START_INDEX") returns (uint256 s) {
            start = s;
        } catch { }
        try vm.envUint("END_INDEX") returns (uint256 e) {
            end = e;
        } catch { }

        _testTradesForTokenRange("USDT", usdtPairAddresses, usdt, USDT_WHALE, formatTokenAmount(usdt, 1000), start, end);
    }

    function test_PlaceTradeWithWETHTokens() public {
        address weth = getTokenByName("weth");
        uint256 start = 0;
        uint256 end = wethPairAddresses.length;

        try vm.envUint("START_INDEX") returns (uint256 s) {
            start = s;
        } catch { }
        try vm.envUint("END_INDEX") returns (uint256 e) {
            end = e;
        } catch { }

        _testTradesForTokenRange("WETH", wethPairAddresses, weth, WETH_WHALE, 5 * 10 ** 17, start, end);
    }

    function test_PlaceTradeWithWBTCTokens() public {
        address wbtc = getTokenByName("wbtc");
        uint256 start = 0;
        uint256 end = wbtcPairAddresses.length;

        try vm.envUint("START_INDEX") returns (uint256 s) {
            start = s;
        } catch { }
        try vm.envUint("END_INDEX") returns (uint256 e) {
            end = e;
        } catch { }

        _testTradesForTokenRange("WBTC", wbtcPairAddresses, wbtc, WBTC_WHALE, 1 * 10 ** 6, start, end);
    }

    function test_singleTrade() public {
        address fromToken = getTokenByName("usdt");
        address toToken = getTokenByName("arb");
        uint256 amountIn = formatTokenAmount(fromToken, 1000);
        address whale = USDC_WHALE;
        _executeSpecificTrade(fromToken, toToken, amountIn, whale);
    }

    /**
     * @dev Test a specific trade between two tokens
     * Usage: test_TradeSpecificPair("usdc", "uni", 1000)
     */
    function test_TradeSpecificPair_forked(string memory fromToken, string memory toToken) public {
        fromToken = "weth";
        toToken = "link";
        // readableTokenInAmount = 1_000_000_000;
        address fromAddress = getTokenByName(fromToken);
        address toAddress = getTokenByName(toToken);

        uint256 amountIn = formatTokenAmount(fromAddress, 1);
        console.log("Amount in for token", fromToken, ":", amountIn);

        require(fromAddress != address(0), string.concat("From token not found: ", fromToken));
        require(toAddress != address(0), string.concat("To token not found: ", toToken));

        console.log("=== SPECIFIC PAIR TRADE TEST ===");
        console.log("Trading:", fromToken, "->", toToken);
        console.log("From address:", fromAddress);
        console.log("To address:", toAddress);

        // Determine which whale to use based on fromToken
        address whale = _getWhaleForToken(fromToken);
        // uint256 amountIn = formatTokenAmount(fromAddress, readableTokenInAmount);

        console.log("Amount in:", amountIn);
        console.log("Using whale:", whale);

        // Execute the trade
        (bool success, string memory reason) = _executeSpecificTrade(fromAddress, toAddress, amountIn, whale);

        if (success) {
            console.log("[SUCCESS] Trade executed successfully!");
        } else {
            console.log("[FAILED] Trade failed");
            console.log("Reason:", reason);
        }

        vm.stopPrank();
        console.log("================================");
    }

    /**
     * @dev Get the appropriate whale address for a token
     */
    function _getWhaleForToken(string memory tokenName) internal pure returns (address) {
        if (_compareStrings(tokenName, "usdc")) return USDC_WHALE;
        if (_compareStrings(tokenName, "usdt")) return USDT_WHALE;
        if (_compareStrings(tokenName, "weth")) return WETH_WHALE;
        if (_compareStrings(tokenName, "wbtc")) return WBTC_WHALE;

        // For other tokens, default to USDC whale
        return USDC_WHALE;
    }

    /**
     * @dev Compare two strings
     */
    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    function getAggreateTokenInAmount(
        address tokenIn,
        address tokenOut
    )
        public
        view
        returns (uint256 aggregateTokenInAmount)
    {
        for (uint256 i = 0; i < dexes.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexes[i]);
            try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveTokenIn, uint256) {
                aggregateTokenInAmount += reserveTokenIn;
            } catch Error(string memory reason) {
                console.log("Error:", reason);
                continue;
            } catch Panic(uint256 errorCode) {
                console.log("Panic error code:", errorCode);
                continue;
            }
        }
    }
}
