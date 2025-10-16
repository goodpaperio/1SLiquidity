'use client'

import { useEffect, useState } from 'react'
import { useAnimation } from 'framer-motion'
import Image from 'next/image'
import { motion, Variants } from 'framer-motion'
import Navbar from '../navbar'
import TradesChart from './TradesChart'
import InstasettleTokenSelector from './InstasettleTokenSelector'
import { InstasettleIcon } from '@/app/lib/icons'
import HeroSection from '../shared/HeroSection'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'

const Instasettle = () => {
  const controls = useAnimation()
  const [selectedTokenFrom, setSelectedTokenFrom] =
    useState<TOKENS_TYPE | null>(null)
  const [selectedTokenTo, setSelectedTokenTo] = useState<TOKENS_TYPE | null>(
    null
  )

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
  return (
    <>
      <div className="relative min-h-screen overflow-hidden">
        {/* Navbar and SELSection */}
        <Navbar />

        <motion.div
          className="absolute -top-28 right-0 w-full 400:w-3/4 h-full sm:w-1/2 sm:h-2/3 pointer-events-none block"
          animate={{
            y: [0, -10, 0], // float up 10px and back
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: 'loop',
            ease: 'easeInOut',
          }}
        >
          <Image
            src="/heros/hero-1.svg"
            alt="hero background"
            fill
            className="object-contain object-right-top"
            style={{
              filter: 'brightness(50%) contrast(100%)',
            }}
            priority
          />
        </motion.div>
        <div className="mt-[60px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-4xl">
          {/* <div className="mx-auto relative z-10 w-full px-4 md:max-w-4xl"> */}
          {/* <h1 className="text-4xl md:text-6xl font-bold mb-4 sm:mb-4 text-white text-center">
            Instasettle
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 sm:mb-16 text-white text-center">
            Peer to peer otc trades. Beat market prices. Instantly.
          </h2> */}

          <div className="flex flex-col items-center justify-center gap-2">
            <motion.div
              className="flex items-center gap-2"
              initial="hidden"
              animate={controls}
              variants={titleVariants}
            >
              <InstasettleIcon className="w-12 h-12 text-[#40fdb5]" />
              <h1
                className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent text-center"
                style={{
                  backgroundImage:
                    'linear-gradient(90deg, #00FF85 0%, #00CCFF 100%)',
                }}
              >
                Instasettle
              </h1>
            </motion.div>
            <motion.h2
              className="text-3xl md:text-5xl font-bold mb-10 sm:mb-16 text-white text-center"
              initial="hidden"
              animate={controls}
              variants={titleVariants}
            >
              Peer-to-Peer OTC Trades. Beat Market Prices. Instantly.
            </motion.h2>
          </div>
          <InstasettleTokenSelector
            onTokenFromChange={setSelectedTokenFrom}
            onTokenToChange={setSelectedTokenTo}
          />
          <TradesChart
            selectedTokenFrom={selectedTokenFrom}
            selectedTokenTo={selectedTokenTo}
          />
        </div>

        {/* <motion.div
        className="absolute bottom-[20%] left-1/2 transform -translate-x-1/2 w-full h-full pointer-events-none z-0"
        initial={{ bottom: '-100%', opacity: 0 }}
        animate={{ bottom: '-60%', opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <Image
          src="/heros/circle.svg"
          alt="hero background"
          fill
          className="object-contain object-bottom"
          priority
        />
      </motion.div> */}

        {/* <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Image
          src="/heros/gradient-overlay.svg"
          alt="hero background"
          fill
          className="object-cover"
          priority
        />
      </div>

      <motion.div
        className="absolute bottom-[-60%] left-1/2 transform -translate-x-1/2 w-full h-full pointer-events-none z-0"
        initial={{ bottom: '-100%', opacity: 0 }}
        animate={{ bottom: '-60%', opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <Image
          src="/heros/circle.svg"
          alt="hero background"
          fill
          className="object-contain object-bottom"
          priority
        />
      </motion.div>

      <div
        className="absolute inset-0 bg-black/50"
        style={{
          WebkitMaskImage: `
            radial-gradient(circle, transparent 20%, white 80%)`,
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          WebkitMaskSize: 'cover',
          maskImage: `
            radial-gradient(circle, transparent 70%, white 80%)`,
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
          maskSize: 'cover',
        }}
      ></div> */}
      </div>
    </>
  )
}

export default Instasettle
