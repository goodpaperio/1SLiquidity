'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'

const highlights = [
  'Reduces slippage to under 10 BPS for top 250 tokens',
  'Achieves ~99% price accuracy vs global market price',
  'Streams trades deterministically using Sweet Spot Algorithm',
  'Autonomous maintenance via server-side bots',
]

const WhatIsSection = () => {
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

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.2, ease: 'easeOut' },
    },
  }

  const bulletVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: (delay: number) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.6, delay, ease: 'easeOut' },
    }),
  }

  const imageVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, x: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: { duration: 0.8, delay: 0.3, ease: 'easeOut' },
    },
  }

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <div className="relative group bg-[#0A0A0A] border border-white/10 p-8 md:p-12 overflow-hidden card-hover min-h-[400px]">
          <div className="hud-corner hud-tl" />
          <div className="hud-corner hud-tr" />
          <div className="hud-corner hud-bl" />
          <div className="hud-corner hud-br" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            {/* Text column */}
            <div className="lg:col-span-3">
              <motion.div
                className="font-mono text-xs text-[#33f498] tracking-widest mb-4"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                // ABOUT_DECASTREAM
              </motion.div>

              <div className="h-1 w-24 bg-white/20 mb-6">
                <div className="h-full w-1/3 bg-[var(--primary)]" />
              </div>

              <motion.h2
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase mb-6"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                What is{' '}
                <span className="text-[#33f498]">DECAStream</span>?
              </motion.h2>

              <motion.p
                className="text-lg text-white/70 mb-4"
                initial="hidden"
                animate={controls}
                variants={textVariants}
              >
                DECAStream is designed to reduce slippage to under 10 BPS for the
                top 250 tokens against core tokens (WBTC, WETH, DAI, USDC, USDT).
              </motion.p>

              <motion.p
                className="text-lg text-white/70 mb-8"
                initial="hidden"
                animate={controls}
                variants={{
                  ...textVariants,
                  visible: {
                    ...textVariants.visible,
                    transition: { duration: 0.8, delay: 0.35, ease: 'easeOut' },
                  },
                }}
              >
                For illiquid tokens like PEPE/WETH with high market cap but low
                DEX liquidity, executing large trades incurs considerable
                slippage loss. DECAStream streams trades out chunk by chunk,
                achieving as close to 99% price accuracy compared to global
                market price.
              </motion.p>

              {/* Bullet points - HUD style checkmarks */}
              <div className="space-y-4">
                {highlights.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3"
                    initial="hidden"
                    animate={controls}
                    variants={bulletVariants}
                    custom={0.4 + index * 0.1}
                  >
                    <div className="mt-0.5 w-4 h-4 flex-shrink-0 border border-[var(--primary)] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-[var(--primary)]" />
                    </div>
                    <span className="text-white/80">{item}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Visual column with stripe overlay */}
            <motion.div
              className="lg:col-span-2 relative"
              initial="hidden"
              animate={controls}
              variants={imageVariants}
            >
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 h-full opacity-20 pointer-events-none">
                  <div
                    className="w-full h-full border-l border-white/10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.05)_25%,rgba(255,255,255,0.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)_100%)] bg-[size:20px_20px]"
                    style={{ backgroundSize: '20px 20px' }}
                  />
                </div>
                <div className="relative h-full w-full flex items-center justify-center">
                  <div className="relative w-full h-full overflow-hidden border border-white/10 bg-black">
                    <Image
                      src="/dex1.png"
                      alt="DECAStream streaming engine"
                      fill
                      className="object-contain p-6"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default WhatIsSection
