// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// lib/openzeppelin-contracts/contracts/utils/Context.sol

// OpenZeppelin Contracts (last updated v5.0.1) (utils/Context.sol)

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

// src/interfaces/IUniversalDexInterface.sol

interface IUniversalDexInterface {
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB);
    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address pool);
    function getDexType() external pure returns (string memory);
    function getDexVersion() external pure returns (string memory);
    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256);
    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        returns (uint256 amountOut, bytes memory aux);
}

// lib/openzeppelin-contracts/contracts/access/Ownable.sol

// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

// lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol

// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/extensions/IERC20Metadata.sol)

/**
 * @dev Interface for the optional metadata functions from the ERC-20 standard.
 */
interface IERC20Metadata is IERC20 {
    /**
     * @dev Returns the name of the token.
     */
    function name() external view returns (string memory);

    /**
     * @dev Returns the symbol of the token.
     */
    function symbol() external view returns (string memory);

    /**
     * @dev Returns the decimals places of the token.
     */
    function decimals() external view returns (uint8);
}

// src/StreamDaemon.sol

contract StreamDaemon is Ownable {
    IUniversalDexInterface public universalDexInterface;
    address[] public dexs; // @audit following eternal storage pattern may go to Core.sol
    mapping(address => address) public dexToRouters; // goes to Core.sol

    event DEXRouteAdded(address indexed dex);
    event DEXRouteRemoved(address indexed dex);

    // temporarily efine a constant for minimum effective gas in dollars
    // uint256 public constant MIN_EFFECTIVE_GAS_DOLLARS = 1; // i.e $1 minimum @audit this should be valuated against
        // TOKEN-USDC value during execution in production
    uint256 public DEFAULT_SWEET_SPOT = 4;
    uint256 public MAXIMUM_SWEET_SPOT = 500;

    constructor(address[] memory _dexs, address[] memory _routers) Ownable(msg.sender) {
        for (uint256 i = 0; i < _dexs.length; i++) {
            dexs.push(_dexs[i]);
        }
        for (uint256 i = 0; i < _routers.length; i++) {
            dexToRouters[_dexs[i]] = _routers[i];
        } // @audit make sure to pass the routers in the appropriate order wrt how the dex's are inputted on deployment
    }

    function setDefaultSweetSpot(uint256 _defaultSweetSpot) external onlyOwner {
        DEFAULT_SWEET_SPOT = _defaultSweetSpot;
    }

    function setMaximumSweetSpot(uint256 _maximumSweetSpot) external onlyOwner {
        MAXIMUM_SWEET_SPOT = _maximumSweetSpot;
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function registerDex(address _fetcher) external onlyOwner {
        dexs.push(_fetcher); // @audit this storage allocation has multiple dependancies in order to actually function,
            // including deployments of appropriate fetchers and configuration of the relevant dex's interface
        emit DEXRouteAdded(_fetcher);
    }

    function removeDex(address _fetcher) external onlyOwner {
        for (uint256 i = 0; i < dexs.length; i++) {
            if (dexs[i] == _fetcher) {
                dexs[i] = dexs[dexs.length - 1];
                dexs.pop();
                delete dexToRouters[_fetcher];
                emit DEXRouteRemoved(_fetcher);
                break;
            }
        }
    }

    function evaluateSweetSpotAndDex(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        uint256 effectiveGas,
        bool usePriceBased
    )
        public
        view
        returns (uint256 sweetSpot, address bestFetcher, address router)
    {
        address identifiedFetcher;
        uint256 maxReserveIn;
        uint256 maxReserveOut;

        // lets implement this conditional: if (tokenOut == 0x0000000000000000000000000000000000000000 | 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee) { let tokenOut == WETH }
        if (tokenOut == 0x0000000000000000000000000000000000000000 || tokenOut == address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE)) {
            tokenOut = address(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2); // drop address in here @ethsupport
        }

        if (usePriceBased) {
            // Price-based DEX selection
            (identifiedFetcher, maxReserveIn, maxReserveOut) = findBestPriceForTokenPair(tokenIn, tokenOut, volume);
            bestFetcher = identifiedFetcher;
            router = dexToRouters[bestFetcher];
        } else {
            // Reserve-based DEX selection
            (identifiedFetcher, maxReserveIn, maxReserveOut) = findHighestReservesForTokenPair(tokenIn, tokenOut);
            bestFetcher = identifiedFetcher;
            router = dexToRouters[bestFetcher];
        }

        sweetSpot = _sweetSpotAlgo(tokenIn, tokenOut, volume, bestFetcher);
    }

    function findBestPriceForTokenPair(
        address tokenIn,
        address tokenOut,
        uint256 volume
    )
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        uint256 bestPrice = type(uint256).max;

        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);

            try fetcher.getPrice(tokenIn, tokenOut, volume) returns (uint256 price) {
                // Only consider non-zero prices
                if (price > 0 && price < bestPrice) {
                    bestPrice = price;
                    bestFetcher = address(fetcher);

                    // Get reserves for sweet spot calculation
                    try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveIn, uint256 reserveOut) {
                        maxReserveIn = reserveIn;
                        maxReserveOut = reserveOut;
                    } catch {
                        // If getReserves fails, we still have the best price
                    }
                }
            } catch {
                // Skip if price fetch fails
            }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev always written in terms of
     *  **the token that is being added to the pool** (tokenIn)
     */
    function findHighestReservesForTokenPair(
        address tokenIn,
        address tokenOut
    )
        public
        view
        returns (address bestFetcher, uint256 maxReserveIn, uint256 maxReserveOut)
    {
        for (uint256 i = 0; i < dexs.length; i++) {
            IUniversalDexInterface fetcher = IUniversalDexInterface(dexs[i]);
            try fetcher.getReserves(tokenIn, tokenOut) returns (uint256 reserveTokenIn, uint256 reserveTokenOut) {
                if (reserveTokenIn > maxReserveIn && reserveTokenIn > 0) {
                    maxReserveIn = reserveTokenIn;
                    maxReserveOut = reserveTokenOut;
                    bestFetcher = address(fetcher);
                }
            } catch Error(string memory reason) {
                reason;
            }
            // catch (bytes memory lowLevelData) {
            // }
        }
        require(bestFetcher != address(0), "No DEX found for token pair");
    }

    /**
     * @dev Sweet Spot Algorithm v4 - Using constant product formula (x*y=k)
     * Simple iterative approach: double sweet spot until slippage < 10 BPS
     */
    function _sweetSpotAlgo(
        address tokenIn,
        address tokenOut,
        uint256 volume,
        address bestFetcher
    )
        public
        view
        returns (uint256 sweetSpot)
    {
        // Step 1: Read reserves from the DEX
        (uint256 reserveIn, uint256 reserveOut) = IUniversalDexInterface(bestFetcher).getReserves(tokenIn, tokenOut);

        if (reserveIn == 0 || reserveOut == 0) {
            revert("Zero reserves");
            // return 4; // Fallback to minimum sweet spot
        }
        uint256 actualReserveIn = reserveIn;
        uint256 actualReserveOut = reserveOut;
        uint256 actualVolume = volume;

        sweetSpot = 1;

        uint256 effectiveVolume = actualVolume / sweetSpot;
        uint256 slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);

        // @audit for alpha testing purposes, we minimise sweet spot to 4. In production, this  should be removed

        if (slippage <= 10) {
            sweetSpot = DEFAULT_SWEET_SPOT;
            return sweetSpot;
        }

        // iteratively double sweet spot until slippage < 10 BPS
        uint256 lastSweetSpot = sweetSpot;
        uint256 lastSlippage = slippage;

        while (slippage > 10 && sweetSpot < MAXIMUM_SWEET_SPOT) {
            // cap at MAXIMUM_SWEET_SPOT to prevent infinite loops
            lastSweetSpot = sweetSpot;
            lastSlippage = slippage;

            sweetSpot = sweetSpot * 2;
            effectiveVolume = actualVolume / sweetSpot;

            // ensure we don't divide by zero
            if (effectiveVolume == 0) {
                break;
            }

            slippage = _calculateSlippage(effectiveVolume, actualReserveIn, actualReserveOut);
        }

        // binary search refinement if we crossed the target threshold
        if (lastSlippage > 10 && slippage <= 10) {
            uint256 low = lastSweetSpot;
            uint256 high = sweetSpot;

            for (uint256 i = 0; i < 5; i++) {
                uint256 mid = (low + high) / 2;
                uint256 midVolume = actualVolume / mid;

                if (midVolume == 0) {
                    break;
                }

                uint256 midSlippage = _calculateSlippage(midVolume, actualReserveIn, actualReserveOut);

                if (midSlippage <= 10) {
                    high = mid;
                    sweetSpot = mid;
                } else {
                    low = mid;
                }
            }
        }

        // @audit for alpha testing purposes, we regulate sweet spot between DEFAULT_SWEET_SPOT and MAXIMUM_SWEET_SPOT.
        // In production, these constraints should be configurable or removed
        if (sweetSpot <= 4) {
            sweetSpot = DEFAULT_SWEET_SPOT;
        }
        if (sweetSpot > MAXIMUM_SWEET_SPOT) {
            sweetSpot = MAXIMUM_SWEET_SPOT;
        }
    }

    /**
     * @dev Calculate slippage using constant product formula (x*y=k) for v4
     */
    function _calculateSlippage(
        uint256 volumeIn,
        uint256 reserveIn,
        uint256 reserveOut
    )
        internal
        pure
        returns (uint256 slippageBps)
    {
        // All values are now actual token amounts (not raw decimals)

        // k = reserveIn * reserveOut
        uint256 k = reserveIn * reserveOut;

        // volumeOut = reserveOut - (k / (reserveIn + volumeIn))
        uint256 denominator = reserveIn + volumeIn;

        if (denominator == 0) {
            return 0; // Return 0 slippage to prevent division by zero
        }

        uint256 volumeOut = reserveOut - (k / denominator);

        // Realized price = volumeOut / volumeIn (actual token amounts)
        // We need to scale for precision in the ratio calculation
        uint256 realizedPrice = volumeOut;
        uint256 realizedPriceBase = volumeIn;

        // Observed price = reserveOut / reserveIn (actual token amounts)
        uint256 observedPrice = reserveOut;
        uint256 observedPriceBase = reserveIn;

        // Calculate slippage: 1 - (realizedPrice / observedPrice)
        // priceRatio = (realizedPrice / realizedPriceBase) / (observedPrice / observedPriceBase)
        // priceRatio = (realizedPrice * observedPriceBase) / (realizedPriceBase * observedPrice)

        if (realizedPriceBase == 0 || observedPrice == 0) {
            return 0; // Return 0 slippage to prevent division by zero
        }

        uint256 priceRatio = (realizedPrice * observedPriceBase * 10_000) / (realizedPriceBase * observedPrice);

        // If priceRatio > 10000, it means we're getting a better price (negative slippage), set to 0
        if (priceRatio > 10_000) {
            slippageBps = 0;
        } else {
            slippageBps = 10_000 - priceRatio; // Slippage in basis points
        }
    }
}

