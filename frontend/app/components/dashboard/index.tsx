'use client'

import { useEffect, useState } from 'react'
import { useAnimation, motion, Variants } from 'framer-motion'
import Navbar from '../navbar'
import ExplorerNav from '../explorer/ExplorerNav'
import DashboardStats from './DashboardStats'
import DashboardChart from './DashboardChart'
import DashboardSearchBar from './DashboardSearchBar'
import DashboardTrades from './DashboardTrades'
import type { ChartBarSelection, TimePeriod } from '@/app/lib/utils/dashboardChartGrouping'

export type { TimePeriod } from '@/app/lib/utils/dashboardChartGrouping'

const Dashboard = () => {
  const controls = useAnimation()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1Y')
  const [selectedBar, setSelectedBar] = useState<ChartBarSelection | null>(null)

  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period)
    setSelectedBar(null)
  }

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
      <div className="relative min-h-screen">
        <Navbar />
        <ExplorerNav />

        {/* Topographic wave background - positioned below navbars */}
        <div
          className="absolute top-[108px] left-0 right-0 h-[340px] pointer-events-none"
          style={{
            backgroundImage: 'url(/heros/hero-3.png)',
            backgroundSize: '100% auto',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
          }}
        />

        <div className="mt-[108px] mb-10 mx-auto relative z-10 w-full px-4 md:max-w-6xl">
          {/* Title - left aligned, smaller, white */}
          <motion.h1
            className="text-2xl md:text-3xl font-bold text-white text-left mb-6"
            initial="hidden"
            animate={controls}
            variants={titleVariants}
          >
            DECAStream Blockchain Explorer
          </motion.h1>

          {/* Search Bar - left aligned and smaller */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
            className="mb-12"
          >
            <DashboardSearchBar />
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
          >
            <DashboardStats timePeriod={timePeriod} />
          </motion.div>

          {/* Chart Section */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
            className="mt-12"
          >
            <DashboardChart
              timePeriod={timePeriod}
              onTimePeriodChange={handleTimePeriodChange}
              selectedBar={selectedBar}
              onBarSelect={setSelectedBar}
            />
          </motion.div>

          {/* Trades Sections */}
          <motion.div
            initial="hidden"
            animate={controls}
            variants={titleVariants}
          >
            <DashboardTrades
              timePeriod={timePeriod}
              selectedBar={selectedBar}
              onClearBarFilter={() => setSelectedBar(null)}
            />
          </motion.div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
