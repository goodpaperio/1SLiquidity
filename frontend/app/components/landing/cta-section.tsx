'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'

const CTASection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.4, once: false })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else {
      controls.start('hidden')
    }
  }, [isInView, controls])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' },
    },
  }

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.2, ease: 'easeOut' },
    },
  }

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.5, ease: 'easeOut' },
    },
  }

  return (
    <section
      ref={sectionRef}
      className="relative py-32 overflow-hidden flex items-center justify-center min-h-screen"
    >
      {/* Radial gradient background - green tinted */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(4, 31, 16, 0.9) 0%, transparent 70%)',
        }}
      />

      {/* Orbital spinning circles */}
      <div className="absolute w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] flex items-center justify-center">
          <div className="w-full h-full border border-[#33f498]/20 rounded-full animate-spin-slow" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] flex items-center justify-center">
          <div className="w-full h-full border border-[#33f498]/20 rounded-full animate-spin-slow-reverse" />
        </div>
      </div>

      <motion.div
        className="relative z-10 text-center max-w-3xl px-6"
        initial="hidden"
        animate={controls}
        variants={containerVariants}
      >
        <motion.h2
          className="font-bold text-5xl md:text-6xl lg:text-8xl uppercase mb-8 leading-none"
          initial="hidden"
          animate={controls}
          variants={textVariants}
        >
          Ready to Stream
          <br />
          <span
            className="text-transparent bg-clip-text"
            style={{
              WebkitTextStroke: '1px rgba(255,255,255,0.9)',
              paintOrder: 'stroke fill',
            }}
          >
            Your Trades?
          </span>
        </motion.h2>

        <motion.p
          className="text-gray-400 text-lg mb-12 font-light"
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
          Join thousands of traders saving millions in slippage costs.
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-4 flex-wrap"
          initial="hidden"
          animate={controls}
          variants={buttonVariants}
        >
          <Link
            href="/"
            className="clip-diagonal bg-[var(--primary)] text-black px-12 py-5 font-bold text-lg tracking-widest uppercase hover:opacity-90 transition-all hover:scale-105 shadow-[0_0_20px_rgba(64,247,152,0.4)]"
          >
            Launch App
          </Link>
          <a
            href="https://docs.decastream.com"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white/30 hover:border-[#33f498]/60 text-white font-mono text-sm tracking-widest uppercase px-10 py-3.5 transition-all duration-300 hover:bg-white/5"
          >
            Read Docs
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default CTASection
