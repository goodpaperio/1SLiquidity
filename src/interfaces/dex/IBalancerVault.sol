// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IAsset { }

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        uint8 kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }

    struct BatchSwapStep {
        bytes32 poolId;
        uint256 assetInIndex;
        uint256 assetOutIndex;
        uint256 amount;
        bytes userData;
    }

    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address recipient;
        bool toInternalBalance;
    }

    function swap(SingleSwap memory singleSwap, FundManagement memory funds, uint256 limit, uint256 deadline)
        external
        payable
        returns (uint256 amountCalculated);

    function getPoolTokens(bytes32 poolId) external view returns (address[] memory, uint256[] memory, uint256);

    function queryBatchSwap(
        SwapKind kind,
        BatchSwapStep[] calldata swaps,
        IAsset[] calldata assets,
        FundManagement calldata funds
    ) external view returns (int256[] memory assetDeltas);
}
