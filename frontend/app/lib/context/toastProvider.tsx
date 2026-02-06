'use client'

import Image from 'next/image'
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from 'react'

interface Toast {
  id: number | string
  content: ReactNode
  exiting: boolean
  autoClose?: boolean
  autoCloseDelay?: number
}

interface ToastContextType {
  addToast: (
    content: ReactNode,
    id?: string,
    autoClose?: boolean,
    autoCloseDelay?: number
  ) => void
  updateToast: (
    id: string,
    content: ReactNode,
    autoClose?: boolean,
    autoCloseDelay?: number
  ) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [counter, setCounter] = useState(0)
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const addToast = useCallback(
    (
      content: ReactNode,
      id?: string,
      autoClose: boolean = true,
      autoCloseDelay: number = 2000
    ) => {
      const toastId = id || counter.toString()

      // Clear existing timeout for this toast if it exists
      const existingTimeout = timeoutsRef.current.get(toastId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      const newToast = {
        id: toastId,
        content,
        exiting: false,
        autoClose,
        autoCloseDelay,
      }

      setToasts((prevToasts) => {
        // If toast with same ID exists, update it instead of adding new one
        const existingIndex = prevToasts.findIndex(
          (toast) => toast.id === toastId
        )
        if (existingIndex !== -1) {
          const updatedToasts = [...prevToasts]
          updatedToasts[existingIndex] = newToast
          return updatedToasts
        }
        return [...prevToasts, newToast]
      })

      // Set auto-close timeout
      if (autoClose) {
        const timeout = setTimeout(() => {
          removeToast(toastId)
        }, autoCloseDelay)
        timeoutsRef.current.set(toastId, timeout)
      }

      if (!id) {
        setCounter((prevCounter) => prevCounter + 1)
      }
    },
    [counter]
  )

  const updateToast = useCallback(
    (
      id: string,
      content: ReactNode,
      autoClose: boolean = true,
      autoCloseDelay: number = 2000
    ) => {
      // Clear existing timeout for this toast if it exists
      const existingTimeout = timeoutsRef.current.get(id)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      setToasts((prevToasts) =>
        prevToasts.map((toast) =>
          toast.id === id
            ? { ...toast, content, autoClose, autoCloseDelay }
            : toast
        )
      )

      // Set new auto-close timeout
      if (autoClose) {
        const timeout = setTimeout(() => {
          removeToast(id)
        }, autoCloseDelay)
        timeoutsRef.current.set(id, timeout)
      }
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    // Clear timeout when manually removing
    const timeout = timeoutsRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(id)
    }

    setToasts((prevToasts) =>
      prevToasts.map((toast) =>
        toast.id === id ? { ...toast, exiting: true } : toast
      )
    )
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
    }, 500)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, updateToast, removeToast }}>
      {children}
      <div
        className="fixed left-0 bottom-0 p-4 space-y-2 z-50"
        style={{ zIndex: 1000 }}
      >
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className={`bg-black opacity-95 w-[90vw] max-w-[372px] text-white px-2 md:px-5 py-4 rounded-[15px] border border-white14 relative overflow-hidden
                        ${
                          toast.exiting
                            ? 'animate-fadeOut'
                            : 'animate-fadeInSlideUp'
                        }`}
          >
            <div>{toast.content}</div>
            <div
              className="absolute bottom-0 left-0 bg-white14 h-1"
              style={{ animation: 'fillup 2s linear forwards' }}
            ></div>
            <Image
              src="/icons/close.svg"
              alt="close"
              width={200}
              height={200}
              className="absolute top-5 right-5 cursor-pointer w-3 h-3 mt-0.5"
              onClick={() => removeToast(toast.id.toString())}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
