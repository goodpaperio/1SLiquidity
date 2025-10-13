import { title } from 'process'

export const NAV_LINKS: NAV_LINKS[] = [
  {
    title: 'Stream',
    href: '/',
    icon: '/icons/swaps.svg',
  },
  {
    title: 'Instasettle',
    href: '/instasettle',
    icon: '/icons/instasettle.svg',
  },
  {
    title: 'Hot Pairs',
    href: '/hotpairs',
    icon: '/icons/fire.svg',
  },
  {
    title: 'Docs',
    href: '/docs',
    icon: '/icons/docs.svg',
  },
  // {
  //   title: 'Pools',
  //   href: '/pools',
  //   icon: '/icons/pools.svg',
  // },
]

export const TOKENS: TOKENS_TYPE[] = [
  {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '/tokens/eth.svg',
    popular: true,
    value: 0.055,
    status: 'increase',
    statusAmount: 0.005,
  },
  {
    name: 'USDT',
    symbol: 'USDT',
    icon: '/tokens/usdt.svg',
    popular: false,
    value: 0.055,
    status: 'decrease',
    statusAmount: 1.353,
  },
  {
    name: 'USDC BSC',
    symbol: 'USDC',
    icon: '/tokens/usdc.svg',
    popular: true,
    value: 0.055,
    status: 'increase',
    statusAmount: 0.005,
  },
  {
    name: 'W Bitcoin',
    symbol: 'WBTC',
    icon: '/tokens/wbtc.svg',
    popular: false,
    value: 0.055,
    status: 'decrease',
    statusAmount: 1.353,
  },
  {
    name: 'Binance Coin',
    symbol: 'BTRST',
    icon: '/tokens/btrst.svg',
    popular: true,
    value: 0.055,
    status: 'increase',
    statusAmount: 0.005,
  },
  {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '/tokens/eth.svg',
    popular: false,
    value: 0.055,
    status: 'decrease',
    statusAmount: 1.353,
  },
  {
    name: 'USDT',
    symbol: 'USDT',
    icon: '/tokens/usdt.svg',
    popular: true,
    value: 0.055,
    status: 'increase',
    statusAmount: 0.005,
  },
  {
    name: 'USDC BSC',
    symbol: 'USDC',
    icon: '/tokens/usdc.svg',
    popular: false,
    value: 0.055,
    status: 'decrease',
    statusAmount: 1.353,
  },
  {
    name: 'W Bitcoin',
    symbol: 'WBTC',
    icon: '/tokens/wbtc.svg',
    popular: true,
    value: 0.055,
    status: 'increase',
    statusAmount: 0.005,
  },
  {
    name: 'Binance Coin',
    symbol: 'BTRST',
    icon: '/tokens/btrst.svg',
    popular: false,
    value: 0.055,
    status: 'decrease',
    statusAmount: 1.353,
  },
]

export const WALLET_TABS: TABS[] = [
  {
    title: 'Streams',
  },
  {
    title: 'Tokens',
  },
]

export const SEL_SECTION_TABS: TABS[] = [
  {
    title: 'Market',
  },
  // {
  //   title: 'Limit',
  // },
]

export const OVERALL_SECTION_TABS: TABS[] = [
  {
    title: 'Volume',
  },
  {
    title: 'TVL',
  },
  {
    title: 'Rewards',
  },
]

export const POOL_TOKEN_TABS: TABS[] = [
  {
    title: 'Volume',
  },
  {
    title: 'Liquidity',
  },
]

export const DAYS: TABS[] = [
  {
    title: '1D',
  },
  {
    title: '1W',
  },
  {
    title: '1M',
  },
  {
    title: '1Y',
  },
  {
    title: 'ALL',
  },
]

export const EXPLORE_TABS: TABS[] = [
  {
    title: 'All',
  },
  {
    title: 'My Pools',
  },
]

export const ACTIVITY_TABS: TABS[] = [
  {
    title: 'All',
  },
  {
    title: 'My Activity',
  },
]

export const LIQUIDITY_STATS_TABS: TABS[] = [
  {
    title: 'Pool Stats',
  },
  {
    title: 'My Stats',
  },
]

export const LIQUIDITY_STATS_DATA: LIQUIDITY_STATS_DATA[] = [
  {
    title: 'Liquidity',
    value: '$373.75M',
    status: 'decrease',
    statusAmount: '$22.39 (2.39%)',
    graphData: [50, 45, 40, 38, 42, 45, 48],
  },
  {
    title: 'TVL',
    value: '$373.75M',
    status: 'increase',
    statusAmount: '$22.39 (2.39%)',
    graphData: [50, 45, 40, 38, 42, 45, 48],
  },
  {
    title: 'APR for LPs',
    value: '$373.75M',
    status: 'decrease',
    statusAmount: '$22.39 (2.39%)',
    graphData: [50, 45, 40, 38, 42, 45, 48],
  },
  {
    title: 'Fees (24h)',
    value: '$373.75M',
    status: 'increase',
    statusAmount: '$22.39 (2.39%)',
    graphData: [50, 45, 40, 38, 42, 45, 48],
  },
  {
    title: 'CLAIMABLE REWARDS',
    value: '$373.75M',
    status: 'increase',
    statusAmount: '$22.39 (2.39%)',
    graphData: [50, 45, 40, 38, 42, 45, 48],
  },
]
