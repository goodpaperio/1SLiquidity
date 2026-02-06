'use client'

import React, { ReactNode } from 'react'
import { config, projectId, wagmiAdapter } from '@/config'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Config, cookieToInitialState, State, WagmiProvider } from 'wagmi'
import { createAppKit } from '@reown/appkit/react'
import { mainnet, arbitrum } from 'viem/chains'

const queryClient = new QueryClient()

if (!projectId) throw new Error('Project ID is not defined')

const metadata = {
  name: 'appkit-example',
  description: 'AppKit Example',
  url: 'https://deca-swap-fe.vercel.app/', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
}

const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  // networks: [mainnet, arbitrum],
  networks: [mainnet],
  defaultNetwork: mainnet,
  metadata: metadata,
  features: {
    analytics: true,
    email: false,
    socials: false,
  },
})

export function Web3ModalProvider({
  children,
  cookies,
}: {
  children: ReactNode
  cookies: string | null
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  )
  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
