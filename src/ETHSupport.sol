// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Core.sol";
import "./Utils.sol";
import "./interfaces/ICore.sol";

// WETH interface for wrapping ETH
interface IWETH {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

// ICore interface imported from ./interfaces/ICore.sol

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
        address indexed user,
        uint256 ethAmount,
        address tokenOut,
        uint256 minAmountOut,
        bool isInstasettlable,
        bool usePriceBased,
        uint256 instasettleBps,
        bool onlyInstasettle
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
     * @param instasettleBps Basis points for instasettle discount
     * @param onlyInstasettle Whether the trade should only be instasettled
     * @return tradeId The ID of the created trade
     */
    function placeTradeWithETH(
        address tokenOut,
        uint256 amountOutMin,
        bool isInstasettlable,
        bool usePriceBased,
        uint256 instasettleBps,
        bool onlyInstasettle
    ) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert InvalidETHAmount();

        // Measure pre-balance, wrap, then validate delta
        uint256 preBalance = weth.balanceOf(address(this));
        weth.deposit{value: msg.value}();
        uint256 postBalance = weth.balanceOf(address(this));
        if (postBalance < preBalance || postBalance - preBalance != msg.value) revert WETHWrapFailed();

        // Prepare trade data for Core contract
        // The Core contract expects: (address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, bool isInstasettlable, bool usePriceBased, uint256 instasettleBps, bool onlyInstasettle)
        bytes memory tradeData = abi.encode(
            address(weth),  // tokenIn (WETH)
            tokenOut,       // tokenOut
            msg.value,      // amountIn (same as ETH amount)
            amountOutMin,   // amountOutMin
            isInstasettlable,
            usePriceBased,
            instasettleBps,
            onlyInstasettle
        );

        // Approve Core to spend the wrapped WETH from this contract
        weth.approve(address(core), msg.value);

        // Call Core contract's placeTrade function
        core.placeTrade(tradeData);

        // Get the trade ID from the Core contract
        // We need to get the last trade ID, but since we can't directly access it,
        // we'll emit an event with the user's information for tracking
        emit ETHTradePlaced(
            msg.sender,
            msg.value,
            tokenOut,
            amountOutMin,
            isInstasettlable,
            usePriceBased,
            instasettleBps,
            onlyInstasettle
        );

        return 0; // Trade ID is managed by Core contract
    }

    /**
     * @notice Place a trade using ETH with custom trade data
     * @param data The encoded trade data (excluding tokenIn which will be WETH)
     * @param includeForwarding Whether to forward the call to another contract
     * @param forwardingTarget The target address for forwarding
     * @return tradeId The ID of the created trade
     */
    function placeTradeWithETHCustom(
        bytes calldata data,
        bool includeForwarding,
        address forwardingTarget
    ) external payable nonReentrant returns (uint256) {
        if (msg.value == 0) revert InvalidETHAmount();

        if (!includeForwarding) {
            // Wrap and validate delta, then decode core data and place trade
            uint256 preBalance = weth.balanceOf(address(this));
            weth.deposit{value: msg.value}();
            uint256 postBalance = weth.balanceOf(address(this));
            if (postBalance < preBalance || postBalance - preBalance != msg.value) revert WETHWrapFailed();

            (
                address tokenInOriginal, // originalTokenIn (ignored but named to avoid syntax error)
                address tokenOut,
                uint256 amountIn,
                uint256 amountOutMin,
                bool isInstasettlable,
                bool usePriceBased,
                uint256 instasettleBps,
                bool onlyInstasettle
            ) = abi.decode(data, (address, address, uint256, uint256, bool, bool, uint256, bool));

            if (amountIn != msg.value) revert InvalidETHAmount();

            bytes memory newTradeData = abi.encode(
                address(weth),
                tokenOut,
                msg.value,
                amountOutMin,
                isInstasettlable,
                usePriceBased,
                instasettleBps,
                onlyInstasettle
            );

            // Approve Core to spend the wrapped WETH from this contract
            weth.approve(address(core), msg.value);

            core.placeTrade(newTradeData);

            emit ETHTradePlaced(
                msg.sender,
                msg.value,
                tokenOut,
                amountOutMin,
                isInstasettlable,
                usePriceBased,
                instasettleBps,
                onlyInstasettle
            );
            return 0;
        }

        require(forwardingTarget != address(0), "Invalid forwarding target");
        // Forward call with ETH value and provided data directly
        (bool success, bytes memory returndata) = forwardingTarget.call{value: msg.value}(data);
        if (!success) {
            // Bubble up revert reason if present
            if (returndata.length > 0) {
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("Forwarded call failed");
            }
        }
        return 0;
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

    /**
     * @notice Unwrap WETH to ETH for the caller
     * @param amount The amount of WETH to unwrap
     * @param destination The address to receive the unwrapped ETH
     */
    function unwrap(uint256 amount, address destination) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(weth.balanceOf(msg.sender) >= amount, "Insufficient WETH balance");
        
        // Transfer WETH from caller to this contract
        weth.transferFrom(msg.sender, address(this), amount);
        
        // Unwrap WETH to ETH
        weth.withdraw(amount);
        
        // Transfer ETH to recipient
        (bool success, ) = payable(destination).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @notice Unwrap WETH to ETH and route to specified address
     * @param amount The amount of WETH to unwrap
     * @param to The address to receive the ETH
     */
    function unwrapAndRoute(uint256 amount, address to, bytes calldata data) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient address");
        require(weth.balanceOf(msg.sender) >= amount, "Insufficient WETH balance");
        
        // Transfer WETH from caller to this contract
        weth.transferFrom(msg.sender, address(this), amount);
        
        // Unwrap WETH to ETH
        weth.withdraw(amount);
        
        // Call destination with ETH value and forward data payload
        (bool success, ) = payable(to).call{value: amount}(data);
        require(success, "ETH transfer failed");
    }

    /**
     * @notice Route WETH to specified address
     * @param amount The amount of WETH to transfer
     * @param to The address to receive the WETH
     */
    function route(uint256 amount, address to, bytes calldata data) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient address");
        require(weth.balanceOf(msg.sender) >= amount, "Insufficient WETH balance");
        
        // Transfer WETH from caller to destination first so target sees funds
        weth.transferFrom(msg.sender, to, amount);
        
        // Invoke destination with provided data (no ETH value)
        (bool success, ) = to.call(data);
        require(success, "Call failed");
    }
}
