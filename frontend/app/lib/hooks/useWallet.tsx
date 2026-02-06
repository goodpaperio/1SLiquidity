// hooks/useWallet.ts
import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import {
  useAppKitAccount,
  useAppKitProvider,
  useAppKitState,
} from '@reown/appkit/react'

export const useWallet = () => {
  // Use AppKit's built-in hooks
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider('eip155')
  const stateData = useAppKitState()

  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null)

  // Get chainId from AppKit state
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = parseInt(chainIdWithPrefix.split(':')[1])

  // Initialize provider and signer when wallet is connected
  useEffect(() => {
    const initializeProvider = async () => {
      try {
        if (isConnected && walletProvider) {
          const ethersProvider = new ethers.providers.Web3Provider(
            walletProvider
          )
          const ethersSigner = ethersProvider.getSigner()

          setProvider(ethersProvider)
          setSigner(ethersSigner)
        } else {
          // Clear states when disconnected
          setProvider(null)
          setSigner(null)
        }
      } catch (error) {
        console.error('Error initializing provider:', error)
        setProvider(null)
        setSigner(null)
      }
    }

    initializeProvider()
  }, [isConnected, walletProvider])

  const getSigner = useCallback((): ethers.Signer | null => {
    if (!signer || !isConnected) {
      return null
    }
    return signer
  }, [signer, isConnected])

  const checkConnection = useCallback(async () => {
    // AppKit handles connection state, so this is mainly for manual refresh if needed
    if (isConnected && walletProvider) {
      try {
        const ethersProvider = new ethers.providers.Web3Provider(walletProvider)
        const ethersSigner = ethersProvider.getSigner()
        setProvider(ethersProvider)
        setSigner(ethersSigner)
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }
  }, [isConnected, walletProvider])

  return {
    isConnected,
    address,
    signer,
    provider,
    chainId,
    getSigner,
    checkConnection,
  }
}
