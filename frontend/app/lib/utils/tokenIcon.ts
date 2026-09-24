import { utils } from 'ethers'

const DEFAULT_ICON = '/icons/default-token.svg'

/** Local asset stems that exist under public/tokens (without extension). */
const LOCAL_ICON_STEMS = new Set([
  'aave',
  'bnb',
  'btrst',
  'dai',
  'etc',
  'eth',
  'eth-blue',
  'ether',
  'leo',
  'leo-token',
  'usdc',
  'usdt',
  'wbtc',
  'weth',
])

function addLocalVariants(
  add: (url?: string | null) => void,
  stem: string,
  onlyKnown: boolean
) {
  if (onlyKnown && !LOCAL_ICON_STEMS.has(stem)) return
  add(`/tokens/${stem}.svg`)
  add(`/tokens/${stem}.webp`)
  add(`/tokens/${stem}.png`)
}

/**
 * Build candidate icon URLs for a token.
 * Prefer known local assets, then TrustWallet CDN, then default.
 */
export function tokenIconCandidates(opts: {
  address?: string
  symbol?: string
  name?: string
  preferred?: string
}): string[] {
  const candidates: string[] = []
  const seen = new Set<string>()

  const add = (url?: string | null) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    candidates.push(url)
  }

  add(opts.preferred)

  const stems = [
    opts.symbol?.toLowerCase(),
    opts.name?.toLowerCase(),
  ].filter(Boolean) as string[]

  // Known local files first
  for (const stem of stems) {
    addLocalVariants(add, stem, true)
  }

  if (opts.symbol?.toLowerCase() === 'usdt') {
    add('/tokens/usdt.png')
    add('/tokens/usdt.svg')
  }

  const trust = trustWalletIconUrl(opts.address)
  if (trust) add(trust)

  // Speculative local paths last (may 404) before default
  for (const stem of stems) {
    addLocalVariants(add, stem, false)
  }

  add(DEFAULT_ICON)
  return candidates
}

/** Primary icon URL for token list entries. */
export function resolveTokenIcon(opts: {
  address?: string
  symbol?: string
  name?: string
  preferred?: string
}): string {
  const [first] = tokenIconCandidates(opts)
  return first ?? DEFAULT_ICON
}

export function trustWalletIconUrl(address?: string): string | null {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) return null
  try {
    const checksum = utils.getAddress(address)
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksum}/logo.png`
  } catch {
    return null
  }
}

export { DEFAULT_ICON }
