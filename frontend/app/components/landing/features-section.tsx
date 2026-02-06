'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'
import { Wallet, Blocks, Headset, Shield, Flame } from 'lucide-react'
import {
  FlameIcon,
  HeadsetIcon,
  InstasettleIcon,
  InstasettleIconGradient,
  TypewriterIconWithoutAnimation,
} from '@/app/lib/icons'

const FeaturesSection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, {
    amount: 0.3,
    once: false, // This will make animations trigger every time the section comes into view
  })
  const controls = useAnimation()

  // Move animation control logic to useEffect
  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    } else {
      controls.start('hidden')
    }
  }, [isInView, controls])

  // Animation variants
  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      },
    },
  }

  const subtitleVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.2,
        ease: 'easeOut',
      },
    },
  }

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        delay: delay,
        ease: [0.16, 1, 0.3, 1], // Custom spring-like ease
      },
    }),
    hover: {
      scale: 1.02,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
      },
    },
  }

  const iconVariants: Variants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  }

  // Feature cards data
  const features = [
    {
      icon: (
        <TypewriterIconWithoutAnimation className="w-6 h-6 text-[#15b8a6]" />
      ),
      title: 'Stream-Based Execution',
      description:
        'Large swaps are auto-split into smaller streams using our Sweet Spot algorithm—reducing price impact and total cost.',
      delay: 0.3,
    },
    {
      // icon: <Blocks size={24} />,
      icon: <HeadsetIcon className="w-6 h-6 text-[#15b8a6]" />,
      title: 'Multi-DEX Aggregation',
      description:
        'Trade streams route across top DEXs, accessing the best liquidity and pricing in real-time.',
      delay: 0.4,
    },
    {
      icon: <InstasettleIconGradient className="w-6 h-6 text-[#15b8a6]" />,
      title: 'Instasettle for OTC',
      description:
        'Settle high-volume trades instantly, peer-to-peer—ideal for OTC and institutional swaps.',
      delay: 0.5,
    },
    {
      icon: <FlameIcon className="w-6 h-6 text-[#15b8a6]" />,
      title: 'HOT PAIRS',
      description:
        'Tap into real-time insights with dynamically refreshed token pairs identified for optimal slippage savings.',
      delay: 0.6,
    },
  ]

  return (
    <section
      ref={sectionRef}
      className="relative py-20 overflow-hidden min-h-screen flex flex-col justify-center"
    >
      <div className="max-w-6xl mx-auto px-4 text-center">
        <motion.h2
          className="text-4xl md:text-5xl font-bold mb-6 text-white uppercase"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          Built for Precision, Speed, and Scale
        </motion.h2>

        <motion.p
          className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-16"
          initial="hidden"
          animate={controls}
          variants={subtitleVariants}
        >
          An execution layer purpose-built for large trades. DECAStream combines
          smart order streaming, real-time DEX routing, and instant OTC
          settlement into a single interface.
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="bg-neutral-950 border border-neutral-800 rounded-lg p-6 pt-8 pb-12 text-left"
              initial="hidden"
              animate={controls}
              variants={cardVariants}
              custom={feature.delay}
              whileHover="hover"
            >
              <div className="flex items-start">
                <motion.div
                  initial="hidden"
                  animate={controls}
                  variants={iconVariants}
                  className="mr-4 rounded-lg p-[1px] bg-gradient-to-b from-[#29e6ad] to-[#15cfcb]"
                >
                  <div className="p-2 bg-gradient-to-b from-[#041510] to-[#021211] rounded-lg text-teal-500">
                    {feature.icon}
                  </div>
                </motion.div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2 uppercase">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection
