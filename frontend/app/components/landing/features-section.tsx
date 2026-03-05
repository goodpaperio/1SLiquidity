'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import {
  FlameIcon,
  HeadsetIcon,
  InstasettleIconGradient,
  TypewriterIconWithoutAnimation,
} from '@/app/lib/icons'

const FeaturesSection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.3, once: false })
  const controls = useAnimation()

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

  const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.2, ease: 'easeOut' },
    },
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
    }),
  }

  return (
    <section
      ref={sectionRef}
      className="relative py-24 overflow-hidden min-h-screen flex flex-col justify-center"
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        {/* Section header - display font, accent bar, code comment */}
        <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
          <div>
            <motion.h2
              className="text-4xl md:text-5xl lg:text-6xl font-bold uppercase mb-4"
              initial="hidden"
              animate={controls}
              variants={titleVariants}
            >
              Built for Precision, Speed, and{' '}
              <span className="text-[#33f498]">Scale</span>
            </motion.h2>
            <div className="h-1 w-24 bg-white/20">
              <div className="h-full w-1/3 bg-[var(--primary)]" />
            </div>
          </div>
          <motion.p
            className="font-mono text-sm text-gray-400 max-w-sm text-right"
            initial="hidden"
            animate={controls}
            variants={subtitleVariants}
          >
            // EXECUTION LAYER
            <br />
            Smart order streaming, real-time DEX routing, and instant OTC
            settlement in a single interface.
          </motion.p>
        </div>

        {/* Bento grid: 3 cols, Stream-Based 2-col top, Multi-DEX tall right, Instasettle + Hot Pairs bottom */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Large card - Stream-Based Execution */}
          <motion.div
            className="md:col-span-2 relative group bg-[#0A0A0A] border border-white/10 p-8 md:p-12 overflow-hidden card-hover min-h-[400px]"
            initial="hidden"
            animate={controls}
            variants={cardVariants}
            custom={0.3}
          >
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <TypewriterIconWithoutAnimation className="w-6 h-6 text-[#33f498]" />
                  <span className="font-mono text-xs text-[#33f498] uppercase tracking-widest">
                    Execution
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold text-white uppercase mb-4 group-hover:text-[#33f498] transition-colors">
                  Stream-Based
                  <br />
                  Execution
                </h3>
                <p className="text-gray-400 max-w-md">
                  Large swaps auto-split into smaller streams using our Sweet Spot
                  algorithm—reducing price impact and total cost.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-2 text-sm font-mono text-gray-500 group-hover:text-white transition-colors">
                <span>EXPLORE</span> <ArrowRight className="w-4 h-4" />
              </div>
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
              <div
                className="w-full h-full border-l border-white/10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)_100%)]"
                style={{ backgroundSize: '20px 20px' }}
              />
            </div>
          </motion.div>

          {/* Tall card - Multi-DEX with terminal */}
          <motion.div
            className="md:row-span-2 relative group bg-[#0A0A0A] border border-white/10 p-8 overflow-hidden card-hover"
            initial="hidden"
            animate={controls}
            variants={cardVariants}
            custom={0.35}
          >
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <HeadsetIcon className="w-6 h-6 text-[#33f498]" />
                <span className="font-mono text-xs text-[#33f498] uppercase tracking-widest">
                  Routing
                </span>
              </div>
              <h3 className="text-3xl font-bold text-white uppercase mb-4 group-hover:text-[#33f498] transition-colors">
                Multi-DEX
                <br />
                Aggregation
              </h3>
              <p className="text-gray-400 text-sm mb-8">
                Trade streams route across top DEXs (Uniswap V2/V3, Sushiswap,
                Balancer V2), accessing the best liquidity and pricing in
                real-time.
              </p>
              <div className="mt-auto bg-black border border-white/10 p-4 font-mono text-[10px] rounded h-64 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-6 bg-white/5 border-b border-white/5 flex items-center px-2 gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#33f498]" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="pt-6 space-y-1 text-[#33f498]/80">
                  <p>&gt; route_stream 0x7a...9f</p>
                  <p>&gt; uniswap_v3 pool 0.12%</p>
                  <p className="text-yellow-500/80">
                    &gt; best_price: sushiswap
                  </p>
                  <p>&gt; splitting chunks...</p>
                  <p>&gt; 4/4 executed</p>
                  <p className="animate-pulse">_</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Instasettle card */}
          <motion.div
            className="relative group bg-[#0A0A0A] border border-white/10 p-8 overflow-hidden card-hover"
            initial="hidden"
            animate={controls}
            variants={cardVariants}
            custom={0.5}
          >
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <InstasettleIconGradient className="w-6 h-6 text-[#33f498]" />
                <span className="font-mono text-xs text-[#33f498] uppercase tracking-widest">
                  Settlement
                </span>
              </div>
              <h3 className="text-3xl font-bold text-white uppercase mb-4 group-hover:text-[#33f498] transition-colors">
                Instasettle
              </h3>
              <p className="text-gray-400 text-sm">
                Settle high-volume trades instantly, peer-to-peer—ideal for OTC
                and institutional swaps with configurable BPS margin.
              </p>
            </div>
          </motion.div>

          {/* Hot Pairs card */}
          <motion.div
            className="relative group bg-[#0A0A0A] border border-white/10 p-8 overflow-hidden card-hover"
            initial="hidden"
            animate={controls}
            variants={cardVariants}
            custom={0.55}
          >
            <div className="hud-corner hud-tl" />
            <div className="hud-corner hud-tr" />
            <div className="hud-corner hud-bl" />
            <div className="hud-corner hud-br" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <FlameIcon className="w-6 h-6 text-[#33f498]" />
                <span className="font-mono text-xs text-[#33f498] uppercase tracking-widest">
                  Analytics
                </span>
              </div>
              <h3 className="text-3xl font-bold text-white uppercase mb-4 group-hover:text-[#33f498] transition-colors">
                Hot Pairs
              </h3>
              <p className="text-gray-400 text-sm">
                Real-time insights with dynamically refreshed token pairs
                identified for optimal slippage savings.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
