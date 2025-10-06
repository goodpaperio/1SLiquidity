// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBalancerPool { 
    function getPoolId() external view returns (bytes32); 
}

interface IBalancerV2PoolRegistry {
    struct PoolInfo { 
        address pool; 
        bytes32 poolId; 
    }
    
    function getPools(address tokenA, address tokenB) external view returns (PoolInfo[] memory pools);
    function getPrimary(address tokenA, address tokenB) external view returns (PoolInfo memory primary, bool exists);
    function primaryIndex(address tokenA, address tokenB) external view returns (uint256);
}

contract BalancerV2PoolRegistry is IBalancerV2PoolRegistry {
    // --- Ownable ---
    address public owner;
    modifier onlyOwner() { 
        require(msg.sender == owner, "NOT_OWNER"); 
        _; 
    }
    
    constructor(address _owner) { 
        owner = _owner == address(0) ? msg.sender : _owner; 
    }
    
    function transferOwnership(address n) external onlyOwner { 
        owner = n; 
    }

    // Optional multi-writer
    mapping(address => bool) public isKeeper;
    function setKeeper(address k, bool v) external onlyOwner { 
        isKeeper[k] = v; 
    }
    
    modifier onlyKeeperOrOwner() { 
        require(msg.sender == owner || isKeeper[msg.sender], "NOT_AUTH"); 
        _; 
    }

    struct PairPools { 
        PoolInfo[] list; 
        uint256 primaryIdx; 
        bool exists; 
    }
    
    mapping(bytes32 => PairPools) private _pools;

    event PoolsSet(address indexed tokenA, address indexed tokenB, uint256 count, uint256 primaryIdx);
    event PoolAdded(address indexed tokenA, address indexed tokenB, address pool, uint256 newCount, bool primary);
    event PoolRemoved(address indexed tokenA, address indexed tokenB, uint256 idx, uint256 newCount);
    event PrimaryIndexSet(address indexed tokenA, address indexed tokenB, uint256 idx);

    function _key(address a, address b) internal pure returns (bytes32) {
        return (a < b) ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }

    function setPoolsForPair(address tokenA, address tokenB, address[] calldata poolAddrs, uint256 primaryIdx)
        external onlyKeeperOrOwner
    {
        require(tokenA != tokenB, "SAME_TOKEN");
        bytes32 key = _key(tokenA, tokenB);
        delete _pools[key].list;

        for (uint256 i = 0; i < poolAddrs.length; i++) {
            address p = poolAddrs[i];
            require(p != address(0), "POOL_0");
            _pools[key].list.push(PoolInfo({ 
                pool: p, 
                poolId: IBalancerPool(p).getPoolId() 
            }));
        }
        require(_pools[key].list.length > 0, "NO_POOLS");
        require(primaryIdx < _pools[key].list.length, "BAD_PRIMARY");
        _pools[key].primaryIdx = primaryIdx;
        _pools[key].exists = true;
        emit PoolsSet(tokenA, tokenB, _pools[key].list.length, primaryIdx);
    }

    function addPool(address tokenA, address tokenB, address pool, bool makePrimary)
        external onlyKeeperOrOwner
    {
        bytes32 key = _key(tokenA, tokenB);
        _pools[key].list.push(PoolInfo({ 
            pool: pool, 
            poolId: IBalancerPool(pool).getPoolId() 
        }));
        _pools[key].exists = true;
        if (makePrimary) _pools[key].primaryIdx = _pools[key].list.length - 1;
        emit PoolAdded(tokenA, tokenB, pool, _pools[key].list.length, makePrimary);
    }

    function removePoolAt(address tokenA, address tokenB, uint256 idx) external onlyKeeperOrOwner {
        bytes32 key = _key(tokenA, tokenB);
        require(idx < _pools[key].list.length, "IDX");
        uint256 last = _pools[key].list.length - 1;
        if (idx != last) _pools[key].list[idx] = _pools[key].list[last];
        _pools[key].list.pop();
        emit PoolRemoved(tokenA, tokenB, idx, _pools[key].list.length);
        if (_pools[key].list.length == 0) {
            delete _pools[key];
        } else if (_pools[key].primaryIdx >= _pools[key].list.length) {
            _pools[key].primaryIdx = 0;
        }
    }

    function setPrimaryIndex(address tokenA, address tokenB, uint256 idx) external onlyKeeperOrOwner {
        bytes32 key = _key(tokenA, tokenB);
        require(idx < _pools[key].list.length, "BAD_PRIMARY");
        _pools[key].primaryIdx = idx;
        emit PrimaryIndexSet(tokenA, tokenB, idx);
    }

    // Views
    function getPools(address tokenA, address tokenB) external view returns (PoolInfo[] memory pools) {
        return _pools[_key(tokenA, tokenB)].list;
    }
    
    function getPrimary(address tokenA, address tokenB) external view returns (PoolInfo memory primary, bool exists) {
        PairPools storage pp = _pools[_key(tokenA, tokenB)];
        exists = pp.exists && pp.list.length > 0;
        if (exists) primary = pp.list[pp.primaryIdx];
    }
    
    function primaryIndex(address tokenA, address tokenB) external view returns (uint256) {
        return _pools[_key(tokenA, tokenB)].primaryIdx;
    }
}
