'use client'

import GlobalStreamModal from '@/app/components/modal/globalStreamModal'
import SelectTokenModal from '@/app/components/modal/selectTokenModal'
import WalletDetailsModal from '@/app/components/modal/walletDetailsModal'
import React, { createContext, useContext, useState } from 'react'
import { TOKENS_TYPE } from '../hooks/useWalletTokens'
import { ToastProvider } from './toastProvider'

type ModalContextType = {
  showSelectTokenModal: (isOpen: boolean, inputField?: 'from' | 'to') => void
  showWalletDetailsModal: (isOpen: boolean) => void
  showGlobalStreamModal: (isOpen: boolean) => void
  currentInputField: 'from' | 'to' | null
  selectedTokenFrom: TOKENS_TYPE | null
  selectedTokenTo: TOKENS_TYPE | null
  setSelectedTokenFrom: (token: TOKENS_TYPE | null) => void
  setSelectedTokenTo: (token: TOKENS_TYPE | null) => void
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

export const useModal = () => {
  const context = useContext(ModalContext)
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}

type ModalProviderProps = {
  children: React.ReactNode
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  const [isSelectTokenModalOpen, setIsSelectTokenModalOpen] = useState(false)
  const [isWalletDetailsModalOpen, setIsWalletDetailsModalOpen] =
    useState(false)
  const [isGlobalStreamModalOpen, setIsGlobalStreamModalOpen] = useState(false)
  const [currentInputField, setCurrentInputField] = useState<
    'from' | 'to' | null
  >(null)
  const [selectedTokenFrom, setSelectedTokenFrom] =
    useState<TOKENS_TYPE | null>(null)
  const [selectedTokenTo, setSelectedTokenTo] = useState<TOKENS_TYPE | null>(
    null
  )

  const showSelectTokenModal = (
    isOpen: boolean,
    inputField?: 'from' | 'to'
  ) => {
    if (inputField) {
      setCurrentInputField(inputField)
    }
    setIsSelectTokenModalOpen(true)
  }

  const showWalletDetailsModal = (isOpen: boolean) => {
    setIsWalletDetailsModalOpen(true)
  }

  const showGlobalStreamModal = (isOpen: boolean) => {
    setIsGlobalStreamModalOpen(true)
  }

  return (
    <ModalContext.Provider
      value={{
        showSelectTokenModal,
        showWalletDetailsModal,
        showGlobalStreamModal,
        currentInputField,
        selectedTokenFrom,
        selectedTokenTo,
        setSelectedTokenFrom,
        setSelectedTokenTo,
      }}
    >
      {children}
      {(isSelectTokenModalOpen ||
        isWalletDetailsModalOpen ||
        isGlobalStreamModalOpen) && (
        <ToastProvider>
          {isSelectTokenModalOpen && (
            <SelectTokenModal
              isOpen={isSelectTokenModalOpen}
              onClose={() => {
                setIsSelectTokenModalOpen(false)
                setCurrentInputField(null)
              }}
            />
          )}
          {isWalletDetailsModalOpen && (
            <WalletDetailsModal
              isOpen={isWalletDetailsModalOpen}
              onClose={() => setIsWalletDetailsModalOpen(false)}
            />
          )}
          {isGlobalStreamModalOpen && (
            <GlobalStreamModal
              isOpen={isGlobalStreamModalOpen}
              onClose={() => setIsGlobalStreamModalOpen(false)}
            />
          )}
        </ToastProvider>
      )}
    </ModalContext.Provider>
  )
}
