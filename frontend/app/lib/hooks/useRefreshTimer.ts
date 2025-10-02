import { useEffect, useRef, useState } from 'react'

interface UseRefreshTimerProps {
  duration: number
  onRefresh: () => void
  isActive: boolean
  sellAmount: number
  isCalculating: boolean // This now represents both calculating and fetching states
}

export const useRefreshTimer = ({
  duration,
  onRefresh,
  isActive,
  sellAmount,
  isCalculating,
}: UseRefreshTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration)
  const [timerActive, setTimerActive] = useState(false)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const prevSellAmountRef = useRef(sellAmount)
  const isRefreshingRef = useRef(false)

  // Set timer active state based on conditions
  useEffect(() => {
    if (isActive && !isCalculating) {
      setTimerActive(true)
    } else {
      setTimerActive(false)
      // Reset timer when becoming inactive
      setTimeRemaining(duration)
    }
  }, [isActive, isCalculating, duration])

  // Handle timer countdown and refresh
  useEffect(() => {
    if (!isActive || isCalculating) {
      return
    }

    const startTimer = () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }

      // Only reset time if we're not currently refreshing and not calculating
      if (!isRefreshingRef.current && !isCalculating) {
        setTimeRemaining(duration)
      }

      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          // If we're calculating or refreshing, pause at current time
          if (isCalculating || isRefreshingRef.current) {
            return prev
          }

          // If timer hits zero
          if (prev <= 0) {
            // Start refresh if not already refreshing and not calculating
            if (!isRefreshingRef.current && !isCalculating) {
              isRefreshingRef.current = true
              onRefresh()
              // Reset refreshing state after a delay
              setTimeout(() => {
                isRefreshingRef.current = false
                if (!isCalculating) {
                  setTimeRemaining(duration)
                }
              }, 1000) // Give enough time for refresh to complete
            }
            return 0
          }

          return prev - 1
        })
      }, 1000)
    }

    startTimer()

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [duration, onRefresh, isActive, isCalculating])

  // Handle sell amount changes
  useEffect(() => {
    if (sellAmount !== prevSellAmountRef.current && isActive) {
      prevSellAmountRef.current = sellAmount
      // Only reset timer if we're not currently refreshing and not calculating
      if (!isRefreshingRef.current && !isCalculating) {
        setTimeRemaining(duration)
      }
    }
  }, [sellAmount, duration, isActive, isCalculating])

  const resetTimer = () => {
    // Only reset if not currently refreshing and not calculating
    if (!isRefreshingRef.current && !isCalculating) {
      setTimeRemaining(duration)
      onRefresh()
    }
  }

  return {
    timeRemaining,
    timerActive,
    resetTimer,
  }
}
