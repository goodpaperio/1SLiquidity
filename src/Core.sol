// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./StreamDaemon.sol";
import "./Executor.sol";
import "./Utils.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// import interface for @ethsupport
import "./interfaces/IETHSupport.sol";

contract Core is Ownable, ReentrancyGuard /*, UUPSUpgradeable */ {
    using SafeERC20 for IERC20;

    // @audit must be able to recieve and transfer tokens
    StreamDaemon public streamDaemon;
    Executor public executor;
    IRegistry public registry;
    IETHSupport public ethSupport;
    
    // WETH address on mainnet
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    error ToxicTrade(uint256 tradeId);

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
        bool usePriceBased,
        bool onlyInstasettle
    );

    event TradeStreamExecuted(
        uint256 indexed tradeId, uint256 amountIn, uint256 realisedAmountOut, uint256 lastSweetSpot
    );

    event TradeCancelled(bool isAutocancelled, uint256 indexed tradeId, uint256 amountRemaining, uint256 realisedAmountOut);

    event TradeSettled(
        uint256 indexed tradeId,
        address indexed settler,
        uint256 totalAmountIn,
        uint256 totalAmountOut,
        uint256 totalFees
    );

    event LowLevelError(string error);

    event DataError(bytes error);

    // =========================
    // Fees state
    // =========================
    uint16 public constant MAX_BPS = 10_000;
    uint16 public constant MAX_FEE_CAP_BPS = 100; // 1%
    uint16 public streamProtocolFeeBps = 10; // 10 bps
    uint16 public streamBotFeeBps = 10; // 10 bps
    uint16 public instasettleProtocolFeeBps = 10; // 10 bps

    // Protocol fee balances by token
    mapping(address => uint256) public protocolFees;

    // Fees events
    event StreamFeesTaken(
        uint256 indexed tradeId, address indexed bot, address indexed token, uint256 protocolFee, uint256 botFee
    );
    event InstasettleFeeTaken(
        uint256 indexed tradeId, address indexed settler, address indexed token, uint256 protocolFee
    );
    event FeesClaimed(address indexed recipient, address indexed token, uint256 amount, bool isProtocol);
    event FeeRatesUpdated(uint16 streamProtocolFeeBps, uint16 streamBotFeeBps, uint16 instasettleProtocolFeeBps);

    // trades
    uint256 public lastTradeId;
    mapping(bytes32 => uint256[]) public pairIdTradeIds;
    mapping(uint256 => uint256) public tradeIndicies;
    mapping(uint256 => Utils.Trade) public trades;

    // balances
    mapping(address => mapping(address => uint256)) public eoaTokenBalance;
    mapping(address => uint256) public modulusResiduals;

    constructor(address _streamDaemon, address _executor, address _registry, address _ethSupport) Ownable(msg.sender) {
        streamDaemon = StreamDaemon(_streamDaemon);
        executor = Executor(_executor);
        registry = IRegistry(_registry);
        ethSupport = IETHSupport(_ethSupport);
    }
    
    /**
     * @notice Set the ETHSupport contract address
     * @dev Only callable by owner, needed to resolve circular dependency during deployment
     * @param _ethSupport The ETHSupport contract address
     */
    function setETHSupport(address _ethSupport) external onlyOwner {
        require(_ethSupport != address(0), "ETHSupport cannot be zero address");
        ethSupport = IETHSupport(_ethSupport);
    }

    function _computeFee(uint256 amount, uint16 bps) internal pure returns (uint256) {
        return (amount * bps) / MAX_BPS;
    }

    function _applyStreamFees(uint256 tradeId, address tokenOut, uint256 deltaOut, bool isInitial, address bot)
        internal
        returns (uint256 protocolFee, uint256 botFee)
    {
        if (deltaOut == 0) {
            return (0, 0);
        }
        protocolFee = _computeFee(deltaOut, streamProtocolFeeBps);
        botFee = _computeFee(deltaOut, streamBotFeeBps);
        if (isInitial) {
            protocolFee += botFee;
            botFee = 0;
        }
        // Guard: bot fee cannot exceed 100 bps of delta
        require(botFee * MAX_BPS <= deltaOut * 100, "bot fee guard");
        protocolFees[tokenOut] += protocolFee;
        emit StreamFeesTaken(tradeId, bot, tokenOut, protocolFee, botFee);
    }

    function _removeTradeFromStorage(bytes32 pairId, uint256 tradeId) internal {
        uint256[] storage tradeIds = pairIdTradeIds[pairId];
        uint256 tradeIndex = tradeIndicies[tradeId];
        uint256 lastTradeId = tradeIds[tradeIds.length - 1]; 
        tradeIds[tradeIndex] = lastTradeId;
        tradeIds.pop();
        tradeIndicies[lastTradeId] = tradeIndex; 
        delete tradeIndicies[tradeId];
        delete trades[tradeId];
    }

    // function _swapAndPopPairIdTradeId(bytes32 pairId, uint256 tradeId) internal {
    //     uint256[] storage tradeIds = pairIdTradeIds[pairId];
    //     uint256 tradeIndex = tradeIndicies[tradeId];
    //     tradeIds[tradeIndex] = tradeIds[tradeIds.length - 1];
    //     tradeIds.pop();
    //     delete tradeIndicies[tradeId];
    // }

    function setStreamProtocolFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        streamProtocolFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function setStreamBotFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        streamBotFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function setInstasettleProtocolFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        instasettleProtocolFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function claimProtocolFees(address token) external onlyOwner nonReentrant {
        uint256 amount = protocolFees[token];
        require(amount > 0, "no fees");
        protocolFees[token] = 0;
        IERC20(token).safeTransfer(owner(), amount);
        emit FeesClaimed(owner(), token, amount, true);
    }

    function setStreamDaemon(address _streamDaemon) external onlyOwner {
        require(_streamDaemon != address(0), "Invalid address");
        streamDaemon = StreamDaemon(_streamDaemon);
    }

    function setExecutor(address _executor) external onlyOwner {
        require(_executor != address(0), "Invalid address");
        executor = Executor(_executor);
    }

    function setRegistry(address _registry) external onlyOwner {
        require(_registry != address(0), "Invalid address");
        registry = IRegistry(_registry);
    }

    function instasettle(uint256 tradeId) external nonReentrant {
        Utils.Trade memory trade = trades[tradeId];
        bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
        require(trade.owner != address(0), "Trade not found");
        require(trade.isInstasettlable, "Trade not instasettlable");
        
        // otheriwse, remove trade from storage and settle amounts
        _removeTradeFromStorage(pairId, tradeId);
        // Note: _removeTradeFromStorage already handles deletion of all three storage locations
        // Calculate remaining amount that needs to be settled
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        require(remainingAmountOut > 0, "No remaining amount to settle");

        // Calculate how much the settler should pay
        // targetAmountOut - (realisedAmountOut * (1 - instasettleBps/10000))
        uint256 settlerPayment =
            ((trade.targetAmountOut - trade.realisedAmountOut) * (10_000 - trade.instasettleBps)) / 10_000;

        // Check if tokenOut is ETH sentinel
        bool isETHSentinel = (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE));
        
        // Take protocol fee from settler on instasettle
        uint256 protocolFee = _computeFee(settlerPayment, instasettleProtocolFeeBps);
        if (protocolFee > 0) {
            if (isETHSentinel) {
                // For ETH output, require ETH payment for protocol fee
                // Note: Core will receive WETH from the user, we need to handle this differently
                // For now, reduce the settler payment by the protocol fee and add to Core's balance
                IERC20(WETH).safeTransferFrom(msg.sender, address(this), protocolFee);
                protocolFees[address(WETH)] += protocolFee;
            } else {
                IERC20(trade.tokenOut).safeTransferFrom(msg.sender, address(this), protocolFee);
                protocolFees[trade.tokenOut] += protocolFee;
            }
            emit InstasettleFeeTaken(trade.tradeId, msg.sender, trade.tokenOut, protocolFee);
        }

        // Unwrap and transfer to owner if ETH sentinel, otherwise transfer token
        if (isETHSentinel) {
            // For ETH output: unwrap the settlerPayment amount to send to owner
            // The settler should have sent WETH already which is in Core
            ethSupport.unwrap(settlerPayment, trade.owner);
        } else {    
            IERC20(trade.tokenOut).safeTransferFrom(msg.sender, trade.owner, settlerPayment);
        }
        IERC20(trade.tokenIn).safeTransfer(msg.sender, trade.amountRemaining);
        emit TradeSettled(
            trade.tradeId,
            msg.sender,
            trade.amountRemaining,
            settlerPayment,
            remainingAmountOut - settlerPayment // totalFees is the difference (logical fee notion)
        );
    }

    function getPairIdTradeIds(bytes32 pairId) external view returns (uint256[] memory) {
        return pairIdTradeIds[pairId];
    }

    function getTrade(uint256 tradeId) external view returns (Utils.Trade memory) {
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        return trade;
    }

    function placeTrade(bytes calldata tradeData) public payable {
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            bool isInstasettlable,
            bool usePriceBased,
            uint256 instasettleBps,
            bool onlyInstasettle
        ) = abi.decode(tradeData, (address, address, uint256, uint256, bool, bool, uint256, bool));
        // @audit may be better to abstract sweetSpot algo to here and pass the value along, since small (<0.001% pool depth) trades shouldn't be split at all and would save hefty logic
        // @audit edge cases wrt pool depths (specifically extremely small volume to volume reserves) create anomalies in the algo output
        // @audit similarly for the sake of OPTIMISTIC and DETERMINISTIC placement patterns, we should abstract the calculation of sweetSpot nad the definition of appropriate DEX into seperated, off contract functions
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        uint256 tradeId = lastTradeId++;
        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut)); //@audit optimise this

        // @audit needs attention for small trades - these hsouldn't be entered in the orderbook / storage
        trades[tradeId] = Utils.Trade({
            owner: msg.sender,
            attempts: 0,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountRemaining: amountIn,
            targetAmountOut: amountOutMin,
            realisedAmountOut: 0,
            tradeId: tradeId,
            instasettleBps: instasettleBps,
            lastSweetSpot: 0, // @audit check that we need to speficially evaluate this here
            isInstasettlable: isInstasettlable,
            usePriceBased: usePriceBased,
            onlyInstasettle: onlyInstasettle
        });
        

        pairIdTradeIds[pairId].push(tradeId);
        uint256 tradeIndex = pairIdTradeIds[pairId].length - 1;
        tradeIndicies[tradeId] = tradeIndex;

        Utils.Trade storage trade = trades[tradeId];
        uint256 realisedBefore = trade.realisedAmountOut;
        Utils.Trade memory updatedTrade = executeStream(trade.tradeId);
        uint256 delta = updatedTrade.realisedAmountOut - realisedBefore; // initial delta = realised
        if (delta > 0) {
            (uint256 protocolFee, uint256 botFee) = _applyStreamFees(tradeId, tokenOut, delta, true, address(0));
            trades[tradeId].realisedAmountOut = updatedTrade.realisedAmountOut - (protocolFee + botFee);
        }

        // Emit TradeCreated event after stream execution with actual values
        emit TradeCreated(
            tradeId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            updatedTrade.amountRemaining, // Use actual remaining amount after stream
            amountOutMin,
            updatedTrade.realisedAmountOut, // Use actual realised amount after stream
            isInstasettlable,
            instasettleBps, // Use the passed instasettleBps parameter
            updatedTrade.lastSweetSpot, // Use actual sweet spot utilized
            usePriceBased,
            onlyInstasettle
        );
    }

    function cancelTrade(uint256 tradeId) public returns (bool) {
        // @audit It is essential that this authority may be granted by a bot, therefore meaning if the msg.sender is
        // Core.
        // @audit Similarly, when the Router is implemented, we mnust forward the msg.sender in the function call /
        // veridy signed message
        Utils.Trade memory trade = trades[tradeId];
        if (trade.owner == address(0)) {
            revert("Trade inexistent or being called from null address");
        }
        if (trade.owner == msg.sender || msg.sender == address(this)) {
            // @ethsupport here we would unwrap if tokenOut == 0x0.000 // function unwrap

            bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
            
            _removeTradeFromStorage(pairId, tradeId);
            
            // If tokenOut is ETH sentinel, unwrap WETH to ETH before transferring
            if (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                ethSupport.unwrap(trade.realisedAmountOut, trade.owner); // @ethsupport ensure that unwrap is payable in interface
            } else {
                IERC20(trade.tokenOut).safeTransfer(trade.owner, trade.realisedAmountOut);
            }
            
            IERC20(trade.tokenIn).safeTransfer(trade.owner, trade.amountRemaining);

            bool autoCancelled = msg.sender == address(this) ? true : false;

            emit TradeCancelled(autoCancelled, tradeId, trade.amountRemaining, trade.realisedAmountOut);

            return true;
        } else {
            revert("Only trade owner can cancel");
        }
    }

    function executeTrades(bytes32 pairId) public nonReentrant {
        uint256[] storage tradeIds = pairIdTradeIds[pairId];
        uint256 botFeesAccrued = 0;
        address tokenOutForRun = address(0);

        // Cap the number of trades processed to prevent out of gas errors
        uint256 maxTradesToProcess = 20;
        uint256 tradesToProcess = tradeIds.length > maxTradesToProcess ? maxTradesToProcess : tradeIds.length;

        // Process trades in reverse order to avoid array index issues when trades are deleted
        for (uint256 i = tradesToProcess; i > 0; i--) {
            uint256 index = i - 1; // Convert to 0-based index
            Utils.Trade storage trade = trades[tradeIds[index]];
            if (trade.attempts >= 3) {
                // we transfer the remaining amount of the trade to the owner and dequeue it via cancelTrade
                this.cancelTrade(trade.tradeId);
            } else {
                uint256 realisedBefore = trade.realisedAmountOut;
                try this.executeStream(trade.tradeId) returns (Utils.Trade memory updatedTrade) {
                    uint256 delta = updatedTrade.realisedAmountOut - realisedBefore;
                    if (delta > 0) {
                        if (tokenOutForRun == address(0)) tokenOutForRun = updatedTrade.tokenOut;
                        (uint256 protocolFee, uint256 botFee) =
                            _applyStreamFees(trade.tradeId, updatedTrade.tokenOut, delta, false, msg.sender);
                        trades[trade.tradeId].realisedAmountOut =
                            updatedTrade.realisedAmountOut - (protocolFee + botFee);
                        botFeesAccrued += botFee;
                    }
                    if (updatedTrade.lastSweetSpot == 0) {
                        // @ethsupport here we would unwrap if tokenOut == 0x0.000 // function unwrap
                        if (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                            ethSupport.unwrap(trade.realisedAmountOut, trade.owner);
                        } else {
                            IERC20(trade.tokenOut).safeTransfer(trade.owner, trade.realisedAmountOut);
                        }                        
                        _removeTradeFromStorage(pairId, tradeIds[index]);
                    }
                } catch Error(string memory reason) {
                    trade.attempts++;
                    emit LowLevelError(reason);
                } catch (bytes memory lowLevelData) {
                    trade.attempts++;
                    emit DataError(lowLevelData);
                }
            }
        }

        if (botFeesAccrued > 0) {
            // require(tokenOutForRun != address(0), "fee token unset");
            if (tokenOutForRun == 0x0000000000000000000000000000000000000000 || tokenOutForRun == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
                // transfer ETH to the bot address (msg.sender)
                (bool success, ) = payable(msg.sender).call{value: botFeesAccrued}("");
                require(success, "ETH transfer failed");
            } else {
            IERC20(tokenOutForRun).safeTransfer(msg.sender, botFeesAccrued);
            }
            emit FeesClaimed(msg.sender, tokenOutForRun, botFeesAccrued, false);
        }
    }
    

    function executeStream(uint256 tradeId) public returns (Utils.Trade memory updatedTrade) {
        Utils.Trade storage storageTrade = trades[tradeId];
        Utils.Trade memory trade = trades[tradeId]; 

        // security measure @audit may need review
        // if (trade.realisedAmountOut > trade.targetAmountOut) {
        //     revert ToxicTrade(trade.tradeId);
        // }

        (uint256 sweetSpot, address bestDex, address router) = streamDaemon.evaluateSweetSpotAndDex(
            trade.tokenIn, trade.tokenOut, trade.amountRemaining, 0, trade.usePriceBased
        );

        if (
            trade.lastSweetSpot == 1 || trade.lastSweetSpot == 2 || trade.lastSweetSpot == 3 || trade.lastSweetSpot == 4
        ) {
            sweetSpot = trade.lastSweetSpot;
        }

        if (sweetSpot > 500) {
            sweetSpot = 500; // this is an arbitrary value @audit needs revision
        }

        require(sweetSpot > 0, "Invalid sweet spot");
        uint256 targetAmountOut;
        uint256 streamVolume;
        if (trade.targetAmountOut > trade.realisedAmountOut) {
            targetAmountOut = (trade.targetAmountOut - trade.realisedAmountOut) / sweetSpot * 996 / 1000; // dropping 0.4% to allow for DEX fees
            streamVolume = trade.amountRemaining / sweetSpot;
        } else {
            targetAmountOut = trade.realisedAmountOut - trade.targetAmountOut;

            // ! @audit maybe we need to do some smart maths here to determine the exchange rate at time of trade placement and propogate that
            // if the amount remaining is really tiny and the target amount out is large the tradde will fail, esp due to changing market conditions?
            sweetSpot = 1;
            streamVolume = trade.amountRemaining;
        }

        // Declare tradeData outside the if-else block so it's in scope
        IRegistry.TradeData memory tradeData;
        
        if (trade.tokenOut == 0x0000000000000000000000000000000000000000 || trade.tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
            // this sets the trading currency to WETH if the desired tokenOut is native ETH
            tradeData = registry.prepareTradeData(
                bestDex, trade.tokenIn, address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2), streamVolume, targetAmountOut, address(this)
            );
            
        } else {
            tradeData = registry.prepareTradeData(
                bestDex, trade.tokenIn, trade.tokenOut, streamVolume, targetAmountOut, address(this)
            );
        }

        IERC20(trade.tokenIn).forceApprove(tradeData.router, streamVolume);

        (bool success, bytes memory returnData) =
            address(executor).delegatecall(abi.encodeWithSelector(tradeData.selector, tradeData.params));
        if (!success) {
            revert(string(abi.encodePacked("DEX trade failed: ", returnData)));
        }
        uint256 amountOut = abi.decode(returnData, (uint256));
        require(amountOut > 0, "No tokens received from swap");

        if (sweetSpot == 1 || sweetSpot == 2 || sweetSpot == 3 || sweetSpot == 4) {
            sweetSpot--;
        }

        storageTrade.amountRemaining = trade.amountRemaining - streamVolume;
        storageTrade.realisedAmountOut += amountOut;
        storageTrade.lastSweetSpot = sweetSpot;

        emit TradeStreamExecuted(trade.tradeId, streamVolume, amountOut, sweetSpot);

        return storageTrade;
    }
}
