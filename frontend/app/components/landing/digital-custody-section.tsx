'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'

const DigitalCustodySection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, {
    amount: 0.3,
    once: false,
  })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else {
      controls.start('hidden')
    }
  }, [isInView, controls])

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  }

  const labelVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.2,
        ease: 'easeOut',
      },
    },
  }

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay: 0.3,
        ease: 'easeOut',
      },
    },
  }

  const featureVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: delay,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like ease
      },
    }),
  }

  const imageVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: (delay: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        delay: delay,
        ease: 'easeOut',
      },
    }),
  }

  // Feature data
  const features = [
    {
      title: 'Trade Streaming Engine',
      description:
        'Our core engine dynamically breaks trades into optimal slices, achieving better pricing across volatile or illiquid pairs.',
      image: '/dex1.png',
      alt: 'Multi-factor security wallet illustration',
      delay: 0.5,
    },
    {
      title: 'Cross-Chain Liquidity Routing',
      description:
        'Connects to 40+ chains and routes each stream through the best liquidity pools automatically.',
      image: '/dex2.png',
      alt: 'Cross-chain aggregation illustration',
      delay: 0.6,
    },
    {
      title: 'Unified Execution Interface',
      description:
        'All features—streaming, DEX routing, and Instasettle—are built into one intuitive dashboard optimized for high-throughput users.',
      image: '/dex3.png',
      alt: 'Unified user interface illustration',
      delay: 0.7,
    },
  ]

  return (
    <motion.section
      ref={sectionRef}
      className="py-20"
      initial="hidden"
      animate={controls}
      variants={containerVariants}
    >
      <div className="max-w-6xl mx-auto px-4">
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          {/* Header section */}
          <div className="p-10 text-center border-b border-neutral-800 bg-neutral-950">
            <motion.div
              className="inline-block px-4 py-1 bg-neutral-800 rounded-full text-sm text-white mb-4"
              variants={labelVariants}
            >
              FUTURE OF DEX
            </motion.div>
            <motion.h2
              className="text-3xl md:text-4xl font-bold text-white uppercase"
              variants={titleVariants}
            >
              Execution Infrastructure for Onchain Traders
            </motion.h2>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 bg-black">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-8 flex flex-col items-center text-center ${
                  index < features.length - 1
                    ? 'md:border-r border-neutral-800'
                    : ''
                } ${
                  index < 2 ? 'border-b md:border-b-0 border-neutral-800' : ''
                }`}
              >
                <motion.div
                  className="mb-6 relative h-48 w-full"
                  variants={imageVariants}
                  custom={feature.delay}
                >
                  <Image
                    src={feature.image}
                    alt={feature.alt}
                    fill
                    className="object-contain"
                  />
                </motion.div>
                <motion.h3
                  className="text-xl font-bold text-green-400 mb-4 uppercase"
                  variants={featureVariants}
                  custom={feature.delay + 0.1}
                >
                  {feature.title}
                </motion.h3>
                <motion.p
                  className="text-gray-400"
                  variants={featureVariants}
                  custom={feature.delay + 0.2}
                >
                  {feature.description}
                </motion.p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default DigitalCustodySection
