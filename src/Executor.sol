// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// import {StreamDaemon} from "./StreamDaemon.sol";
// let's rather use safeApprove from openzeppelin
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/dex/IUniswapV2Router.sol";
import "./interfaces/dex/IUniswapV3Router.sol";
import "./interfaces/dex/IBalancerVault.sol";
import "./interfaces/dex/ICurvePool.sol";
import "./interfaces/dex/ICurveMetaRegistry.sol";
import "./interfaces/dex/IOneInchV5Router.sol";
import "./adapters/BalancerV2Fetcher.sol";
import "forge-std/console.sol";

contract Executor {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error SwapFailed();

    event TradeExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    function executeUniswapV2Trade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters
        (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient, address router) =
            abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            recipient,
            block.timestamp + 300 // @audit standardize deadline across all DEXes
        );

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amounts[amounts.length - 1]); // @audit consider adding more
            // event data
        return amounts[amounts.length - 1];
    }

    function executeUniswapV3Trade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            uint24 fee,
            uint160 sqrtPriceLimitX96,
            address router
        ) = abi.decode(params, (address, address, uint256, uint256, address, uint24, uint160, address));

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).forceApprove(router, amountIn);

        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient, // @audit verify recipient is not zero address
            deadline: block.timestamp + 300, // @audit standardize deadline across all DEXes
            amountIn: amountIn,
            amountOutMinimum: amountOutMin, // @audit consider minimum slippage threshold
            sqrtPriceLimitX96: sqrtPriceLimitX96 // @audit document impact of this parameter
        });

        uint256 amountOut = IUniswapV3Router(router).exactInputSingle(swapParams);

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut); // @audit consider adding more event data
            // (recipient, fee)
        return amountOut;
    }

    function executeBalancerTrade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters - router is actually the fetcher address
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient, // @audit verify recipient is not zero address
            address fetcherAddress
        ) = abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        // Get the BalancerV2Fetcher to find the best pool
        BalancerV2Fetcher fetcher = BalancerV2Fetcher(fetcherAddress);
        
        // Use deepest reserves by default (not price-based selection)
        // The StreamDaemon should select the appropriate DEX based on usePriceBased flag
        (address deepestPool, bytes32 poolId) = fetcher.getDeepestPool(tokenIn, tokenOut);
        require(deepestPool != address(0), "No valid pool found");
        address balancerVault = address(fetcher.vault());

        IERC20(tokenIn).forceApprove(balancerVault, amountIn);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: 0, // GIVEN_IN @audit check if this is the correct kind
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: amountIn,
            userData: "" // @audit document what userData could be used for
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this), // Use this contract (Core via delegatecall) as sender since it owns the tokens
            fromInternalBalance: false,
            recipient: recipient,
            toInternalBalance: false
        });

        // Execute the swap and get the exact amount returned by Balancer Vault
        uint256 amountOut = IBalancerVault(balancerVault).swap(singleSwap, funds, amountOutMin, block.timestamp + 300);

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut); // @audit consider adding more event data
        return amountOut;
    }

    function executeCurveTrade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters - Registry now encodes 8 parameters including tokenOut
        (
            address tokenIn,
            address tokenOut,
            int128 i,
            int128 j,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient, // @audit verify recipient is not zero address
            address router
        ) = abi.decode(params, (address, address, int128, int128, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        console.log("Executor: Starting Curve trade");
        console.log("tokenIn:", tokenIn);
        console.log("tokenOut:", tokenOut);
        console.log("amountIn:", amountIn);
        console.log("amountOutMin:", amountOutMin);
        console.log("recipient:", recipient);
        console.log("router:", router);

        // Approve the token being traded, not the pool
        IERC20(tokenIn).forceApprove(router, amountIn); // @audit should we reset approval to 0 first?

        // Get initial balance of output token to calculate difference
        uint256 initialBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Initial balance of tokenOut:", initialBalance);

        // Execute the Curve exchange using low-level call to handle reverts
        // Some Curve pools revert after successful execution, so we need to check balances
        (bool success,) =
            router.call(abi.encodeWithSelector(ICurvePool.exchange.selector, i, j, amountIn, amountOutMin));

        // Don't check success - Curve pools can revert after successful execution
        // We'll verify success by checking if tokens were actually transferred

        // Check final balance to get actual amount received
        uint256 finalBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Final balance of tokenOut:", finalBalance);

        uint256 actualAmountOut = finalBalance - initialBalance;
        console.log("Actual amount out calculated:", actualAmountOut);

        // Validate that tokens were actually transferred
        require(actualAmountOut > 0, "No tokens received from Curve exchange");
        console.log("Passed first require check");

        require(actualAmountOut >= amountOutMin, "Insufficient output amount");
        console.log("Passed second require check");

        // @audit consider additional validation on amountOut
        emit TradeExecuted(tokenIn, tokenOut, amountIn, actualAmountOut); // @audit consider adding more event data
        console.log("TradeExecuted event emitted, returning:", actualAmountOut);
        return actualAmountOut;
    }

    function executeCurveMetaTrade(
        bytes memory params
    ) external returns (uint256) {
        // Decode parameters for CurveMeta (no hardcoded indices)
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            address router
        ) = abi.decode(params, (address, address, uint256, uint256, address, address));

        if (amountIn == 0) revert ZeroAmount();

        console.log("Executor: Starting CurveMeta trade");
        console.log("tokenIn:", tokenIn);
        console.log("tokenOut:", tokenOut);
        console.log("amountIn:", amountIn);
        console.log("amountOutMin:", amountOutMin);
        console.log("recipient:", recipient);
        console.log("router:", router);

        // Get the CurveMetaFetcher to find the best pool and indices
        // The router should be the CurveMetaFetcher address
        ICurveMetaRegistry metaRegistry = ICurveMetaRegistry(0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC);
        
        // Find the best pool for this token pair
        address[] memory pools = metaRegistry.find_pools_for_coins(tokenIn, tokenOut);
        require(pools.length > 0, "No Curve pools found for token pair");
        
        address bestPool = address(0);
        int128 bestI = 0;
        int128 bestJ = 0;
        bool bestIsUnderlying = false;
        uint256 bestScore = 0;
        
        // Find the pool with the highest depth (min of the two reserves)
        for (uint256 p = 0; p < pools.length; p++) {
            address pool = pools[p];
            if (pool == address(0)) continue;
            
            (int128 i, int128 j, bool isUnderlying) = metaRegistry.get_coin_indices(pool, tokenIn, tokenOut);
            if (i < 0 || j < 0) continue;
            
            // Calculate depth score
            uint256[8] memory balances = isUnderlying 
                ? metaRegistry.get_underlying_balances(pool)
                : metaRegistry.get_balances(pool);
            
            uint256 reserveA = balances[uint256(int256(i))];
            uint256 reserveB = balances[uint256(int256(j))];
            uint256 score = reserveA < reserveB ? reserveA : reserveB;
            
            if (score > bestScore) {
                bestScore = score;
                bestPool = pool;
                bestI = i;
                bestJ = j;
                bestIsUnderlying = isUnderlying;
            }
        }
        
        require(bestPool != address(0), "No suitable Curve pool found");
        console.log("Selected pool:", bestPool);
        console.log("Coin indices:", uint256(int256(bestI)), uint256(int256(bestJ)));
        console.log("Is underlying:", bestIsUnderlying);

        // Approve the token being traded
        IERC20(tokenIn).forceApprove(bestPool, amountIn);

        // Get initial balance of output token to calculate difference
        uint256 initialBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Initial balance of tokenOut:", initialBalance);

        // Execute the Curve exchange
        // Use exchange_underlying if it's an underlying token trade
        bool success;
        if (bestIsUnderlying) {
            (success,) = bestPool.call(abi.encodeWithSignature(
                "exchange_underlying(int128,int128,uint256,uint256)",
                bestI, bestJ, amountIn, amountOutMin
            ));
        } else {
            (success,) = bestPool.call(abi.encodeWithSignature(
                "exchange(int128,int128,uint256,uint256)",
                bestI, bestJ, amountIn, amountOutMin
            ));
        }

        // Check final balance to get actual amount received
        uint256 finalBalance = IERC20(tokenOut).balanceOf(address(this));
        console.log("Final balance of tokenOut:", finalBalance);

        uint256 actualAmountOut = finalBalance - initialBalance;
        console.log("Actual amount out calculated:", actualAmountOut);

        // Validate that tokens were actually transferred
        require(actualAmountOut > 0, "No tokens received from Curve exchange");
        require(actualAmountOut >= amountOutMin, "Insufficient output amount");

        emit TradeExecuted(tokenIn, tokenOut, amountIn, actualAmountOut);
        console.log("TradeExecuted event emitted, returning:", actualAmountOut);
        return actualAmountOut;
    }

    function executeOneInchTrade(
        bytes memory params // @audit consider adding validation for params length
    ) external returns (uint256) {
        // Decode all parameters - now including 1inch-specific data
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            address recipient,
            address router,
            address executor,
            bytes memory swapData
        ) = abi.decode(params, (address, address, uint256, uint256, address, address, address, bytes));

        if (amountIn == 0) revert ZeroAmount();

        // Approve the token being traded to the 1inch router
        IERC20(tokenIn).forceApprove(router, amountIn);

        // Get initial balance of output token to calculate difference
        uint256 initialBalance = IERC20(tokenOut).balanceOf(address(this));

        // Prepare 1inch swap description
        IOneInchV5Router.SwapDescription memory desc = IOneInchV5Router.SwapDescription({
            srcToken: tokenIn,
            dstToken: tokenOut,
            srcReceiver: address(this), // This contract receives the source tokens
            dstReceiver: recipient, // Recipient receives the output tokens
            amount: amountIn,
            minReturnAmount: amountOutMin,
            flags: 0 // Default flags
        });

        // Execute the 1inch swap
        // Note: In a real implementation, the swapData would come from the 1inch API
        // For testing purposes, we'll use a simplified approach
        try IOneInchV5Router(router).swap(
            executor, // 1inch executor address (would come from API)
            desc, // Swap description
            "", // No permit data
            swapData // Encoded swap data (would come from 1inch API)
        ) returns (uint256 returnAmount, uint256 spentAmount) {
            // Check that we received the expected amount
            require(returnAmount >= amountOutMin, "Insufficient output amount");

            emit TradeExecuted(tokenIn, tokenOut, spentAmount, returnAmount);
            return returnAmount;
        } catch {
            // Fallback: If 1inch swap fails, we can't proceed
            revert("OneInch swap failed - invalid executor or swap data");
        }
    }
}
