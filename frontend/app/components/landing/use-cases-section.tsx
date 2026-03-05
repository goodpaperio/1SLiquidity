'use client'

import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useInView,
  useAnimation,
  AnimatePresence,
  type Variants,
} from 'framer-motion'
import { Users, TrendingUp, Handshake, Blocks } from 'lucide-react'

const useCases = [
  {
    id: 'retail',
    label: 'Retail Traders',
    icon: Users,
    painPoint: 'High slippage on large swaps',
    solution:
      'Stream execution with 99% price accuracy. DECAStream automatically breaks your trade into optimal chunks, executing each at the best available price across multiple DEXs.',
  },
  {
    id: 'market-makers',
    label: 'Market Makers',
    icon: TrendingUp,
    painPoint: 'Poor DEX depth for arbitrage',
    solution:
      'Hot Pairs identification with $100K+ savings potential. Real-time analytics surface the most profitable token pairs with deep liquidity analysis across all connected DEXs.',
  },
  {
    id: 'otc',
    label: 'OTC Desks',
    icon: Handshake,
    painPoint: 'MEV attacks & front-running',
    solution:
      'Instasettle for instant peer-to-peer settlement. Execute large block trades directly without exposing orders to the mempool, eliminating MEV extraction and front-running.',
  },
  {
    id: 'defi',
    label: 'DeFi Protocols',
    icon: Blocks,
    painPoint: 'Need optimal routing',
    solution:
      "Subgraph API for integration. Programmatically access DECAStream's routing engine, stream execution, and analytics through our developer-friendly GraphQL API.",
  },
]

const UseCasesSection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.3, once: false })
  const controls = useAnimation()
  const [activeTab, setActiveTab] = useState('retail')

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else {
      controls.start('hidden')
    }
  }, [isInView, controls])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  }

  const contentVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.3, ease: 'easeOut' },
    },
  }

  const activeCase = useCases.find((c) => c.id === activeTab)!

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <motion.div
          className="mb-14"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          <div className="font-mono text-xs text-[#33f498] tracking-widest mb-4">
            // USE_CASES
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase">
            Built for Every Trader
          </h2>
          <div className="h-1 w-24 bg-white/20 mt-4">
            <div className="h-full w-1/3 bg-[var(--primary)]" />
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate={controls}
          variants={contentVariants}
        >
          {/* Angular / clipped tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {useCases.map((uc) => {
              const Icon = uc.icon
              const isActive = activeTab === uc.id
              return (
                <button
                  key={uc.id}
                  onClick={() => setActiveTab(uc.id)}
                  className={`relative flex items-center gap-2 px-5 py-2.5 text-sm font-mono tracking-widest uppercase transition-all duration-300 overflow-hidden ${isActive ? 'clip-diagonal bg-[var(--primary)] text-black' : 'border border-white/10 bg-[#0A0A0A] text-white/60 hover:border-[#33f498]/50 hover:text-white/80'}`}
                >
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">{uc.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab content - HUD card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="max-w-4xl mx-auto"
            >
              <div className="relative bg-[#0A0A0A] border border-white/10 p-8 md:p-10 overflow-hidden card-hover">
                <div className="hud-corner hud-tl" />
                <div className="hud-corner hud-tr" />
                <div className="hud-corner hud-bl" />
                <div className="hud-corner hud-br" />

                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Pain point - with vertical green line to the right on desktop */}
                  <div className="md:border-r border-white/10 md:pr-8">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-white/40 mb-3">
                      [ THE_CHALLENGE ]
                    </div>
                    <div className="text-lg text-white/90 font-medium mb-4">
                      {activeCase.painPoint}
                    </div>
                    <div className="w-12 h-[2px] bg-[var(--primary-red)]" />
                  </div>

                  {/* Solution */}
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-[#33f498] mb-3">
                      [ DECASTREAM_SOLUTION ]
                    </div>
                    <p className="text-white/70 leading-relaxed">
                      {activeCase.solution}
                    </p>
                    <div className="mt-4 w-12 h-[2px] bg-[var(--primary)]" />
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}

export default UseCasesSection
