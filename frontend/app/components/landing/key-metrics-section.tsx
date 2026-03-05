'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useInView, useAnimation, type Variants } from 'framer-motion'

function useCountUp(
  target: number,
  duration: number,
  shouldStart: boolean,
  prefix = '',
  suffix = ''
) {
  const [display, setDisplay] = useState(`${prefix}0${suffix}`)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!shouldStart || hasStarted.current) return
    hasStarted.current = true

    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(eased * target)
      setDisplay(`${prefix}${current}${suffix}`)
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [shouldStart, target, duration, prefix, suffix])

  const reset = useCallback(() => {
    hasStarted.current = false
    setDisplay(`${prefix}0${suffix}`)
  }, [prefix, suffix])

  return { display, reset }
}

const metricsData = [
  {
    target: 10,
    prefix: '< ',
    suffix: ' BPS',
    label: 'Target Slippage',
    duration: 2000,
  },
  {
    target: 99,
    prefix: '~',
    suffix: '%',
    label: 'Price Accuracy',
    duration: 2200,
  },
  {
    target: 8,
    prefix: '',
    suffix: '+',
    label: 'Supported DEXs',
    duration: 1800,
  },
  {
    target: 40,
    prefix: '',
    suffix: '+',
    label: 'Chains Supported',
    duration: 2000,
  },
]

const KeyMetricsSection = () => {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { amount: 0.4, once: false })
  const controls = useAnimation()
  const [shouldCount, setShouldCount] = useState(false)
  const prevInView = useRef(false)

  const c0 = useCountUp(
    metricsData[0].target,
    metricsData[0].duration,
    shouldCount,
    metricsData[0].prefix,
    metricsData[0].suffix
  )
  const c1 = useCountUp(
    metricsData[1].target,
    metricsData[1].duration,
    shouldCount,
    metricsData[1].prefix,
    metricsData[1].suffix
  )
  const c2 = useCountUp(
    metricsData[2].target,
    metricsData[2].duration,
    shouldCount,
    metricsData[2].prefix,
    metricsData[2].suffix
  )
  const c3 = useCountUp(
    metricsData[3].target,
    metricsData[3].duration,
    shouldCount,
    metricsData[3].prefix,
    metricsData[3].suffix
  )
  const counters = [c0, c1, c2, c3]

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
      setShouldCount(true)
    } else {
      controls.start('hidden')
      if (prevInView.current) {
        setShouldCount(false)
        counters.forEach((c) => c.reset())
      }
    }
    prevInView.current = isInView
  }, [isInView, controls])

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: 'easeOut' },
    },
  }

  return (
    <section ref={sectionRef} className="relative py-24 overflow-hidden">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 relative z-10">
        <motion.div
          className="mb-16"
          initial="hidden"
          animate={controls}
          variants={titleVariants}
        >
          <div className="font-mono text-xs text-[#33f498] tracking-widest mb-4">
            // KEY_METRICS
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white uppercase">
            Performance at a Glance
          </h2>
          <div className="h-1 w-24 bg-white/20 mt-4">
            <div className="h-full w-1/3 bg-[var(--primary)]" />
          </div>
        </motion.div>

        {/* Divided stats bar - full width, border-y, divide-x, hover highlight */}
        <section className="border-y border-white/10 bg-black/50 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
            {metricsData.map((metric, index) => (
              <motion.div
                key={index}
                className="p-8 text-center group hover:bg-white/5 transition-colors"
                initial="hidden"
                animate={controls}
                variants={titleVariants}
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-2 group-hover:text-[#33f498] transition-colors">
                  {counters[index].display}
                </div>
                <div className="font-mono text-[10px] text-gray-500 tracking-widest uppercase">
                  {metric.label}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}

export default KeyMetricsSection
