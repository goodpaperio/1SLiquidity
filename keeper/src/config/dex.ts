import { ethers } from 'ethers';
import { CURVE_POOL_METADATA } from '../../data/curve-config';
import { BALANCER_POOL_METADATA } from '../../data/balancer-config';

// Contract Addresses
export const CONTRACT_ADDRESSES = {
  UNISWAP_V2: {
    ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  },
  UNISWAP_V3: {
    FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
  },
  SUSHISWAP: {
    ROUTER: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    FACTORY: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac'
  },
  CURVE: {
    REGISTRY: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5'
  },
  BALANCER: {
    VAULT: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
  }
};

export { CURVE_POOL_METADATA, BALANCER_POOL_METADATA };

// Contract ABIs
export const CONTRACT_ABIS = {
  UNISWAP_V2: {
    ROUTER: [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)',
      'function getAmountOut(uint amountIn, uint256 reserveIn, uint256 reserveOut) public view returns (uint amountOut)'
    ],
    FACTORY: [
      'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    PAIR: [
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() external view returns (address)',
      'function token1() external view returns (address)'
    ],
    ERC20: [
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)'
    ]
  },
  UNISWAP_V3: {
    FACTORY: [
      'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)',
      'function feeAmountTickSpacing(uint24 fee) external view returns (int24 tickSpacing)'

    ],
    QUOTER: [
      'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'
    ],
    POOL: [
      'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
      'function liquidity() external view returns (uint128)',
      'function token0() external view returns (address)'
    ]
  },
  SUSHISWAP: {
    ROUTER: [
      'function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)'
    ],
    FACTORY: [
      'function getPair(address tokenA, address tokenB) external view returns (address pair)'
    ],
    PAIR: [
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function token0() external view returns (address)',
      'function token1() external view returns (address)'
    ]
  },
  CURVE: {
    POOL: [
      'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
      'function get_dy_underlying(int128 i, int128 j, uint256 dx) external view returns (uint256)',
      'function balances(uint256 arg0) external view returns (uint256)',
      'function coins(uint256 i) external view returns (address)',
      'function underlying_coins(uint256 i) external view returns (address)',
      'function A() external view returns (uint256)',
      'function fee() external view returns (uint256)',
      'function admin_fee() external view returns (uint256)',
      'function get_virtual_price() external view returns (uint256)',
      'function is_meta() external view returns (bool)',
      'function calc_token_amount(uint256[2] memory amounts, bool deposit) external view returns (uint256)',
      'function calc_token_amount(uint256[3] memory amounts, bool deposit) external view returns (uint256)',
      'function calc_token_amount(uint256[4] memory amounts, bool deposit) external view returns (uint256)'
    ],
    REGISTRY: [
      'function get_pool_from_lp_token(address lp_token) external view returns (address)',
      'function get_lp_token(address pool) external view returns (address)',
      'function get_coins(address pool) external view returns (address[8] memory)',
      'function get_underlying_coins(address pool) external view returns (address[8] memory)',
      'function get_n_coins(address pool) external view returns (uint256)',
      'function is_meta(address pool) external view returns (bool)'
    ]
  },
  BALANCER: {
    VAULT: [
      'function getPoolTokens(bytes32 poolId) external view returns (address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock)',
      'function getPool(bytes32 poolId) external view returns (address, uint8)',
      'function queryBatchSwap(uint8 kind, tuple(bytes32 poolId, uint256 assetInIndex, uint256 assetOutIndex, uint256 amount, bytes userData)[] swaps, address[] assets, tuple(address sender, bool fromInternalBalance, address payable recipient, bool toInternalBalance) funds) external returns (int256[] assetDeltas)'
    ],
    POOL: [
      'function getPoolId() external view returns (bytes32)',
      'function getSwapFeePercentage() external view returns (uint256)',
      'function getPoolType() external view returns (uint256)',
      'function getNormalizedWeights() external view returns (uint256[] memory)',
      'function getTotalSupply() external view returns (uint256)'
    ]
  }
};

// Common utilities
export const COMMON = {
  ZERO_ADDRESS: ethers.ZeroAddress,
  parseEther: (amount: string) => ethers.parseEther(amount),
  formatEther: (amount: bigint) => ethers.formatEther(amount)
}; 