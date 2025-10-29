import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  ApolloProvider,
  HomeProviders,
  ReactQueryProvider,
  Web3ModalProvider,
} from './providers'
import { Toaster } from 'react-hot-toast'
import { generatePageMetadata } from '@/utils/metadata'

const afacadVariable = localFont({
  src: './fonts/Afacad-Medium.ttf',
  variable: '--font-afacad-variable',
  weight: '100 900',
})

export const metadata: Metadata = generatePageMetadata({
  description:
    'DECAStream intelligently splits large trades into optimized streams across multiple DEXs.',
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookies = (await headers()).get('cookie')

  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${afacadVariable.className} antialiased overflow-x-hidden`}
      >
        <TooltipProvider>
          <Web3ModalProvider cookies={cookies}>
            <ReactQueryProvider>
              <ApolloProvider>
                <HomeProviders>
                  {children}

                  <Toaster
                    position="top-right"
                    toastOptions={{
                      style: {
                        background: '#1f2937',
                        color: '#f9fafb',
                        border: '1px solid #374151',
                      },
                      success: {
                        iconTheme: {
                          primary: '#10b981',
                          secondary: '#f9fafb',
                        },
                      },
                      error: {
                        iconTheme: {
                          primary: '#ef4444',
                          secondary: '#f9fafb',
                        },
                      },
                    }}
                  />
                </HomeProviders>
              </ApolloProvider>
            </ReactQueryProvider>
          </Web3ModalProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
