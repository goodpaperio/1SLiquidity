'use client'

import { useEffect, useRef } from 'react'
import {
  motion,
  useInView,
  useAnimation,
  useScroll,
  useTransform,
  type Variants,
} from 'framer-motion'
import { PenLine, SlidersHorizontal, Zap, BarChart3 } from 'lucide-react'

const steps = [
  {
    number: 1,
    title: 'Enter Trade',
    description:
      'Input token pair and amount. The Trade Summary auto-populates with slippage savings, network fees, and price accuracy.',
    icon: PenLine,
  },
  {
    number: 2,
    title: 'Configure',
    description:
      'Optional: Enable Instasettle with BPS margin. Choose Standard (streamed) or Only Instasettle (OTC queue).',
    icon: SlidersHorizontal,
  },
  {
    number: 3,
    title: 'Execute',
    description:
      'Smart contracts stream trades chunk by chunk. Maintenance bots settle one stream at a time, allowing arbitrage to balance markets.',
    icon: Zap,
  },
  {
    number: 4,
    title: 'Monitor',
    description:
      'Track progress under Ongoing Trades. Cancel anytime to return all tokens to wallet.',
    icon: BarChart3,
  },
]

const HowItWorksSection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.2, once: false })
  const controls = useAnimation()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const progressWidth = useTransform(scrollYProgress, [0.2, 0.7], ['0%', '75%'])

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

  const stepVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
    }),
  }

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        <motion.div
          className="mb-16"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          <div className="font-mono text-xs text-[#33f498] tracking-widest mb-4">
            // FROM_TRADE_TO_SETTLEMENT
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase">
            How It Works
          </h2>
          <div className="h-1 w-24 bg-white/20 mt-4">
            <div className="h-full w-1/3 bg-[var(--primary)]" />
          </div>
        </motion.div>

        {/* Desktop: horizontal stepper with HUD step boxes */}
        <div className="hidden md:block">
          <div className="relative max-w-4xl mx-auto mb-12">
            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-[2px] bg-neutral-800 border-t border-dashed border-white/10" />
            <motion.div
              className="absolute top-8 left-[12.5%] h-[2px] bg-gradient-to-r from-[#33f498] to-[#23dae6] shadow-[0_0_8px_rgba(51,244,152,0.5)]"
              style={{ width: progressWidth }}
            />

            <div className="grid grid-cols-4 relative">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.number}
                    className="flex flex-col items-center text-center px-4"
                    initial="hidden"
                    animate={controls}
                    variants={stepVariants}
                    custom={0.2 + index * 0.15}
                  >
                    {/* HUD-style square step indicator with corner brackets */}
                    <div className="relative mb-6">
                      <div className="w-14 h-14 border-2 border-[var(--primary)] flex items-center justify-center bg-black/80 relative">
                        <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-[var(--primary)]" />
                        <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-[var(--primary)]" />
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-[var(--primary)]" />
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-[var(--primary)]" />
                        <Icon className="w-6 h-6 text-[#33f498]" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 border border-[var(--primary)] bg-black flex items-center justify-center font-mono text-[10px] font-bold text-[#33f498]">
                        {step.number}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2 uppercase">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile: vertical timeline with HUD styling */}
        <div className="md:hidden">
          <div className="relative pl-10">
            <div className="absolute left-4 top-0 bottom-0 w-[2px] bg-neutral-800 border-l border-dashed border-white/10" />
            <motion.div
              className="absolute left-4 top-0 w-[2px] bg-gradient-to-b from-[#33f498] to-[#23dae6] shadow-[0_0_8px_rgba(51,244,152,0.4)]"
              style={{ height: progressWidth }}
            />

            <div className="space-y-10">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <motion.div
                    key={step.number}
                    className="relative"
                    initial="hidden"
                    animate={controls}
                    variants={stepVariants}
                    custom={0.2 + index * 0.15}
                  >
                    <div className="absolute -left-10 top-0">
                      <div className="w-10 h-10 border-2 border-[var(--primary)] flex items-center justify-center bg-black/80 relative">
                        <div className="absolute top-0 left-0 w-1.5 h-1.5 border-l border-t border-[var(--primary)]" />
                        <div className="absolute top-0 right-0 w-1.5 h-1.5 border-r border-t border-[var(--primary)]" />
                        <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-l border-b border-[var(--primary)]" />
                        <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-r border-b border-[var(--primary)]" />
                        <span className="font-mono text-xs font-bold text-[#33f498]">
                          {step.number}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-[#33f498]" />
                        <h3 className="text-lg font-semibold text-white uppercase">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorksSection
