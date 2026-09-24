'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  DEFAULT_ICON,
  tokenIconCandidates,
} from '@/app/lib/utils/tokenIcon'

type ImageFallbackProps = {
  src: string
  alt: string
  /** Extra fallback URLs tried in order after `src` fails. */
  fallbacks?: string[]
  /** When set, builds a full candidate list (local + TrustWallet + default). */
  token?: {
    address?: string
    symbol?: string
    name?: string
  }
  [key: string]: any
}

export default function ImageFallback({
  src,
  alt,
  fallbacks,
  token,
  ...rest
}: ImageFallbackProps) {
  const candidates =
    token != null
      ? tokenIconCandidates({
          address: token.address,
          symbol: token.symbol,
          name: token.name,
          preferred: src,
        })
      : [
          src,
          ...(fallbacks ?? []),
          DEFAULT_ICON,
          '/placeholder-dark.jpg',
        ].filter(Boolean)

  const [index, setIndex] = useState(0)
  const imgSrc = candidates[Math.min(index, candidates.length - 1)]

  useEffect(() => {
    setIndex(0)
  }, [src, token?.address, token?.symbol])

  return (
    <Image
      {...rest}
      src={imgSrc}
      onLoadingComplete={(result) => {
        if (result.naturalWidth === 0 && index < candidates.length - 1) {
          setIndex((i) => i + 1)
        }
      }}
      onError={() => {
        if (index < candidates.length - 1) {
          setIndex((i) => i + 1)
        }
      }}
      alt={alt}
    />
  )
}
