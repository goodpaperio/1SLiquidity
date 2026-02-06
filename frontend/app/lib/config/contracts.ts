// Define specific protocol contract types for type safety
export type UniswapV2Contracts = {
  ROUTER: string
  FACTORY: string
}

export type UniswapV3Contracts = {
  FACTORY: string
  QUOTER: string
}

export type SushiSwapContracts = {
  ROUTER: string
  FACTORY: string
}

export type NetworkContractMap = {
  [chainId: string]: {
    UNISWAP_V2: UniswapV2Contracts
    UNISWAP_V3: UniswapV3Contracts
    SUSHISWAP: SushiSwapContracts
  }
}

// Contract Addresses
export const CONTRACT_ADDRESSES = {
  UNISWAP_V2: {
    ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
  } as UniswapV2Contracts,
  UNISWAP_V3: {
    FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
  } as UniswapV3Contracts,
  SUSHISWAP: {
    ROUTER: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    FACTORY: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
  } as SushiSwapContracts,
}

// Chain IDs mapping
export const CHAIN_IDS = {
  ETHEREUM: '1',
  ARBITRUM: '42161',
  POLYGON: '137',
  BSC: '56',
}

// Network specific addresses
export const NETWORK_ADDRESSES: NetworkContractMap = {
  [CHAIN_IDS.ETHEREUM]: {
    UNISWAP_V2: {
      ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    },
    UNISWAP_V3: {
      FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    },
    SUSHISWAP: {
      ROUTER: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      FACTORY: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    },
  },
  [CHAIN_IDS.ARBITRUM]: {
    UNISWAP_V2: {
      ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Update with actual Arbitrum addresses
      FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    },
    UNISWAP_V3: {
      FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    },
    SUSHISWAP: {
      ROUTER: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
      FACTORY: '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac',
    },
  },
  // Add more chains as needed
}

// Type guard functions to help with type safety
const isUniswapV2Contract = (
  contract: 'ROUTER' | 'FACTORY' | 'QUOTER'
): contract is keyof UniswapV2Contracts => {
  return contract === 'ROUTER' || contract === 'FACTORY'
}

const isUniswapV3Contract = (
  contract: 'ROUTER' | 'FACTORY' | 'QUOTER'
): contract is keyof UniswapV3Contracts => {
  return contract === 'FACTORY' || contract === 'QUOTER'
}

const isSushiSwapContract = (
  contract: 'ROUTER' | 'FACTORY' | 'QUOTER'
): contract is keyof SushiSwapContracts => {
  return contract === 'ROUTER' || contract === 'FACTORY'
}

// Get address for specific chain and protocol
export const getContractAddress = (
  chainId: string,
  protocol: 'UNISWAP_V2' | 'UNISWAP_V3' | 'SUSHISWAP',
  contract: 'ROUTER' | 'FACTORY' | 'QUOTER'
): string => {
  // Try to get chain-specific address
  const chainAddresses = NETWORK_ADDRESSES[chainId]

  if (chainAddresses) {
    if (protocol === 'UNISWAP_V2' && isUniswapV2Contract(contract)) {
      return chainAddresses.UNISWAP_V2[contract]
    }
    if (protocol === 'UNISWAP_V3' && isUniswapV3Contract(contract)) {
      return chainAddresses.UNISWAP_V3[contract]
    }
    if (protocol === 'SUSHISWAP' && isSushiSwapContract(contract)) {
      return chainAddresses.SUSHISWAP[contract]
    }
  }

  // Fall back to default addresses
  if (protocol === 'UNISWAP_V2' && isUniswapV2Contract(contract)) {
    return CONTRACT_ADDRESSES.UNISWAP_V2[contract]
  }
  if (protocol === 'UNISWAP_V3' && isUniswapV3Contract(contract)) {
    return CONTRACT_ADDRESSES.UNISWAP_V3[contract]
  }
  if (protocol === 'SUSHISWAP' && isSushiSwapContract(contract)) {
    return CONTRACT_ADDRESSES.SUSHISWAP[contract]
  }

  throw new Error(
    `Contract address not found for ${protocol} ${contract} on chain ${chainId}`
  )
}
