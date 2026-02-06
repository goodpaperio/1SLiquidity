// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IOneInchV5Router {
    struct SwapDescription {
        address srcToken;
        address dstToken;
        address srcReceiver;
        address dstReceiver;
        uint256 amount;
        uint256 minReturnAmount;
        uint256 flags;
    }

    /**
     * @notice Performs a swap, delegating all calls encoded in `data` to `executor`. See tests for usage examples
     * @param executor Aggregation executor that executes calls described in `data`
     * @param desc Swap description
     * @param permit Should contain valid permit that can be used in `IERC20Permit.permit` calls.
     * @param data Encoded calls that `caller` should execute in between of swaps
     * @return returnAmount Resulting token amount
     * @return spentAmount Source token amount
     */
    function swap(address executor, SwapDescription calldata desc, bytes calldata permit, bytes calldata data)
        external
        payable
        returns (uint256 returnAmount, uint256 spentAmount);

    /**
     * @notice Same as `swap` but calls permit first,
     * allowing to approve token spending and make a swap in one transaction.
     * Also allows to specify the receiver of the swapped tokens
     * @param executor Aggregation executor that executes calls described in `data`
     * @param desc Swap description
     * @param permit Should contain valid permit that can be used in `IERC20Permit.permit` calls.
     * @param data Encoded calls that `caller` should execute in between of swaps
     * @return returnAmount Resulting token amount
     * @return spentAmount Source token amount
     */
    function swapWithPermit(address executor, SwapDescription calldata desc, bytes calldata permit, bytes calldata data)
        external
        payable
        returns (uint256 returnAmount, uint256 spentAmount);

    /**
     * @notice Performs multiple swaps in one transaction
     * @param calls Array of encoded function calls to be executed
     * @return results Array of results from each call
     */
    function batchSwap(bytes[] calldata calls) external payable returns (bytes[] memory results);

    /**
     * @notice Returns the address that should be used for token approvals
     * @return The spender address for approvals
     */
    function getSpender() external view returns (address);
}
