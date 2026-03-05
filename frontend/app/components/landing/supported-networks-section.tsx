'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'

const networks = [
  { name: 'Ethereum', color: '#627EEA' },
  { name: 'Arbitrum', color: '#28A0F0' },
  { name: 'Optimism', color: '#FF0420' },
  { name: 'Polygon', color: '#8247E5' },
  { name: 'Base', color: '#0052FF' },
  { name: 'Avalanche', color: '#E84142' },
  { name: 'BSC', color: '#F3BA2F' },
  { name: 'Fantom', color: '#1969FF' },
  { name: 'Gnosis', color: '#04795B' },
  { name: 'zkSync', color: '#8C8DFC' },
  { name: 'Linea', color: '#61DFFF' },
  { name: 'Scroll', color: '#FFEEDA' },
  { name: 'Mantle', color: '#000000' },
  { name: 'Celo', color: '#FCFF52' },
]

function NetworkChip({ name, color }: { name: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-[#0A0A0A] border border-white/10 whitespace-nowrap transition-all duration-300 hover:border-[var(--primary)] group cursor-default">
      <div
        className="w-2 h-2 flex-shrink-0 transition-all duration-300 opacity-40 group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm font-mono text-white/50 group-hover:text-white transition-colors duration-300">
        {name}
      </span>
    </div>
  )
}

const SupportedNetworksSection = () => {
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

  const marqueeVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.8, delay: 0.3 },
    },
  }

  const row1 = networks.slice(0, 7)
  const row2 = networks.slice(7)

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
            // SUPPORTED_NETWORKS
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase mb-4">
            40+ Chains and Growing
          </h2>
          <p className="text-lg text-white/60 max-w-2xl font-mono text-sm">
            Cross-chain liquidity routing across all major EVM networks
          </p>
          <div className="h-1 w-24 bg-white/20 mt-4">
            <div className="h-full w-1/3 bg-[var(--primary)]" />
          </div>
        </motion.div>
      </div>

      {/* HUD-framed marquee area */}
      <motion.div
        className="relative border-y border-white/10 py-8"
        initial="hidden"
        animate={controls}
        variants={marqueeVariants}
      >
        <div className="absolute top-0 left-4 w-3 h-3 border-l border-t border-[var(--primary)]" />
        <div className="absolute top-0 right-4 w-3 h-3 border-r border-t border-[var(--primary)]" />
        <div className="absolute bottom-0 left-4 w-3 h-3 border-l border-b border-[var(--primary)]" />
        <div className="absolute bottom-0 right-4 w-3 h-3 border-r border-b border-[var(--primary)]" />

        <div className="space-y-4">
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
            <div className="flex gap-4 animate-marquee-left">
              {[...row1, ...row1, ...row1].map((network, i) => (
                <NetworkChip key={`r1-${i}`} {...network} />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
            <div className="flex gap-4 animate-marquee-right">
              {[...row2, ...row2, ...row2].map((network, i) => (
                <NetworkChip key={`r2-${i}`} {...network} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default SupportedNetworksSection
