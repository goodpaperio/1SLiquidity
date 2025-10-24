// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IUniversalDexInterface.sol";
import "../interfaces/dex/ICurveMetaRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CurveMetaFetcher
 * @dev Dynamic Curve pool discovery and pricing using MetaRegistry
 * @notice Uses Curve's MetaRegistry for pool discovery and accurate pricing
 */
contract CurveMetaFetcher is IUniversalDexInterface {
    ICurveMetaRegistry public immutable metaRegistry;
    
    // Curve MetaRegistry address on mainnet
    address constant CURVE_META_REGISTRY = 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC;

    constructor(address _metaRegistry) {
        require(_metaRegistry != address(0), "meta=0");
        metaRegistry = ICurveMetaRegistry(_metaRegistry);
    }

    function getDexType() external pure returns (string memory) { 
        return "CurveMeta"; 
    }
    
    function getDexVersion() external pure returns (string memory) { 
        return "MetaRegistry"; 
    }

    // ============== Core interface ==============

    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address) {
        (address pool,,,) = _bestPoolByDepth(tokenIn, tokenOut);
        return pool;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address pool, int128 i, int128 j, bool isUnderlying) = _bestPoolByDepth(tokenA, tokenB);
        if (pool == address(0)) return (0, 0);

        if (isUnderlying) {
            // try meta, else base-pool direct
            try metaRegistry.get_underlying_balances(pool) returns (uint256[8] memory u) {
                return (u[uint256(int256(i))], u[uint256(int256(j))]);
            } catch {
                (uint256 A, uint256 B, bool okU) = _getDirectUnderlyingReserves(pool, i, j);
                if (okU) return (A, B);
                return (0, 0);
            }
        } else {
            try metaRegistry.get_balances(pool) returns (uint256[8] memory b) {
                return (b[uint256(int256(i))], b[uint256(int256(j))]);
            } catch {
                (uint256 A, uint256 B, bool ok) = _getDirectPoolReservesWrapped(pool, i, j);
                if (ok) return (A, B);
                return (0, 0);
            }
        }
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256) {
        require(amountIn > 0, "amountIn=0");

        try metaRegistry.find_pools_for_coins(tokenIn, tokenOut) returns (address[] memory pools) {
            if (pools.length == 0) return 0;

            uint256 bestOut = 0;
            for (uint256 p = 0; p < pools.length; p++) {
                address pool = pools[p];
                if (pool == address(0)) continue;

                try metaRegistry.get_coin_indices(pool, tokenIn, tokenOut) returns (int128 i, int128 j, bool isUnderlying) {
                    if (i < 0 || j < 0) continue;

                    uint256 outAmt = _tryQuote(pool, i, j, amountIn, isUnderlying);
                    if (outAmt > bestOut) bestOut = outAmt;
                } catch {
                    continue;
                }
            }
            return bestOut;
        } catch {
            return 0;
        }
    }

    // ============== Internals ==============

    /**
     * @dev Pick pool with the highest pairwise depth = min(reserve[i], reserve[j]) for this exact pair
     */
    function _bestPoolByDepth(address tokenA, address tokenB)
        internal
        view
        returns (address pool, int128 i, int128 j, bool isUnderlying)
    {
        try metaRegistry.find_pools_for_coins(tokenA, tokenB) returns (address[] memory pools) {
            if (pools.length == 0) return (address(0), 0, 0, false);

            uint256 bestScore = 0;
            for (uint256 p = 0; p < pools.length; p++) {
                address candidate = pools[p];
                if (candidate == address(0)) continue;

                // Try to get coin indices from MetaRegistry first
                bool gotIndices = false;
                int128 _i = 0;
                int128 _j = 0;
                bool u = false;
                
                try metaRegistry.get_coin_indices(candidate, tokenA, tokenB) returns (int128 __i, int128 __j, bool _u) {
                    _i = __i;
                    _j = __j;
                    u = _u;
                    gotIndices = true;
                } catch {
                    // Fallback: try to determine indices by calling coins() directly
                    (_i, _j, u) = _getDirectCoinIndices(candidate, tokenA, tokenB);
                    if (_i >= 0 && _j >= 0) {
                        gotIndices = true;
                    }
                }

                if (!gotIndices || _i < 0 || _j < 0) continue;

                // Try to get reserves to calculate depth score
                uint256 score = 0;
                bool gotScore = false;
                
                // Prefer MetaRegistry (when it works)
                if (u) {
                    try metaRegistry.get_underlying_balances(candidate) returns (uint256[8] memory uBalances) {
                        uint256 A = uBalances[uint256(int256(_i))];
                        uint256 B = uBalances[uint256(int256(_j))];
                        if (A > 0 && B > 0) { 
                            score = _minNorm(tokenA, A, tokenB, B); 
                            gotScore = true; 
                        }
                    } catch { }
                } else {
                    try metaRegistry.get_balances(candidate) returns (uint256[8] memory balances) {
                        uint256 A = balances[uint256(int256(_i))];
                        uint256 B = balances[uint256(int256(_j))];
                        if (A > 0 && B > 0) { 
                            score = _minNorm(tokenA, A, tokenB, B); 
                            gotScore = true; 
                        }
                    } catch { }
                }

                // Fallback to direct pool queries
                if (!gotScore) {
                    uint256 A;
                    uint256 B;
                    bool okRes;
                    
                    if (u) {
                        (A, B, okRes) = _getDirectUnderlyingReserves(candidate, _i, _j);
                    } else {
                        (A, B, okRes) = _getDirectPoolReservesWrapped(candidate, _i, _j);
                    }
                    
                    if (okRes && A > 0 && B > 0) {
                        score = _minNorm(tokenA, A, tokenB, B);
                        gotScore = true;
                    }
                }

                if (gotScore && score > bestScore) {
                    bestScore = score;
                    pool = candidate;
                    i = _i;
                    j = _j;
                    isUnderlying = u;
                }
            }
            return (pool, i, j, isUnderlying);
        } catch {
            return (address(0), 0, 0, false);
        }
    }


    // Direct reserves for wrapped coins (non-underlying) — prefer balances(idx), fallback to ERC20.balanceOf(pool)
    function _getDirectPoolReservesWrapped(address pool, int128 i, int128 j) internal view returns (uint256 reserveA, uint256 reserveB, bool ok) {
        uint256 iu = uint256(int256(i));
        uint256 ju = uint256(int256(j));

        // Try pool.balances first (most accurate)
        (bool okA, uint256 bA) = _tryPoolBalance(pool, iu);
        (bool okB, uint256 bB) = _tryPoolBalance(pool, ju);
        if (okA && okB) return (bA, bB, true);

        // Fallback: ERC20.balanceOf(pool)
        (bool cOkA, bytes memory cDataA) = pool.staticcall(abi.encodeWithSignature("coins(uint256)", iu));
        if (!cOkA || cDataA.length < 32) return (0,0,false);
        address coinA = abi.decode(cDataA, (address));

        (bool cOkB, bytes memory cDataB) = pool.staticcall(abi.encodeWithSignature("coins(uint256)", ju));
        if (!cOkB || cDataB.length < 32) return (0,0,false);
        address coinB = abi.decode(cDataB, (address));

        (bool balOkA, bytes memory balA) = coinA.staticcall(abi.encodeWithSignature("balanceOf(address)", pool));
        (bool balOkB, bytes memory balB) = coinB.staticcall(abi.encodeWithSignature("balanceOf(address)", pool));
        if (!balOkA || !balOkB || balA.length < 32 || balB.length < 32) return (0,0,false);

        return (abi.decode(balA,(uint256)), abi.decode(balB,(uint256)), true);
    }

    // Direct reserves for underlying (metapools) — read on the base pool
    function _getDirectUnderlyingReserves(address metaPool, int128 i, int128 j) internal view returns (uint256 reserveA, uint256 reserveB, bool ok) {
        address base = _getBasePool(metaPool);
        if (base == address(0)) return (0,0,false);

        // i,j are indices into underlying coins; we need those coin addresses to map to base pool indices.
        address[8] memory uCoins;
        uint256 found = 0;
        for (uint256 idx = 0; idx < 8; idx++) {
            (bool okU, address c) = _tryUnderlyingCoins(metaPool, idx);
            if (!okU || c == address(0)) break;
            uCoins[idx] = c; 
            found++;
        }
        if (found == 0) return (0,0,false);

        address tokenA = uCoins[uint256(int256(i))];
        address tokenB = uCoins[uint256(int256(j))];
        if (tokenA == address(0) || tokenB == address(0)) return (0,0,false);

        // Try base.balances(idx) after mapping indices in base pool
        int128 bi = -1; 
        int128 bj = -1;
        for (uint256 idx = 0; idx < 8; idx++) {
            (bool okC, address c) = _tryCoins(base, idx);
            if (!okC || c == address(0)) break;
            if (c == tokenA) bi = int128(int256(idx));
            if (c == tokenB) bj = int128(int256(idx));
        }
        if (bi < 0 || bj < 0) return (0,0,false);

        (bool okAi, uint256 bAi) = _tryPoolBalance(base, uint256(uint128(bi)));
        (bool okBj, uint256 bBj) = _tryPoolBalance(base, uint256(uint128(bj)));
        if (okAi && okBj) return (bAi, bBj, true);

        // Fallback: ERC20.balanceOf(base)
        (bool ebA, bytes memory ebdA) = tokenA.staticcall(abi.encodeWithSignature("balanceOf(address)", base));
        (bool ebB, bytes memory ebdB) = tokenB.staticcall(abi.encodeWithSignature("balanceOf(address)", base));
        if (!ebA || !ebB || ebdA.length < 32 || ebdB.length < 32) return (0,0,false);
        return (abi.decode(ebdA,(uint256)), abi.decode(ebdB,(uint256)), true);
    }

    // Decimal normalization helpers
    function _decimals(address t) internal view returns (uint8 d) {
        (bool ok, bytes memory data) = t.staticcall(abi.encodeWithSignature("decimals()"));
        d = (ok && data.length >= 32) ? abi.decode(data,(uint8)) : 18;
    }
    
    function _scaleTo1e18(uint256 amt, uint8 dec) internal pure returns (uint256) {
        if (dec == 18) return amt;
        if (dec > 18) return amt / 10**(dec - 18);
        return amt * 10**(18 - dec);
    }
    
    function _minNorm(address a, uint256 A, address b, uint256 B) internal view returns (uint256) {
        uint256 An = _scaleTo1e18(A, _decimals(a));
        uint256 Bn = _scaleTo1e18(B, _decimals(b));
        return An < Bn ? An : Bn;
    }

    // Generic coin readers (coins / underlying_coins; uint256 and int128)
    function _tryCoins(address pool, uint256 idx) internal view returns (bool ok, address coin) {
        // coins(uint256)
        bytes memory data;
        (ok, data) = pool.staticcall(abi.encodeWithSignature("coins(uint256)", idx));
        if (ok && data.length >= 32) { 
            coin = abi.decode(data, (address)); 
            return (true, coin); 
        }
        // coins(int128)
        (ok, data) = pool.staticcall(abi.encodeWithSignature("coins(int128)", int128(int256(idx))));
        if (ok && data.length >= 32) { 
            coin = abi.decode(data, (address)); 
            return (true, coin); 
        }
    }

    function _tryUnderlyingCoins(address pool, uint256 idx) internal view returns (bool ok, address coin) {
        // underlying_coins(uint256)
        bytes memory data;
        (ok, data) = pool.staticcall(abi.encodeWithSignature("underlying_coins(uint256)", idx));
        if (ok && data.length >= 32) { 
            coin = abi.decode(data, (address)); 
            return (true, coin); 
        }
        // underlying_coins(int128)
        (ok, data) = pool.staticcall(abi.encodeWithSignature("underlying_coins(int128)", int128(int256(idx))));
        if (ok && data.length >= 32) { 
            coin = abi.decode(data, (address)); 
            return (true, coin); 
        }
    }

    // Generic balance readers (balances; uint256 and int128)
    function _tryPoolBalance(address pool, uint256 idx) internal view returns (bool ok, uint256 bal) {
        // balances(uint256)
        bytes memory data;
        (ok, data) = pool.staticcall(abi.encodeWithSignature("balances(uint256)", idx));
        if (ok && data.length >= 32) { 
            bal = abi.decode(data, (uint256)); 
            return (true, bal); 
        }
        // balances(int128)
        (ok, data) = pool.staticcall(abi.encodeWithSignature("balances(int128)", int128(int256(idx))));
        if (ok && data.length >= 32) { 
            bal = abi.decode(data, (uint256)); 
            return (true, bal); 
        }
    }

    // Base pool discovery for metapools
    function _getBasePool(address pool) internal view returns (address base) {
        // base_pool() on metapools
        bytes memory data;
        bool ok;
        (ok, data) = pool.staticcall(abi.encodeWithSignature("base_pool()"));
        if (ok && data.length >= 32) {
            base = abi.decode(data, (address));
        }
    }

    // Improved index discovery (tries coins, then underlying_coins)
    function _getDirectCoinIndices(address pool, address tokenA, address tokenB) internal view returns (int128 i, int128 j, bool isUnderlying) {
        i = -1; 
        j = -1; 
        isUnderlying = false;

        // First try direct coins
        for (uint256 idx = 0; idx < 8; idx++) {
            (bool ok, address c) = _tryCoins(pool, idx);
            if (!ok) break;
            if (c == address(0)) break;
            if (c == tokenA) i = int128(int256(idx));
            if (c == tokenB) j = int128(int256(idx));
        }
        if (i >= 0 && j >= 0) return (i, j, false);

        // Then try underlying coins (metapools)
        for (uint256 idx = 0; idx < 8; idx++) {
            (bool ok, address c) = _tryUnderlyingCoins(pool, idx);
            if (!ok) break;
            if (c == address(0)) break;
            if (c == tokenA) i = int128(int256(idx));
            if (c == tokenB) j = int128(int256(idx));
        }
        if (i >= 0 && j >= 0) return (i, j, true);

        return (-1, -1, false);
    }

    function _pairReserves(uint256[8] memory arr, int128 i, int128 j)
        private pure returns (uint256 A, uint256 B)
    {
        A = arr[uint256(int256(i))];
        B = arr[uint256(int256(j))];
    }

    /**
     * @dev Robust quote across Curve pool variants
     * Tries get_dy_underlying, then get_dy(int128), then get_dy(uint256)
     */
    function _tryQuote(address pool, int128 i, int128 j, uint256 dx, bool isUnderlying)
        private view returns (uint256 outAmt)
    {
        bytes memory callData;

        // 1) Prefer underlying if available
        if (isUnderlying) {
            callData = abi.encodeWithSignature("get_dy_underlying(int128,int128,uint256)", i, j, dx);
            (bool ok, bytes memory ret) = pool.staticcall(callData);
            if (ok && ret.length >= 32) return abi.decode(ret, (uint256));
        }

        // 2) Try int128 variant
        callData = abi.encodeWithSignature("get_dy(int128,int128,uint256)", i, j, dx);
        (bool ok1, bytes memory ret1) = pool.staticcall(callData);
        if (ok1 && ret1.length >= 32) return abi.decode(ret1, (uint256));

        // 3) Try uint256 variant (crypto pools)
        callData = abi.encodeWithSignature("get_dy(uint256,uint256,uint256)", uint256(uint128(i)), uint256(uint128(j)), dx);
        (bool ok2, bytes memory ret2) = pool.staticcall(callData);
        if (ok2 && ret2.length >= 32) return abi.decode(ret2, (uint256));

        return 0;
    }
}
