import { Stream } from '../types/stream'

export const MOCK_STREAMS: Stream[] = [
  {
    id: '1',
    fromToken: {
      symbol: 'ETH',
      amount: 1,
      icon: '/tokens/eth.svg',
    },
    toToken: {
      symbol: 'USDC',
      estimatedAmount: 3300,
      icon: '/tokens/usdc.svg',
    },
    progress: {
      completed: 1,
      total: 2,
    },
    timeRemaining: 9,
    isInstasettle: true,
    // limit: {
    //   price: 3300,
    //   token: 'USDC',
    // },
  },
  {
    id: '2',
    fromToken: {
      symbol: 'ETH',
      amount: 2,
      icon: '/tokens/eth.svg',
    },
    toToken: {
      symbol: 'USDC',
      estimatedAmount: 6600,
      icon: '/tokens/usdc.svg',
    },
    progress: {
      completed: 2,
      total: 4,
    },
    timeRemaining: 15,
    isInstasettle: false,
  },
  {
    id: '3',
    fromToken: {
      symbol: 'USDC',
      amount: 5000,
      icon: '/tokens/usdc.svg',
    },
    toToken: {
      symbol: 'ETH',
      estimatedAmount: 1.5,
      icon: '/tokens/eth.svg',
    },
    progress: {
      completed: 3,
      total: 6,
    },
    timeRemaining: 20,
    isInstasettle: true,
  },
  {
    id: '4',
    fromToken: {
      symbol: 'ETH',
      amount: 0.5,
      icon: '/tokens/eth.svg',
    },
    toToken: {
      symbol: 'USDC',
      estimatedAmount: 1650,
      icon: '/tokens/usdc.svg',
    },
    progress: {
      completed: 0,
      total: 4,
    },
    timeRemaining: 30,
    isInstasettle: false,
    // limit: {
    //   price: 1650,
    //   token: 'USDC',
    // },
  },
  {
    id: '5',
    fromToken: {
      symbol: 'USDC',
      amount: 2000,
      icon: '/tokens/usdc.svg',
    },
    toToken: {
      symbol: 'ETH',
      estimatedAmount: 0.6,
      icon: '/tokens/eth.svg',
    },
    progress: {
      completed: 0,
      total: 3,
    },
    timeRemaining: 25,
    isInstasettle: true,
  },
  {
    id: '6',
    fromToken: {
      symbol: 'ETH',
      amount: 3,
      icon: '/tokens/eth.svg',
    },
    toToken: {
      symbol: 'USDC',
      estimatedAmount: 9900,
      icon: '/tokens/usdc.svg',
    },
    progress: {
      completed: 4,
      total: 4,
    },
    timeRemaining: 0,
    isInstasettle: true,
    // limit: {
    //   price: 3300,
    //   token: 'USDC',
    // },
  },
  {
    id: '7',
    fromToken: {
      symbol: 'USDC',
      amount: 10000,
      icon: '/tokens/usdc.svg',
    },
    toToken: {
      symbol: 'ETH',
      estimatedAmount: 3,
      icon: '/tokens/eth.svg',
    },
    progress: {
      completed: 2,
      total: 8,
    },
    timeRemaining: 45,
    isInstasettle: false,
  },
  {
    id: '8',
    fromToken: {
      symbol: 'ETH',
      amount: 5,
      icon: '/tokens/eth.svg',
    },
    toToken: {
      symbol: 'USDC',
      estimatedAmount: 16500,
      icon: '/tokens/usdc.svg',
    },
    progress: {
      completed: 1,
      total: 5,
    },
    timeRemaining: 35,
    isInstasettle: true,
    // limit: {
    //   price: 3300,
    //   token: 'USDC',
    // },
  },
  {
    id: '9',
    fromToken: {
      symbol: 'USDC',
      amount: 8000,
      icon: '/tokens/usdc.svg',
    },
    toToken: {
      symbol: 'ETH',
      estimatedAmount: 2.4,
      icon: '/tokens/eth.svg',
    },
    progress: {
      completed: 3,
      total: 4,
    },
    timeRemaining: 8,
    isInstasettle: false,
  },
  {
    id: '10',
    fromToken: {
      symbol: 'ETH',
      amount: 1.5,
      icon: '/tokens/eth.svg',
    },
    toToken: {
      symbol: 'USDC',
      estimatedAmount: 4950,
      icon: '/tokens/usdc.svg',
    },
    progress: {
      completed: 2,
      total: 3,
    },
    timeRemaining: 12,
    isInstasettle: true,
    // limit: {
    //   price: 3300,
    //   token: 'USDC',
    // },
  },
]

// Helper functions to filter streams
export const getOngoingStreams = () =>
  MOCK_STREAMS.filter(
    (stream) => stream.progress.completed < stream.progress.total
  )

export const getCompletedStreams = () =>
  MOCK_STREAMS.filter(
    (stream) => stream.progress.completed === stream.progress.total
  )

export const getScheduledStreams = () =>
  MOCK_STREAMS.filter((stream) => stream.progress.completed === 0)

export const getStreamsByWallet = (walletAddress: string) => {
  // In a real implementation, this would filter streams by wallet address
  // For now, return a subset of mock streams
  return MOCK_STREAMS.slice(0, 4)
}
