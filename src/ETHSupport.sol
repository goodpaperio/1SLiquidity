// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Core.sol";
import "./Utils.sol";

// WETH interface for wrapping ETH
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// Core contract interface
interface ICore {
    function placeTrade(bytes calldata tradeData) external payable;
    function cancelTrade(uint256 tradeId) external returns (bool);
    function getTrade(uint256 tradeId) external view returns (Utils.Trade memory);
    function trades(uint256 tradeId) external view returns (Utils.Trade memory);
}

/**
 * @title ETHSupport
 * @notice Contract that allows users to place trades using ETH by automatically wrapping it to WETH
 * @dev This contract acts as an intermediary between users and the Core contract for ETH trades
 */
contract ETHSupport is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // State variables
    IWETH public immutable weth;
    ICore public immutable core;
    
    // Events
    event ETHTradePlaced(
        uint256 indexed tradeId,
        address indexed user,
        uint256 ethAmount,
        address tokenOut,
        uint256 minAmountOut,
        bool isInstasettlable,
        bool usePriceBased
    );

    event ETHReceived(address indexed user, uint256 amount);

    // Errors
    error InvalidETHAmount();
    error ETHTransferFailed();
    error WETHWrapFailed();
    error InvalidCoreAddress();
    error InvalidWETHAddress();

    constructor(address _weth, address _core) Ownable(msg.sender) {
        if (_weth == address(0)) revert InvalidWETHAddress();
        if (_core == address(0)) revert InvalidCoreAddress();
        
        weth = IWETH(_weth);
        core = ICore(_core);
    }

    /**
     * @notice Receive ETH from users
     */
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }

    /**
     * @notice Place a trade using ETH as input, which gets wrapped to WETH
     * @param tokenOut The output token address
     * @param amountOutMin Minimum amount of output tokens expected
     * @param isInstasettlable Whether the trade can be instantly settled
     * @param usePriceBased Whether to use price-based DEX selection
     * @return tradeId The ID of the created trade
     */
    function placeTradeWithETH(
        address tokenOut,
        uint256 amountOutMin,
        bool isInstasettlable,
        bool usePriceBased
    ) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert InvalidETHAmount();

        // Wrap ETH to WETH
        weth.deposit{value: msg.value}();
        
        // Verify WETH was received
        uint256 wethBalance = weth.balanceOf(address(this));
        if (wethBalance < msg.value) revert WETHWrapFailed();

        // Prepare trade data for Core contract
        // The Core contract expects: (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, bool isInstasettlable, bool usePriceBased)
        bytes memory tradeData = abi.encode(
            address(weth),  // tokenIn (WETH)
            tokenOut,       // tokenOut
            msg.value,      // amountIn (same as ETH amount)
            amountOutMin,   // amountOutMin
            isInstasettlable,
            usePriceBased
        );

        // Call Core contract's placeTrade function
        core.placeTrade(tradeData);

        // Get the trade ID from the Core contract
        // We need to get the last trade ID, but since we can't directly access it,
        // we'll emit an event with the user's information for tracking
        emit ETHTradePlaced(
            0, // Trade ID will be determined by Core contract
            msg.sender,
            msg.value,
            tokenOut,
            amountOutMin,
            isInstasettlable,
            usePriceBased
        );

        return 0; // Trade ID is managed by Core contract
    }

    /**
     * @notice Place a trade using ETH with custom trade data
     * @param tradeData The encoded trade data (excluding tokenIn which will be WETH)
     * @return tradeId The ID of the created trade
     */
    function placeTradeWithETHCustom(bytes calldata tradeData) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert InvalidETHAmount();

        // Wrap ETH to WETH
        weth.deposit{value: msg.value}();
        
        // Verify WETH was received
        uint256 wethBalance = weth.balanceOf(address(this));
        if (wethBalance < msg.value) revert WETHWrapFailed();

        // Decode the trade data to replace tokenIn with WETH address
        (
            address originalTokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            bool isInstasettlable,
            bool usePriceBased
        ) = abi.decode(tradeData, (address, address, uint256, uint256, bool, bool));

        // Verify the amount matches the ETH sent
        if (amountIn != msg.value) revert InvalidETHAmount();

        // Create new trade data with WETH as tokenIn
        bytes memory newTradeData = abi.encode(
            address(weth),  // tokenIn (WETH)
            tokenOut,
            msg.value,      // amountIn
            amountOutMin,
            isInstasettlable,
            usePriceBased
        );

        // Call Core contract's placeTrade function
        core.placeTrade(newTradeData);

        emit ETHTradePlaced(
            0, // Trade ID will be determined by Core contract
            msg.sender,
            msg.value,
            tokenOut,
            amountOutMin,
            isInstasettlable,
            usePriceBased
        );

        return 0; // Trade ID is managed by Core contract
    }

    /**
     * @notice Emergency function to withdraw any stuck ETH
     * @dev Only callable by owner
     */
    function emergencyWithdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            (bool success, ) = payable(owner()).call{value: balance}("");
            if (!success) revert ETHTransferFailed();
        }
    }

    /**
     * @notice Emergency function to withdraw any stuck WETH
     * @dev Only callable by owner
     */
    function emergencyWithdrawWETH() external onlyOwner {
        uint256 balance = weth.balanceOf(address(this));
        if (balance > 0) {
            weth.transfer(owner(), balance);
        }
    }

    /**
     * @notice Emergency function to withdraw any stuck ERC20 tokens
     * @dev Only callable by owner
     * @param token The token contract address
     */
    function emergencyWithdrawToken(address token) external onlyOwner {
        require(token != address(weth), "Use emergencyWithdrawWETH for WETH");
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    /**
     * @notice Get the WETH balance of this contract
     * @return balance The WETH balance
     */
    function getWETHBalance() external view returns (uint256) {
        return weth.balanceOf(address(this));
    }

    /**
     * @notice Get the ETH balance of this contract
     * @return balance The ETH balance
     */
    function getETHBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
