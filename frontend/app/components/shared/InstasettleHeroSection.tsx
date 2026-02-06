'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import Navbar from '../navbar'
import SELSection from '../home/SELSection'
import Instasettle from '../instasettle'

export default function HeroSection() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image for hero section only */}
      <motion.div
        className="absolute -top-28 right-0 w-1/2 h-2/3 pointer-events-none sm:block hidden"
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

      {/* <motion.div
        className="absolute bottom-0 left-0 w-full sm:w-1/2 h-full pointer-events-none"
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
          src="/heros/hero-2.svg"
          alt="hero background"
          fill
          className="object-contain object-left-top"
          style={{
            filter: 'brightness(50%) contrast(108%)',
            transition: 'filter 0.3s ease-in-out',
          }}
          priority
        />
      </motion.div> */}

      {/* Navbar and SELSection */}
      <Navbar />
      <div className="mt-[60px] mb-10 mx-auto w-fit relative z-10">
        {/* <SELSection /> */}
        <Instasettle />
      </div>

      <div className="absolute inset-0 -top-[20rem] w-full h-full pointer-events-none">
        <Image
          src="/heros/gradient-group.svg"
          alt="hero background"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* <div
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          width: '479.3916015625px',
          height: '479.3916015625px',
          top: '118px',
          left: '14px',
          opacity: '1',
          backdropFilter: 'blur(300px)',
        }}
      >
        <Image
          src="/heros/green-ellipse.svg"
          alt="hero background"
          fill
          className="object-cover"
          priority
        />
      </div> */}

      {/* <motion.div
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
      </motion.div> */}

      {/* <div
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
  )
}
