'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'
import { ChevronDown, ArrowDown } from 'lucide-react'

const GatewaySection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.3 })
  const controls = useAnimation()
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const hasAnimatedOnce = useRef(false)

  useEffect(() => {
    const bgImage = new window.Image()
    const logoImage = new window.Image()
    let loadedCount = 0

    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === 2) {
        setImagesLoaded(true)
      }
    }

    bgImage.onload = checkAllLoaded
    logoImage.onload = checkAllLoaded

    bgImage.src = '/ovals/ovals-bg.png'
    logoImage.src = '/ovals/horse-logo.png'

    const timeout = setTimeout(() => {
      if (!imagesLoaded) {
        setImagesLoaded(true)
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (isInView && imagesLoaded) {
      setTimeout(() => {
        controls.start('visible')
        hasAnimatedOnce.current = true
      }, 100)
    } else if (!isInView && hasAnimatedOnce.current) {
      controls.start('hidden')
    }
  }, [isInView, imagesLoaded, controls])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut', delay: 0.5 },
    },
  }

  const logoVariants: Variants = {
    hidden: { opacity: 0, y: 80 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
    },
    hover: {
      scale: 1.05,
      transition: { duration: 0.3, ease: 'easeOut' },
    },
  }

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, delay: 0.8, ease: 'easeOut' },
    },
  }

  const buttonVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 1.0, ease: 'easeOut' },
    },
  }

  const chevronVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, delay: 1.4 },
    },
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/10"
    >
      {/* Floating hero backgrounds (marlins / hero art) */}
      <motion.div
        className="absolute bottom-0 right-0 w-1/2 h-full pointer-events-none sm:block hidden"
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
      >
        <Image
          src="/heros/hero-1.svg"
          alt=""
          fill
          className="object-contain object-right-bottom"
          style={{ filter: 'brightness(40%) contrast(100%)' }}
          priority
        />
      </motion.div>
      <motion.div
        className="absolute bottom-0 left-0 w-full sm:w-1/2 h-full pointer-events-none"
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
        }}
      >
        <Image
          src="/heros/hero-2.svg"
          alt=""
          fill
          className="object-contain object-left-top"
          style={{ filter: 'brightness(40%) contrast(108%)' }}
          priority
        />
      </motion.div>
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Image
          src="/heros/gradient-overlay.svg"
          alt=""
          fill
          className="object-cover opacity-60"
          priority
        />
      </div>

      {/* Perspective grid background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[200vw] h-[200vh] perspective-grid absolute top-1/2" />
      </div>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* Main content - pt clears fixed navbar on docs page */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto pt-20">
        {/* Status badge */}
        <motion.div
          className="inline-flex items-center justify-center gap-4 mb-8 border border-white/10 bg-black/40 backdrop-blur px-4 py-2 rounded-full"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          <div className="flex gap-1">
            <span className="w-1 h-3 bg-[var(--primary)]" />
            <span className="w-1 h-3 bg-[var(--primary)]/50" />
            <span className="w-1 h-3 bg-[var(--primary)]/20" />
          </div>
          <span className="font-mono text-xs text-[#33f498] tracking-widest">
            PROTOCOL ACTIVE
          </span>
        </motion.div>

        <motion.h1
          className="font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl tracking-tighter uppercase mb-6 leading-[0.9] mix-blend-screen"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          A Smarter
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600">
            Way to Execute
          </span>
          <br />
          Large Swaps
        </motion.h1>

        <motion.p
          className="font-mono text-sm md:text-base text-gray-400 max-w-xl mx-auto mb-12 leading-relaxed"
          initial="hidden"
          animate={controls}
          variants={textVariants}
        >
          [INFO] DECAStream intelligently splits large trades into optimized
          streams across multiple DEXs. Minimizing slippage, reducing gas costs,
          and delivering superior execution.
        </motion.p>

        {/* CTA Buttons - border primary with fill-on-hover, secondary text + arrow */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-12"
          initial="hidden"
          animate={controls}
          variants={buttonVariants}
        >
          <Link
            href="/"
            className="group relative px-8 py-4 bg-transparent border-2 border-[var(--primary)] text-[#33f498] font-mono text-sm tracking-widest uppercase hover:bg-[var(--primary)] hover:text-black transition-all duration-300 overflow-hidden"
          >
            <span className="absolute inset-0 bg-[var(--primary)]/10 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            <span className="relative z-10">Launch App_</span>
          </Link>
          <a
            href="https://docs.decastream.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-white font-mono text-sm tracking-widest uppercase flex items-center gap-2 transition-colors"
          >
            View Documentation <ArrowDown className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Logo - toned down, centered */}
        <motion.div
          className="relative flex justify-center items-center h-48 mb-8"
          initial="hidden"
          animate={controls}
          variants={logoVariants}
          whileHover="hover"
        >
          <Image
            src="/assets/logo.svg"
            alt="DECAStream logo"
            width={140}
            height={140}
            className="w-auto h-auto"
            priority
            loading="eager"
          />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="flex justify-center"
          initial="hidden"
          animate={controls}
          variants={chevronVariants}
        >
          <div className="animate-scroll-chevron">
            <ChevronDown className="w-8 h-8 text-white/50" />
          </div>
        </motion.div>
      </div>

      {/* Floating bottom-corner stats */}
      <div className="absolute bottom-10 left-10 hidden lg:block">
        <div className="font-mono text-[10px] text-gray-600 mb-1">
          TARGET SLIPPAGE
        </div>
        <div className="font-bold text-2xl text-white">&lt; 10 BPS</div>
      </div>
      <div className="absolute bottom-10 right-10 hidden lg:block text-right">
        <div className="font-mono text-[10px] text-gray-600 mb-1">
          CHAINS SUPPORTED
        </div>
        <div className="font-bold text-2xl text-white">40+</div>
      </div>
    </section>
  )
}

export default GatewaySection
