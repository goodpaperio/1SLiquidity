'use client'

import {
  DAYS,
  OVERALL_SECTION_TABS,
  POOL_TOKEN_TABS,
} from '@/app/lib/constants'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
} from 'chart.js'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import Tabs from '../../tabs'
import { formatWalletAddress } from '@/app/lib/helper'

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement
)

type Props = {}

const PoolToken: React.FC<Props> = () => {
  const [poolTokenActiveTab, setPoolTokenActiveTab] = useState(
    OVERALL_SECTION_TABS[0]
  )
  const [daysActiveTab, setDaysActiveTab] = useState(DAYS[0])

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] rounded-full border-[2px] p-0.5 border-success flex justify-center items-center">
            <Image
              src="/tokens/eth.svg"
              alt="token"
              className="w-full h-full"
              width={1000}
              height={1000}
            />
          </div>
          <div className="flex gap-2 text-[27px]">
            <span className="uppercase">ETH</span>
            <span className="uppercase underline text-white">
              {formatWalletAddress('0x2a4941dsfdgdfngkd74642f')}
            </span>
          </div>
        </div>

        <div className="w-full gap-4 flex flex-wrap justify-between">
          <div className="w-fit">
            <Tabs
              tabs={POOL_TOKEN_TABS}
              theme="secondary"
              activeTab={poolTokenActiveTab}
              setActiveTab={setPoolTokenActiveTab}
              tabHeight={32}
            />
          </div>
          <div className="w-fit">
            <Tabs
              tabs={DAYS}
              activeTab={daysActiveTab}
              theme="secondary"
              setActiveTab={setDaysActiveTab}
              tabHeight={32}
            />
          </div>
        </div>

        <div className="flex gap-3 items-end my-5">
          <h1 className="text-[30px] md:text-[42px] font-bold leading-none">
            $373.75M
          </h1>
          <div className="flex gap-1 items-center">
            <Image
              src={'/icons/progress-down.svg'}
              alt="progress"
              className="w-2"
              width={1000}
              height={1000}
            />
            <p className="text-[14px] text-primaryRed">{`$22.39 (2.39%)`}</p>
          </div>
        </div>
        <div>
          {/* Render the graph based on the active tab */}
          {poolTokenActiveTab.title === 'Volume' && <VolumeGraph />}
          {poolTokenActiveTab.title === 'Liquidity' && <RewardsGraph />}
        </div>
      </div>
    </>
  )
}

// Volume Graph (Bar Chart)
const VolumeGraph = () => {
  const data = {
    labels: [
      '00:05',
      '00:10',
      '00:20',
      '00:25',
      '00:35',
      '00:40',
      '00:50',
      '00:55',
      '00:55',
      '00:55',
    ],
    datasets: [
      {
        data: [5, 15, 10, 30, 18, 50, 10, 8, 2, 3],
        backgroundColor: 'rgba(64, 251, 177, 1)', // Light green color
        borderRadius: 7,
        borderSkipped: false, // Round all sides
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#fff',
          font: { size: 12 },
        },
      },
      y: { display: false },
    },
    barPercentage: 1, // Adjust bar width
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Bar data={data} options={options} />
    </div>
  )
}

// TVL Graph (Line Chart)
const TVLGraph = () => {
  const chartRef = useRef<any>(null)

  const createGradient = (
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string
  ) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, color1) // Start color
    gradient.addColorStop(1, color2) // End color
    return gradient
  }

  useEffect(() => {
    if (chartRef.current && chartRef.current.canvas) {
      const ctx = chartRef.current.canvas.getContext('2d')

      if (ctx) {
        // Create gradients for both datasets
        const dataset1Gradient = createGradient(
          ctx,
          'rgba(64, 251, 177, 0.3)', // Green with transparency
          'rgba(64, 251, 177, 0)' // Fully transparent
        )

        const dataset2Gradient = createGradient(
          ctx,
          'rgba(84, 149, 246, 0.3)', // Blue with transparency
          'rgba(84, 149, 246, 0)' // Fully transparent
        )

        // Apply gradients to datasets
        const chart = chartRef.current
        chart.data.datasets[0].backgroundColor = dataset1Gradient
        chart.data.datasets[1].backgroundColor = dataset2Gradient

        chart.update()
      }
    }
  }, [])

  const data = {
    labels: [
      '00:05',
      '00:10',
      '00:20',
      '00:25',
      '00:35',
      '00:40',
      '00:50',
      '00:55',
    ],
    datasets: [
      {
        label: 'Dataset 1',
        data: [5, 15, 10, 20, 15, 25, 30, 40],
        borderColor: 'rgba(64, 251, 177, 1)', // Green border
        borderWidth: 2,
        tension: 0.4, // Smooth curve
        pointRadius: 0, // Remove dots
        fill: true, // Enable gradient fill
      },
      {
        label: 'Dataset 2',
        data: [10, 12, 8, 18, 20, 35, 25, 50],
        borderColor: 'rgba(84, 149, 246, 1)', // Blue border
        borderWidth: 2,
        tension: 0.4, // Smooth curve
        pointRadius: 0, // Remove dots
        fill: true, // Enable gradient fill
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Hide legend
      },
      tooltip: {
        enabled: true, // Show tooltip on hover
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderWidth: 1,
        borderColor: '#fff',
        callbacks: {
          label: (tooltipItem: any) => `$${tooltipItem.raw}M`, // Tooltip formatting
        },
      },
    },
    scales: {
      x: {
        grid: { display: false }, // Hide x-axis grid
        ticks: {
          color: '#fff',
          font: { size: 12 },
        },
      },
      y: {
        display: false, // Hide y-axis
      },
    },
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  )
}

// Rewards Graph (Line Chart)
const RewardsGraph = () => {
  const chartRef = useRef<any>(null)

  const createGradient = (
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string
  ) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, color1) // Start color
    gradient.addColorStop(1, color2) // End color
    return gradient
  }

  useEffect(() => {
    if (chartRef.current && chartRef.current.canvas) {
      const ctx = chartRef.current.canvas.getContext('2d')

      if (ctx) {
        // Create gradient for the rewards dataset
        const rewardsGradient = createGradient(
          ctx,
          'rgba(64, 251, 177, 0.3)', // Green with transparency
          'rgba(64, 251, 177, 0)' // Fully transparent
        )

        // Apply gradient to dataset
        const chart = chartRef.current
        chart.data.datasets[0].backgroundColor = rewardsGradient

        chart.update()
      }
    }
  }, [])

  const data = {
    labels: [
      '00:05',
      '00:10',
      '00:20',
      '00:25',
      '00:35',
      '00:40',
      '00:50',
      '00:55',
    ],
    datasets: [
      {
        label: 'Rewards',
        data: [2, 3, 6, 10, 20, 25, 30, 45],
        borderColor: 'rgba(64, 251, 177, 1)', // Green border
        borderWidth: 2,
        tension: 0.4, // Smooth curve
        pointRadius: 0, // Remove dots
        fill: true, // Enable gradient fill
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }, // Hide legend
      tooltip: {
        enabled: true, // Show tooltip on hover
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderWidth: 1,
        borderColor: '#fff',
        callbacks: {
          label: (tooltipItem: any) => `$${tooltipItem.raw}M`, // Tooltip formatting
        },
      },
    },
    scales: {
      x: {
        grid: { display: false }, // Hide x-axis grid
        ticks: {
          color: '#fff',
          font: { size: 12 },
        },
      },
      y: {
        display: false, // Hide y-axis
      },
    },
  }

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  )
}

export default PoolToken
