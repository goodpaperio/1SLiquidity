// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/ETHSupport.sol";
import "../src/Core.sol";
import "../src/StreamDaemon.sol";
import "../src/Executor.sol";
import "../src/Registry.sol";
import "../src/Utils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock WETH contract for testing
contract MockWETH {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    string public name = "Wrapped Ether";
    string public symbol = "WETH";
    uint8 public decimals = 18;

    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 wad) external {
        require(balanceOf[msg.sender] >= wad, "Insufficient balance");
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

// Mock Core contract for testing
contract MockCore {
    uint256 public lastTradeId;
    mapping(uint256 => Utils.Trade) public trades;

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountRemaining,
        uint256 minAmountOut,
        uint256 realisedAmountOut,
        bool isInstasettlable,
        uint256 instasettleBps,
        uint256 lastSweetSpot,
        bool usePriceBased
    );

    function placeTrade(bytes calldata tradeData) external payable {
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            bool isInstasettlable,
            bool usePriceBased
        ) = abi.decode(tradeData, (address, address, uint256, uint256, bool, bool));

        // Transfer tokens from caller to this contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 tradeId = lastTradeId++;

        trades[tradeId] = Utils.Trade({
            owner: tx.origin, // Use tx.origin to get the original caller
            attempts: 0,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountRemaining: amountIn,
            targetAmountOut: amountOutMin,
            realisedAmountOut: 0,
            tradeId: tradeId,
            instasettleBps: 100,
            lastSweetSpot: 0,
            isInstasettlable: isInstasettlable,
            usePriceBased: usePriceBased
        });

        emit TradeCreated(
            tradeId,
            tx.origin,
            tokenIn,
            tokenOut,
            amountIn,
            amountIn,
            amountOutMin,
            0,
            isInstasettlable,
            100,
            0,
            usePriceBased
        );
    }

    function cancelTrade(uint256 tradeId) external returns (bool) {
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        require(trade.owner == msg.sender, "Not trade owner");

        // Transfer tokens back to owner
        IERC20(trade.tokenIn).transfer(trade.owner, trade.amountRemaining);
        IERC20(trade.tokenOut).transfer(trade.owner, trade.realisedAmountOut);

        delete trades[tradeId];
        return true;
    }

    function getTrade(uint256 tradeId) external view returns (Utils.Trade memory) {
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        return trade;
    }
}

