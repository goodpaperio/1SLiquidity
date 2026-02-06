// hooks/useTransactionListener.ts (Enhanced version with better filtering)
import { useEffect, useRef, useCallback } from 'react'

interface TransactionDetails {
  hash: string
  from: string
  to: string
  value: string
  type: 'incoming' | 'outgoing'
  isTokenTransfer: boolean
  tokenAddress?: string
}

interface UseTransactionListenerProps {
  walletAddress: string
  chain: string
  onTransaction: (details: TransactionDetails) => void
  enabled?: boolean
}

/**
 * Enhanced transaction listener that provides detailed transaction info
 * and ensures we only refresh when the current wallet is involved
 */
export const useTransactionListener = ({
  walletAddress,
  chain,
  onTransaction,
  enabled = true,
}: UseTransactionListenerProps) => {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 3

  const getAlchemyWsUrl = useCallback((chain: string) => {
    const urls: { [key: string]: string } = {
      eth: process.env.NEXT_PUBLIC_ALCHEMY_WS_URL_ETH || '',
      polygon: process.env.NEXT_PUBLIC_ALCHEMY_WS_URL_POLYGON || '',
      arbitrum: process.env.NEXT_PUBLIC_ALCHEMY_WS_URL_ARBITRUM || '',
    }
    return urls[chain.toLowerCase()] || urls['eth']
  }, [])

  const isTokenTransfer = useCallback((input: string) => {
    if (!input || input === '0x') return false

    // Check for ERC-20 transfer method signature (0xa9059cbb)
    // or transferFrom method signature (0x23b872dd)
    return input.startsWith('0xa9059cbb') || input.startsWith('0x23b872dd')
  }, [])

  const connect = useCallback(() => {
    if (
      !enabled ||
      !walletAddress ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return
    }

    const wsUrl = getAlchemyWsUrl(chain)
    if (!wsUrl) {
      console.warn('⚠️ No Alchemy WebSocket URL for chain:', chain)
      return
    }

    const currentWallet = walletAddress.toLowerCase()

    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log(
          '🔗 Connected to Alchemy WebSocket for wallet:',
          walletAddress
        )
        reconnectAttemptsRef.current = 0

        // Subscribe to address activity with specific filtering
        const subscribe = {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_subscribe',
          params: [
            'alchemy_pendingTransactions',
            {
              addresses: [
                { from: currentWallet }, // Outgoing transactions
                { to: currentWallet }, // Incoming transactions
              ],
            },
          ],
        }
        wsRef.current?.send(JSON.stringify(subscribe))
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Handle subscription confirmation (separate message with id and result as string)
          if (data.id === 1 && data.result && typeof data.result === 'string') {
            console.log(
              '📡 Subscribed to transactions for wallet:',
              currentWallet,
              'Subscription ID:',
              data.result
            )
            return
          }

          // console.log('🔍 Transaction data:', data)

          // Handle transaction notifications (your shared data structure)
          if (data.method === 'eth_subscription' && data.params?.result) {
            const tx = data.params.result

            // Double-check that transaction involves current wallet
            const isIncoming = tx.to && tx.to.toLowerCase() === currentWallet
            const isOutgoing =
              tx.from && tx.from.toLowerCase() === currentWallet

            if (isIncoming || isOutgoing) {
              const txType = isIncoming ? 'incoming' : 'outgoing'
              const isToken = isTokenTransfer(tx.input)

              const transactionDetails: TransactionDetails = {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value || '0x0',
                type: txType,
                isTokenTransfer: isToken,
                tokenAddress: isToken ? tx.to : undefined,
              }

              // console.log(`🔄 ${txType} transaction detected:`, {
              //   hash: tx.hash,
              //   isTokenTransfer: isToken,
              //   value: tx.value,
              // })

              onTransaction(transactionDetails)
            } else {
              // This shouldn't happen with proper subscription, but just in case
              // console.log(
              //   '🔍 Ignoring transaction not involving current wallet'
              // )
            }
          }
        } catch (error) {
          console.error('❌ WebSocket message error:', error)
        }
      }

      wsRef.current.onerror = (error) => {
        // console.error('❌ WebSocket error:', error)
      }

      wsRef.current.onclose = (event) => {
        // console.log('🔌 WebSocket disconnected:', event.code)

        // Reconnect if needed
        if (
          event.code !== 1000 &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            10000
          )
          // console.log(`🔄 Reconnecting in ${delay}ms...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error('❌ WebSocket connection error:', error)
    }
  }, [
    walletAddress,
    chain,
    enabled,
    onTransaction,
    getAlchemyWsUrl,
    isTokenTransfer,
  ])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close(1000)
      wsRef.current = null
    }
    reconnectAttemptsRef.current = 0
  }, [])

  useEffect(() => {
    if (enabled && walletAddress) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [connect, disconnect, enabled, walletAddress])

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  }
}
