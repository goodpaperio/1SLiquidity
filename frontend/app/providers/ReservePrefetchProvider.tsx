'use client'

import { ReactNode } from 'react'
import { usePrefetchReserves } from '@/app/lib/hooks/usePrefetchReserves'
import { useDynamicReserveCache } from '@/app/lib/hooks/useDynamicReserveCache'
import { useAppKitState } from '@reown/appkit/react'

interface ReservePrefetchProviderProps {
  children: ReactNode
}

export const ReservePrefetchProvider = ({
  children,
}: ReservePrefetchProviderProps) => {
  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]

  // Initialize both prefetched and dynamic caches
  usePrefetchReserves({ chainId })
  useDynamicReserveCache({ chainId })

  // Simply render children since this is just for background prefetching
  return <>{children}</>
}
