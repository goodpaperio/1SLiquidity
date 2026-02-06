// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title IRegistry
 * @notice Interface for the DEX registry that prepares trade data for different DEXs
 */
interface IRegistry {
    /**
     * @notice Structure containing all necessary data to execute a trade on any DEX
     * @param selector The function selector to call on the executor
     * @param router The DEX router address
     * @param params Encoded parameters specific to the DEX
     */
    struct TradeData {
        bytes4 selector;
        address router;
        bytes params;
    }

    /**
     * @notice Prepares trade data for a specific DEX
     * @param dex The DEX address (fetcher) from StreamDaemon
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amount Amount of input tokens
     * @param minOut Minimum output amount
     * @param recipient Address to receive output tokens
     * @return Trade data containing selector, router, and encoded parameters
     */
    function prepareTradeData(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient
    ) external view returns (TradeData memory);
}
