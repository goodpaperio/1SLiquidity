'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'

const GatewaySection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.3 })
  const controls = useAnimation()
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const hasAnimatedOnce = useRef(false)

  // Preload background image and logo before starting animations
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

    // Safety timeout in case images don't load
    const timeout = setTimeout(() => {
      if (!imagesLoaded) {
        setImagesLoaded(true)
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [])

  // Trigger animations when section comes into view AND images are loaded
  useEffect(() => {
    if (isInView && imagesLoaded) {
      // Small delay to ensure smooth animation start
      setTimeout(() => {
        controls.start('visible')
        hasAnimatedOnce.current = true
      }, 100)
    } else if (!isInView && hasAnimatedOnce.current) {
      // Reset animations when section goes out of view
      controls.start('hidden')
    }
  }, [isInView, imagesLoaded, controls])

  // Left and right oval images with their delay values
  const leftOvals = [
    { src: '/ovals/ol-5.png', delay: 0.8 },
    { src: '/ovals/ol-4.png', delay: 0.9 },
    { src: '/ovals/ol-3.png', delay: 1 },
    { src: '/ovals/ol-2.png', delay: 1.1 },
    { src: '/ovals/ol-1.png', delay: 1.2 },
  ]

  const rightOvals = [
    { src: '/ovals/or-5.png', delay: 0.8 },
    { src: '/ovals/or-4.png', delay: 0.9 },
    { src: '/ovals/or-3.png', delay: 1 },
    { src: '/ovals/or-2.png', delay: 1.1 },
    { src: '/ovals/or-1.png', delay: 1.2 },
  ]

  // Animation variants
  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
        delay: 0.5, // Appear after logo
      },
    },
  }

  const logoVariants: Variants = {
    hidden: { opacity: 0, y: 80 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like ease
        delay: 0.2, // First element to appear
      },
    },
    hover: {
      scale: 1.2,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        spring: {
          damping: 10,
          stiffness: 100,
        },
      },
    },
  }

  const textVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.8, // Appear after title
        ease: 'easeOut',
      },
    },
  }

  // Background image animation - make it appear first
  const bgVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 0.7,
      transition: {
        duration: 0.5, // Faster fade-in
        delay: 0.8, // No delay - appear first
      },
    },
  }

  // Oval variants with direction based on side
  const leftOvalVariants: Variants = {
    hidden: { opacity: 0, x: -50 },
    visible: (delay: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 1.2,
        delay: delay, // Use the provided delay
        ease: 'easeOut',
      },
    }),
  }

  const rightOvalVariants: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: (delay: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        duration: 1.2,
        delay: delay, // Use the provided delay
        ease: 'easeOut',
      },
    }),
  }

  return (
    <section
      ref={sectionRef}
      className="relative py-20 overflow-hidden min-h-screen flex flex-col justify-center"
    >
      {/* Main content */}
      <div className="w-full mx-auto px-4 text-center relative z-10">
        <motion.h1
          className="text-3xl md:text-5xl font-bold mb-16 text-white uppercase"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          A Smarter Way to Execute Large Swaps
        </motion.h1>

        {/* Ovals */}
        <div className="relative flex justify-center items-center h-72 mb-16">
          {/* Background oval image - positioned behind ovals only */}
          <motion.div
            className="absolute inset-0 w-full h-full -z-10 pointer-events-none"
            initial="hidden"
            animate={controls}
            variants={bgVariants}
          >
            <Image
              src="/ovals/ovals-bg.png"
              alt="Background ovals"
              fill
              className="object-center"
              priority
              sizes="100vw"
              loading="eager"
            />
          </motion.div>

          {/* Left side ovals */}
          <div className="absolute left-0 xl:left-40 w-full h-full flex items-center">
            {leftOvals.map((oval, index) => (
              <motion.div
                key={`left-${index}`}
                className="absolute"
                style={{ left: `${10 + index * 5}%` }}
                initial="hidden"
                animate={controls}
                variants={leftOvalVariants}
                custom={oval.delay}
              >
                <Image
                  src={oval.src}
                  alt={`Left oval ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-auto h-auto"
                  loading="eager"
                />
              </motion.div>
            ))}
          </div>

          {/* Center logo */}
          <motion.div
            className="relative z-20"
            initial="hidden"
            animate={controls}
            variants={logoVariants}
            whileHover="hover"
          >
            <Image
              src="/assets/logo.svg"
              alt="DECAStream logo"
              width={180}
              height={180}
              className="w-auto h-auto"
              priority
              loading="eager"
            />
          </motion.div>

          {/* Right side ovals */}
          <div className="absolute right-0 xl:right-40 w-full h-full flex items-center">
            {rightOvals.map((oval, index) => (
              <motion.div
                key={`right-${index}`}
                className="absolute"
                style={{ right: `${10 + index * 5}%` }}
                initial="hidden"
                animate={controls}
                variants={rightOvalVariants}
                custom={oval.delay}
              >
                <Image
                  src={oval.src}
                  alt={`Right oval ${index + 1}`}
                  width={140}
                  height={140}
                  className="w-auto h-auto"
                  loading="eager"
                />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="max-w-3xl mx-auto text-white"
          initial="hidden"
          animate={controls}
          variants={textVariants}
        >
          <p className="text-lg md:text-xl mb-2">
            DECAStream intelligently splits large trades into optimized streams
            across multiple DEXs.
          </p>
          <p className="text-lg md:text-xl">
            Minimizing slippage, reducing gas costs, and delivering superior
            execution.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

export default GatewaySection
