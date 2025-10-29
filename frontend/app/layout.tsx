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

const afacadVariable = localFont({
  src: './fonts/Afacad-Medium.ttf',
  variable: '--font-afacad-variable',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: {
    default: 'Decastream',
    template: '%s | Decastream', // For page-specific titles
  },
  description:
    'DECAStream intelligently splits large trades into optimized streams across multiple DEXs.',
  keywords: ['web3', 'defi', 'dex', 'trade', 'streaming'],
  authors: [{ name: 'Decastream' }],
  creator: 'Decastream',

  // Open Graph
  openGraph: {
    title: 'Decastream',
    description:
      'DECAStream intelligently splits large trades into optimized streams across multiple DEXs.',
    url: 'https://deca.stream',
    siteName: 'Decastream',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Decastream Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'Decastream',
    description:
      'DECAStream intelligently splits large trades into optimized streams across multiple DEXs.',
    creator: '@Decastream',
    images: ['/og-image.png'],
  },

  // Additional meta tags
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Icons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },

  // Verification (optional)
  // verification: {
  //   google: 'your-google-verification-code',
  //   // yandex: 'your-yandex-verification-code',
  //   // bing: 'your-bing-verification-code',
  // },
}

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
