// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IUniversalDexInterface.sol";
import "../interfaces/dex/IBalancerVault.sol";
import "./BalancerV2PoolRegistry.sol";

interface IERC20Decimals { 
    function decimals() external view returns (uint8); 
}

contract BalancerV2Fetcher is IUniversalDexInterface {
    IBalancerVault public immutable vault;
    IBalancerV2PoolRegistry public immutable registry;

    constructor(address _vault, address _registry) {
        require(_vault != address(0) && _registry != address(0), "ZERO_ADDR");
        vault = IBalancerVault(_vault);
        registry = IBalancerV2PoolRegistry(_registry);
    }

    function getDexType() external pure returns (string memory) { 
        return "Balancer"; 
    }
    
    function getDexVersion() external pure returns (string memory) { 
        return "V2"; 
    }

    // ========== Existing interface behavior ==========
    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address) {
        (IBalancerV2PoolRegistry.PoolInfo memory p, bool ok) = registry.getPrimary(tokenIn, tokenOut);
        require(ok, "NO_POOLS");
        return p.pool;
    }

    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB) {
        (IBalancerV2PoolRegistry.PoolInfo memory p, bool ok) = registry.getPrimary(tokenA, tokenB);
        require(ok, "NO_POOLS");
        (address[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(p.poolId);

        uint256 idxA = type(uint256).max;
        uint256 idxB = type(uint256).max;
        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenA) idxA = i;
            if (tokens[i] == tokenB) idxB = i;
        }
        require(idxA != type(uint256).max && idxB != type(uint256).max, "TOKEN_NOT_IN_POOL");
        return (balances[idxA], balances[idxB]);
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256) {
        require(amountIn > 0, "AMOUNT_0");
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenIn, tokenOut);
        require(pools.length > 0, "NO_POOLS");

        IAsset[] memory assets = new IAsset[](2);
        assets[0] = IAsset(tokenIn);
        assets[1] = IAsset(tokenOut);

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        uint256 bestOut = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            IBalancerVault.BatchSwapStep[] memory steps = new IBalancerVault.BatchSwapStep[](1);
            steps[0] = IBalancerVault.BatchSwapStep({
                poolId: pools[i].poolId,
                assetInIndex: 0,
                assetOutIndex: 1,
                amount: amountIn,
                userData: ""
            });
            int256[] memory deltas = vault.queryBatchSwap(IBalancerVault.SwapKind.GIVEN_IN, steps, assets, funds);
            if (deltas.length >= 2 && deltas[1] < 0) {
                uint256 outAmt = uint256(-deltas[1]);
                if (outAmt > bestOut) bestOut = outAmt;
            }
        }
        return bestOut; // 0 means no quote
    }

    // ========== Extra helpers (non-breaking) ==========

    /// @notice Returns the pool with the greatest pairwise depth (min(normalized balances))
    function getDeepestPool(address tokenA, address tokenB) external view returns (address pool, bytes32 poolId) {
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenA, tokenB);
        require(pools.length > 0, "NO_POOLS");

        uint256 bestScore = 0;
        for (uint256 i = 0; i < pools.length; i++) {
            (address[] memory tokens, uint256[] memory balances,) = vault.getPoolTokens(pools[i].poolId);

            // find indices
            uint256 idxA = type(uint256).max; 
            uint256 idxB = type(uint256).max;
            for (uint256 j = 0; j < tokens.length; j++) {
                if (tokens[j] == tokenA) idxA = j;
                if (tokens[j] == tokenB) idxB = j;
            }
            if (idxA == type(uint256).max || idxB == type(uint256).max) continue; // skip non-members

            // normalize by decimals → 18 decimals
            uint256 nA = _normalize(balances[idxA], _decimals(tokenA));
            uint256 nB = _normalize(balances[idxB], _decimals(tokenB));

            uint256 score = nA < nB ? nA : nB;
            if (score > bestScore) {
                bestScore = score;
                pool = pools[i].pool;
                poolId = pools[i].poolId;
            }
        }
        require(bestScore > 0, "NO_DEPTH");
    }

    /// @notice Returns (bestOut, pool) using Balancer's own math (queryBatchSwap)
    function getBestPriceAndPool(address tokenIn, address tokenOut, uint256 amountIn)
        external view returns (uint256 bestOut, address pool)
    {
        require(amountIn > 0, "AMOUNT_0");
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(tokenIn, tokenOut);
        require(pools.length > 0, "NO_POOLS");

        IAsset[] memory assets = new IAsset[](2);
        assets[0] = IAsset(tokenIn);
        assets[1] = IAsset(tokenOut);

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this), 
            fromInternalBalance: false,
            recipient: payable(address(this)), 
            toInternalBalance: false
        });

        for (uint256 i = 0; i < pools.length; i++) {
            IBalancerVault.BatchSwapStep[] memory steps = new IBalancerVault.BatchSwapStep[](1);
            steps[0] = IBalancerVault.BatchSwapStep({
                poolId: pools[i].poolId, 
                assetInIndex: 0, 
                assetOutIndex: 1, 
                amount: amountIn, 
                userData: ""
            });
            int256[] memory deltas = vault.queryBatchSwap(IBalancerVault.SwapKind.GIVEN_IN, steps, assets, funds);
            if (deltas.length >= 2 && deltas[1] < 0) {
                uint256 outAmt = uint256(-deltas[1]);
                if (outAmt > bestOut) { 
                    bestOut = outAmt; 
                    pool = pools[i].pool; 
                }
            }
        }
    }

    // ---------- utils ----------
    function _decimals(address token) internal view returns (uint8 d) {
        // default 18 if token doesn't implement decimals()
        (bool ok, bytes memory data) = token.staticcall(abi.encodeWithSelector(IERC20Decimals.decimals.selector));
        d = (ok && data.length >= 32) ? abi.decode(data, (uint8)) : 18;
    }
    
    function _normalize(uint256 amt, uint8 dec) internal pure returns (uint256) {
        // scale to 1e18 with divide-first to avoid overflow
        if (dec == 18) return amt;
        if (dec > 18) return amt / (10 ** (dec - 18));
        return amt * (10 ** (18 - dec));
    }
}
