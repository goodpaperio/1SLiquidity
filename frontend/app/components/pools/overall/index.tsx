'use client';

import { DAYS, OVERALL_SECTION_TABS } from '@/app/lib/constants';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineElement,
  PointElement,
} from 'chart.js';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import Tabs from '../../tabs';

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement
);

type Props = {};

const PoolOverall: React.FC<Props> = () => {
  const [overllActiveTab, setOverallActiveTab] = useState(
    OVERALL_SECTION_TABS[0]
  );
  const [daysActiveTab, setDaysActiveTab] = useState(DAYS[0]);

  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="text-[30px] md:text-[42px] font-bold">
          Overall
        </h1>

        <div className="w-full gap-4 flex flex-wrap justify-between">
          <div className="w-fit">
            <Tabs
              tabs={OVERALL_SECTION_TABS}
              theme="secondary"
              activeTab={overllActiveTab}
              setActiveTab={setOverallActiveTab}
              tabHeight={32}
            />
          </div>
          <div className="w-fit">
            <Tabs
              tabs={DAYS}
              theme="secondary"
              activeTab={daysActiveTab}
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
          {overllActiveTab.title === 'Volume' && <VolumeGraph />}
          {overllActiveTab.title === 'TVL' && <TVLGraph />}
          {overllActiveTab.title === 'Rewards' && <RewardsGraph />}
        </div>
      </div>
    </>
  );
};

// Volume Graph (Bar Chart)
const VolumeGraph = () => {
  const chartRef = useRef<any>(null);

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
      '01:05',
    ],
    datasets: [
      {
        label: 'Volume',
        data: [5, 15, 10, 30, 18, 50, 10, 8, 2],
        backgroundColor: 'rgba(64, 251, 177, 1)',
        borderRadius: 7,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(13, 13, 13, 0.75)', // Ensure background is semi-transparent
        titleColor: '#fff',
        bodyColor: '#fff',
        displayColors: false,
        borderColor: '#555',
        borderWidth: 1,
        // Custom styling for tooltip
        external: function (context: any) {
          // Tooltip Element
          let tooltipEl = document.getElementById('chartjs-tooltip');

          // Create element on first render
          if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.id = 'chartjs-tooltip';
            tooltipEl.style.opacity = '0';
            tooltipEl.style.position = 'absolute';
            tooltipEl.style.background = 'rgba(13, 13, 13, 0.75)';
            tooltipEl.style.borderRadius = '5px';
            tooltipEl.style.color = '#fff';
            tooltipEl.style.border = '1px solid #555';
            tooltipEl.style.pointerEvents = 'none';
            tooltipEl.style.transition = 'opacity 0.3s';
            tooltipEl.style.backdropFilter = 'blur(5px)';
            tooltipEl.style.transform = 'translate3d(0, 0, 0)';
            tooltipEl.style.zIndex = '1000';
            document.body.appendChild(tooltipEl);
          }

          // Hide if no tooltip
          if (context.opacity === 0) {
            tooltipEl.style.opacity = '0';
            return;
          }

          // Set Text
          if (context.body) {
            const titleLines = context.title || [];
            const bodyLines = context.body.map((b: any) => b.lines);

            const innerHtml =
              '<thead>' +
              titleLines
                .map((title: any) => `<tr><th>${title}</th></tr>`)
                .join('') +
              '</thead><tbody>' +
              bodyLines
                .map(
                  (body: any, i: any) => `<tr><td>${body}</td></tr>`
                )
                .join('') +
              '</tbody>';

            tooltipEl.innerHTML = innerHtml;
          }

          // `this` will be the tooltip
          const position =
            context.chart.canvas.getBoundingClientRect();
          tooltipEl.style.opacity = '1';
          tooltipEl.style.left =
            position.left +
            window.pageXOffset +
            context.caretX +
            'px';
          tooltipEl.style.top =
            position.top + window.pageYOffset + context.caretY + 'px';
        },
        callbacks: {
          label: function (tooltipItem: any) {
            const value = tooltipItem.raw;
            return [
              `Volume: $${value.toFixed(2)}M`,
              `Count: ${Math.floor(value * 1000)}`, // Example count calculation
            ];
          },
        },
      },
      customDottedLine: {
        id: 'customDottedLine',
        afterDraw: (chart: any) => {
          if (chart.tooltip._active && chart.tooltip._active.length) {
            const ctx = chart.ctx;
            const activePoint = chart.tooltip._active[0];
            const x = activePoint.element.x;
            const topY = chart.scales.y.top;
            const bottomY = chart.scales.y.bottom;

            ctx.save();
            ctx.beginPath();
            ctx.setLineDash([5, 5]); // Dotted line
            ctx.moveTo(x, topY);
            ctx.lineTo(x, bottomY);
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#40F798'; // Line color
            ctx.stroke();
            ctx.restore();
          }
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#fff',
          font: { size: 12 },
        },
      },
      y: {
        grid: { display: false },
        ticks: { display: false },
      },
    },
    barPercentage: 1,
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Bar
        ref={chartRef}
        data={data}
        options={options}
        plugins={[options.plugins.customDottedLine]}
      />
    </div>
  );
};

// TVL Graph (Line Chart)
const TVLGraph = () => {
  const chartRef = useRef<any>(null);

  const createGradient = (
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string
  ) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color1); // Start color
    gradient.addColorStop(1, color2); // End color
    return gradient;
  };

  useEffect(() => {
    if (chartRef.current && chartRef.current.canvas) {
      const ctx = chartRef.current.canvas.getContext('2d');

      if (ctx) {
        // Create gradients for both datasets
        const dataset1Gradient = createGradient(
          ctx,
          'rgba(64, 251, 177, 0.3)', // Green with transparency
          'rgba(64, 251, 177, 0)' // Fully transparent
        );

        const dataset2Gradient = createGradient(
          ctx,
          'rgba(84, 149, 246, 0.3)', // Blue with transparency
          'rgba(84, 149, 246, 0)' // Fully transparent
        );

        // Apply gradients to datasets
        const chart = chartRef.current;
        chart.data.datasets[0].backgroundColor = dataset1Gradient;
        chart.data.datasets[1].backgroundColor = dataset2Gradient;

        chart.update();
      }
    }
  }, []);

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
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false, // Hide legend
      },
      tooltip: {
        enabled: true, // Show tooltip on hover
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};

// Rewards Graph (Line Chart)
const RewardsGraph = () => {
  const chartRef = useRef<any>(null);

  const createGradient = (
    ctx: CanvasRenderingContext2D,
    color1: string,
    color2: string
  ) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, color1); // Start color
    gradient.addColorStop(1, color2); // End color
    return gradient;
  };

  useEffect(() => {
    if (chartRef.current && chartRef.current.canvas) {
      const ctx = chartRef.current.canvas.getContext('2d');

      if (ctx) {
        // Create gradient for the rewards dataset
        const rewardsGradient = createGradient(
          ctx,
          'rgba(64, 251, 177, 0.3)', // Green with transparency
          'rgba(64, 251, 177, 0)' // Fully transparent
        );

        // Apply gradient to dataset
        const chart = chartRef.current;
        chart.data.datasets[0].backgroundColor = rewardsGradient;

        chart.update();
      }
    }
  }, []);

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
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }, // Hide legend
      tooltip: {
        enabled: true, // Show tooltip on hover
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  };

  return (
    <div style={{ width: '100%', height: '300px' }}>
      <Line ref={chartRef} data={data} options={options} />
    </div>
  );
};

export default PoolOverall;
