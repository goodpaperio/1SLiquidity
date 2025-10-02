import { useEffect, useState } from 'react'
import { useAppKitProvider, useAppKitAccount } from '@reown/appkit/react'
import { getAverageBlockTime } from '../gas-calculations'
import type { Provider } from '@reown/appkit/react'
import { createProvider } from '../dex/calculators'

export function useStreamTime(
  streamCount: number | undefined,
  blockMultiplier = 2
) {
  const [estimatedTime, setEstimatedTime] = useState<string>('')
  const { walletProvider } = useAppKitProvider<Provider>('eip155')
  const { address } = useAppKitAccount()

  useEffect(() => {
    const calculateEstTime = async () => {
      if (!streamCount || streamCount <= 0) {
        console.log('Invalid streamCount, setting empty time')
        setEstimatedTime('')
        return
      }

      try {
        // Use wallet provider if connected (address exists), otherwise fall back to Alchemy provider
        const provider =
          address && walletProvider ? walletProvider : createProvider()

        const avgBlockTime = await getAverageBlockTime(provider)

        const totalSeconds = Math.round(
          avgBlockTime * blockMultiplier * streamCount
        )

        if (totalSeconds <= 0) {
          setEstimatedTime('')
          return
        }

        let formatted = ''
        if (totalSeconds < 60) {
          formatted = `${totalSeconds}s`
        } else if (totalSeconds < 3600) {
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60
          formatted = `${minutes}m${seconds > 0 ? ' ' + seconds + 's' : ''}`
        } else {
          const h = Math.floor(totalSeconds / 3600)
          const m = Math.floor((totalSeconds % 3600) / 60)
          formatted = `${h} hr${h > 1 ? 's' : ''}${
            m > 0 ? ' ' + m + ' min' : ''
          }`
        }

        // console.log('Setting formatted time:', formatted)
        setEstimatedTime(formatted)
      } catch (error) {
        console.error('Error calculating time:', error)
        setEstimatedTime('')
      }
    }

    calculateEstTime()
  }, [streamCount, walletProvider, address])

  return estimatedTime
}