contract ETHSupportTest is Test {
    ETHSupport public ethSupport;
    MockWETH public weth;
    MockCore public core;

    address public user = address(0x1);
    address public tokenOut = address(0x2);

    function setUp() public {
        // Deploy mock contracts
        weth = new MockWETH();
        core = new MockCore();

        // Deploy ETHSupport contract
        ethSupport = new ETHSupport(address(weth), address(core));

        // Give user some ETH
        vm.deal(user, 10 ether);
    }

    function testPlaceTradeWithETH() public {
        uint256 ethAmount = 1 ether;
        uint256 minAmountOut = 1000e6; // 1000 USDC (assuming 6 decimals)
        bool isInstasettlable = true;
        bool usePriceBased = false;

        // Approve ETHSupport to spend WETH on behalf of user
        vm.startPrank(user);
        weth.approve(address(ethSupport), type(uint256).max);

        // Place trade with ETH
        uint256 tradeId =
            ethSupport.placeTradeWithETH{ value: ethAmount }(tokenOut, minAmountOut, isInstasettlable, usePriceBased);

        vm.stopPrank();

        // Verify WETH was wrapped
        assertEq(weth.balanceOf(address(ethSupport)), ethAmount);

        // Verify trade was created in Core contract
        Utils.Trade memory trade = core.getTrade(0); // First trade has ID 0
        assertEq(trade.owner, user);
        assertEq(trade.tokenIn, address(weth));
        assertEq(trade.tokenOut, tokenOut);
        assertEq(trade.amountIn, ethAmount);
        assertEq(trade.targetAmountOut, minAmountOut);
        assertEq(trade.isInstasettlable, isInstasettlable);
        assertEq(trade.usePriceBased, usePriceBased);
    }

    function testPlaceTradeWithETHCustom() public {
        uint256 ethAmount = 1 ether;
        uint256 minAmountOut = 1000e6;
        bool isInstasettlable = true;
        bool usePriceBased = false;

        // Prepare custom trade data
        bytes memory tradeData = abi.encode(
            address(0), // This will be replaced with WETH address
            tokenOut,
            ethAmount,
            minAmountOut,
            isInstasettlable,
            usePriceBased
        );

        vm.startPrank(user);
        weth.approve(address(ethSupport), type(uint256).max);

        // Place trade with custom data
        uint256 tradeId = ethSupport.placeTradeWithETHCustom{ value: ethAmount }(tradeData);

        vm.stopPrank();

        // Verify WETH was wrapped
        assertEq(weth.balanceOf(address(ethSupport)), ethAmount);

        // Verify trade was created
        Utils.Trade memory trade = core.getTrade(0);
        assertEq(trade.owner, user);
        assertEq(trade.tokenIn, address(weth));
        assertEq(trade.tokenOut, tokenOut);
        assertEq(trade.amountIn, ethAmount);
    }

    function testRevertInvalidETHAmount() public {
        vm.startPrank(user);

        // Try to place trade with 0 ETH
        vm.expectRevert(ETHSupport.InvalidETHAmount.selector);
        ethSupport.placeTradeWithETH{ value: 0 }(tokenOut, 1000e6, true, false);

        vm.stopPrank();
    }

    function testRevertAmountMismatch() public {
        uint256 ethAmount = 1 ether;
        uint256 differentAmount = 2 ether;

        // Prepare trade data with different amount
        bytes memory tradeData = abi.encode(
            address(0),
            tokenOut,
            differentAmount, // Different from ETH sent
            1000e6,
            true,
            false
        );

        vm.startPrank(user);
        weth.approve(address(ethSupport), type(uint256).max);

        // Should revert due to amount mismatch
        vm.expectRevert(ETHSupport.InvalidETHAmount.selector);
        ethSupport.placeTradeWithETHCustom{ value: ethAmount }(tradeData);

        vm.stopPrank();
    }

    function testCancelTrade() public {
        uint256 ethAmount = 1 ether;

        vm.startPrank(user);
        weth.approve(address(ethSupport), type(uint256).max);

        // Place a trade
        ethSupport.placeTradeWithETH{ value: ethAmount }(tokenOut, 1000e6, true, false);

        // Cancel the trade
        bool success = core.cancelTrade(0);
        assertTrue(success);

        vm.stopPrank();
    }

    function testGetTrade() public {
        uint256 ethAmount = 1 ether;

        vm.startPrank(user);
        weth.approve(address(ethSupport), type(uint256).max);

        // Place a trade
        ethSupport.placeTradeWithETH{ value: ethAmount }(tokenOut, 1000e6, true, false);

        // Get trade info
        Utils.Trade memory trade = core.getTrade(0);
        assertEq(trade.owner, user);
        assertEq(trade.tokenIn, address(weth));
        assertEq(trade.tokenOut, tokenOut);

        vm.stopPrank();
    }

    function testEmergencyWithdrawETH() public {
        // Send some ETH to the contract
        vm.deal(address(ethSupport), 1 ether);

        uint256 ownerBalanceBefore = address(ethSupport.owner()).balance;

        // Withdraw ETH
        ethSupport.emergencyWithdrawETH();

        uint256 ownerBalanceAfter = address(ethSupport.owner()).balance;
        assertEq(ownerBalanceAfter - ownerBalanceBefore, 1 ether);
        assertEq(address(ethSupport).balance, 0);
    }

    function testEmergencyWithdrawWETH() public {
        // Give the contract some WETH
        vm.startPrank(address(weth));
        weth.transfer(address(ethSupport), 1 ether);
        vm.stopPrank();

        uint256 ownerBalanceBefore = weth.balanceOf(ethSupport.owner());

        // Withdraw WETH
        ethSupport.emergencyWithdrawWETH();

        uint256 ownerBalanceAfter = weth.balanceOf(ethSupport.owner());
        assertEq(ownerBalanceAfter - ownerBalanceBefore, 1 ether);
        assertEq(weth.balanceOf(address(ethSupport)), 0);
    }

    function testGetBalances() public {
        // Send ETH to contract
        vm.deal(address(ethSupport), 1 ether);

        // Send WETH to contract
        vm.startPrank(address(weth));
        weth.transfer(address(ethSupport), 2 ether);
        vm.stopPrank();

        assertEq(ethSupport.getETHBalance(), 1 ether);
        assertEq(ethSupport.getWETHBalance(), 2 ether);
    }

    function testReceiveETH() public {
        uint256 amount = 1 ether;

        // Send ETH directly to contract
        (bool success,) = address(ethSupport).call{ value: amount }("");
        assertTrue(success);

        assertEq(address(ethSupport).balance, amount);
    }
}
