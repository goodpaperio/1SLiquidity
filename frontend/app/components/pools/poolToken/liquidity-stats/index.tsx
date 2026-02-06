'use client'

import Button from '@/app/components/button'
import Tabs from '@/app/components/tabs'
import { LIQUIDITY_STATS_DATA, LIQUIDITY_STATS_TABS } from '@/app/lib/constants'
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import Image from 'next/image'
import { useState } from 'react'
import { Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip
)

type Props = {
  onAddLiquidity: () => void
  onWithdraw: () => void
}

export default function LiquidityStats({ onAddLiquidity, onWithdraw }: Props) {
  const [activeTab, setActiveTab] = useState(LIQUIDITY_STATS_TABS[0])

  return (
    <div className="flex flex-col gap-10">
      {/* Header with Add Liquidity button */}
      <div className="flex gap-2">
        <div className="w-full">
          <Button
            theme="gradient"
            text="Add Liquidity"
            onClick={onAddLiquidity}
          />
        </div>
        <div className="relative cursor-pointer w-[42px] h-[42px] rounded-[12px] flex items-center justify-center border-primary border-[2px]">
          <Image
            src="/icons/menu-dots.svg"
            alt="logo"
            className="w-1 h-4"
            width={40}
            height={40}
          />
        </div>
      </div>

      {/* Liquidity Stats Section */}
      <div className="flex flex-col gap-[30px] border-[2px] border-primary rounded-[15px] p-6 w-full">
        <div className="w-full">
          <Tabs
            tabs={LIQUIDITY_STATS_TABS}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabHeight={32}
            theme="secondary"
          />
        </div>

        <div className="flex flex-col gap-6">
          {/* Liquidity Stats Rows */}
          {LIQUIDITY_STATS_DATA.map((data, ind) => (
            <div key={ind} className="flex gap-6 items-center justify-between">
              {/* Title and Value Section */}
              <div className="flex flex-col gap-1">
                <p className="text-[18px] text-white uppercase">{data.title}</p>
                <p className="text-[27px] uppercase">{data.value}</p>
                <div
                  className={`text-[14px] flex gap-1 ${
                    data.status === 'increase'
                      ? 'text-primary'
                      : 'text-primaryRed'
                  }`}
                >
                  {data.status === 'increase' ? (
                    <Image
                      src="/icons/progress-up.svg"
                      alt="progress"
                      className="w-2"
                      width={1000}
                      height={1000}
                    />
                  ) : (
                    <Image
                      src="/icons/progress-down.svg"
                      alt="progress"
                      className="w-2"
                      width={1000}
                      height={1000}
                    />
                  )}
                  {data.statusAmount}
                </div>
              </div>

              {/* Graph Section */}
              <div className="h-[70px] w-[38%]">
                <MiniGraph
                  data={data.graphData}
                  type={data.title}
                  status={data.status}
                />
              </div>
            </div>
          ))}
          <div className="w-full">
            <Button
              theme="gradient"
              text="Claim/Withdraw Rewards"
              onClick={onWithdraw}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// MiniGraph Component
type MiniGraphProps = {
  data: number[]
  type: string
  status: string
}

const MiniGraph: React.FC<MiniGraphProps> = ({ data, type, status }) => {
  // If type is "Liquidity", render the pie chart
  if (type === 'Liquidity') {
    const pieData = {
      labels: ['Filled', 'Empty'],
      datasets: [
        {
          data: [20, 80], // Example data
          backgroundColor: ['#40FCB4', '#242424'],
          hoverOffset: 2,
          borderWidth: 0, // Removes border
        },
      ],
    }

    const pieOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '0%', // Creates a doughnut-style chart
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
      },
    }

    return <Doughnut data={pieData} options={pieOptions} />
  }

  // Otherwise, render the line chart
  const lineData = {
    labels: data.map((_, index) => index.toString()),
    datasets: [
      {
        data: data,
        borderColor: status === 'increase' ? '#40FCB4' : '#FC405E',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        backgroundColor:
          status === 'increase'
            ? 'rgba(64, 252, 180, 0.3)'
            : 'rgba(252, 64, 94, 0.3)', // Gradient color based on status
        fill: true, // Enable gradient fill
      },
    ],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: false },
      y: { display: false },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (tooltipItem: any) => `$${tooltipItem.raw}M`,
        },
      },
    },
  }

  return <Line data={lineData} options={lineOptions} />
}
