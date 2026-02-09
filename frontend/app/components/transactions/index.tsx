'use client'

import { useEffect, useState } from 'react'
import { useAnimation, motion, Variants } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Copy, Check } from 'lucide-react'
import Navbar from '../navbar'
import ExplorerNav from '../explorer/ExplorerNav'
import TransactionsTable from './TransactionsTable'
import TransactionsTokenFilter from './TransactionsTokenFilter'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { formatWalletAddress } from '@/app/lib/helper'

const Transactions = () => {
  const controls = useAnimation()
  const searchParams = useSearchParams()
  const walletId = searchParams.get('walletId')

  const [selectedTokenFrom, setSelectedTokenFrom] = useState<TOKENS_TYPE | null>(null)
  const [selectedTokenTo, setSelectedTokenTo] = useState<TOKENS_TYPE | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    controls.start('visible')
  }, [controls])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0,
      },
    },
  }

  const copyWalletAddress = () => {
    if (walletId) {
      navigator.clipboard.writeText(walletId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Navbar />
      <ExplorerNav />

      {/* Topographic wave background - positioned below navbars */}
      <div
        className="absolute top-[108px] left-0 right-0 h-[340px] pointer-events-none"
        style={{
          backgroundImage: 'url(/heros/hero-3.png)',
          backgroundSize: '100% auto',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div className="mt-[108px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-6xl">
        {/* Title */}
        <motion.div
          className="mb-6"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          <h1 className="text-2xl md:text-3xl font-bold text-white text-left">
            {walletId ? 'Wallet Transactions' : 'All Transactions'}
          </h1>

          {/* Wallet Address Display */}
          {walletId && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-white/70">Wallet:</span>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#373d3f]">
                <a
                  href={`https://etherscan.io/address/${walletId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors font-mono"
                >
                  {formatWalletAddress(walletId)}
                </a>
                <button
                  onClick={copyWalletAddress}
                  className="text-white/50 hover:text-white transition-colors"
                  title="Copy wallet address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Token Filter */}
        <motion.div
          initial="hidden"
          animate={controls}
          variants={titleVariants}
          className="mb-8"
        >
          <TransactionsTokenFilter
            onTokenFromChange={setSelectedTokenFrom}
            onTokenToChange={setSelectedTokenTo}
            selectedTokenFrom={selectedTokenFrom}
            selectedTokenTo={selectedTokenTo}
          />
        </motion.div>

        {/* Transactions Table */}
        <motion.div
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          <TransactionsTable
            selectedTokenFrom={selectedTokenFrom}
            selectedTokenTo={selectedTokenTo}
            walletId={walletId}
          />
        </motion.div>
      </div>
    </div>
  )
}

export default Transactions
