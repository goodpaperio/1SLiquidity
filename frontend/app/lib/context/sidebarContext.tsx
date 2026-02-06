'use client'

import GlobalStreamSidebar from '@/app/components/sidebar/globalStreamSidebar'
import SelectTokenSidebar from '@/app/components/sidebar/selectTokenSidebar'
import WalletDetailsSidebar from '@/app/components/sidebar/walletDetailsSidebar'
import React, { createContext, useContext, useState, useCallback } from 'react'

type SidebarContextType = {
  showSelectTokenSidebar: (isOpen: boolean) => void
  showWalletDetailsSidebar: (isOpen: boolean) => void
  showGlobalStreamSidebar: (isOpen: boolean) => void
  isSelectTokenSidebarOpen: boolean
  isWalletDetailsSidebarOpen: boolean
  isGlobalStreamSidebarOpen: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

type SidebarProviderProps = {
  children: React.ReactNode
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
}) => {
  const [isSelectTokenSidebarOpen, setIsSelectTokenSidebarOpen] =
    useState(false)
  const [isWalletDetailsSidebarOpen, setIsWalletDetailsSidebarOpen] =
    useState(false)
  const [isGlobalStreamSidebarOpen, setIsGlobalStreamSidebarOpen] =
    useState(false)

  // Helper to check if any sidebar is open
  const isAnySidebarOpen = useCallback(() => {
    return (
      isSelectTokenSidebarOpen ||
      isWalletDetailsSidebarOpen ||
      isGlobalStreamSidebarOpen
    )
  }, [
    isSelectTokenSidebarOpen,
    isWalletDetailsSidebarOpen,
    isGlobalStreamSidebarOpen,
  ])

  // Helper to close all sidebars
  const closeAllSidebars = useCallback(() => {
    setIsSelectTokenSidebarOpen(false)
    setIsWalletDetailsSidebarOpen(false)
    setIsGlobalStreamSidebarOpen(false)
  }, [])

  // Handlers with conditional transition delay
  const showSelectTokenSidebar = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const anySidebarOpen = isAnySidebarOpen()
        closeAllSidebars()
        if (anySidebarOpen) {
          // Only delay if switching between sidebars
          setTimeout(() => setIsSelectTokenSidebarOpen(true), 300)
        } else {
          // Open immediately if no sidebar is open
          setIsSelectTokenSidebarOpen(true)
        }
      } else {
        setIsSelectTokenSidebarOpen(false)
      }
    },
    [closeAllSidebars, isAnySidebarOpen]
  )

  const showWalletDetailsSidebar = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const anySidebarOpen = isAnySidebarOpen()
        closeAllSidebars()
        if (anySidebarOpen) {
          setTimeout(() => setIsWalletDetailsSidebarOpen(true), 300)
        } else {
          setIsWalletDetailsSidebarOpen(true)
        }
      } else {
        setIsWalletDetailsSidebarOpen(false)
      }
    },
    [closeAllSidebars, isAnySidebarOpen]
  )

  const showGlobalStreamSidebar = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        const anySidebarOpen = isAnySidebarOpen()
        closeAllSidebars()
        if (anySidebarOpen) {
          setTimeout(() => setIsGlobalStreamSidebarOpen(true), 300)
        } else {
          setIsGlobalStreamSidebarOpen(true)
        }
      } else {
        setIsGlobalStreamSidebarOpen(false)
      }
    },
    [closeAllSidebars, isAnySidebarOpen]
  )

  return (
    <SidebarContext.Provider
      value={{
        showSelectTokenSidebar,
        showWalletDetailsSidebar,
        showGlobalStreamSidebar,
        isSelectTokenSidebarOpen,
        isWalletDetailsSidebarOpen,
        isGlobalStreamSidebarOpen,
      }}
    >
      {children}

      {/* Always render sidebars but control visibility with isOpen prop */}
      <SelectTokenSidebar
        isOpen={isSelectTokenSidebarOpen}
        onClose={() => {
          setIsSelectTokenSidebarOpen(false)
        }}
      />

      <WalletDetailsSidebar
        isOpen={isWalletDetailsSidebarOpen}
        onClose={() => {
          setIsWalletDetailsSidebarOpen(false)
        }}
      />

      <GlobalStreamSidebar
        isOpen={isGlobalStreamSidebarOpen}
        onClose={() => {
          setIsGlobalStreamSidebarOpen(false)
        }}
      />
    </SidebarContext.Provider>
  )
}
