import { useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {};

const Liquidity: React.FC<Props> = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = {
    labels: ['TKN', 'TKN', 'TKN', 'TKN', 'Other'],
    datasets: [
      {
        data: [80.2, 20.2, 20.2, 20.2, 20.2],
        backgroundColor: [
          '#40F798',
          'rgba(64, 251, 177, 0.6)',
          'rgba(64, 251, 177, 0.5)',
          'rgba(64, 251, 177, 0.4)',
          'rgba(64, 251, 177, 0.3)',
        ],
        borderColor: '#0D382909',
        hoverOffset: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    cutout: '65%',
    onClick: (event: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        setActiveIndex(index === activeIndex ? null : index);
      }
    },
    onHover: (event: any, chartElement: any) => {
      const index =
        chartElement.length > 0 ? chartElement[0].index : null;
      setActiveIndex(index);
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (tooltipItem: any) {
            const value = tooltipItem.raw.toFixed(1);
            return `$${value}M (${((value / 161.0) * 100).toFixed(
              2
            )}%)`;
          },
        },
        backgroundColor: '#000',
        titleColor: '#fff',
        bodyColor: '#fff',
      },
      legend: { display: false },
    },
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      <h1 className="text-[30px] md:text-[42px] font-bold">
        Liquidity Composition
      </h1>
      <div className="flex justify-center items-center w-full mt-[40px]">
        <div
          className="relative"
          // style={{ width: '232px', height: '232px' }}
        >
          <Doughnut data={data} options={options} />
          <div className="absolute top-[50%] left-[50%] -z-10 translate-x-[-50%] translate-y-[-50%] text-center">
            <p className="text-[14px]">Global Pool</p>
            <h2 className="text-[21px] font-bold">$373.75M</h2>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-[300px] mx-auto mt-[40px]">
        {data.labels.map((label, index) => (
          <div
            key={index}
            className={`group flex items-center gap-2 cursor-pointer ${
              activeIndex === index ? 'text-white' : 'text-white52'
            }`}
            onClick={() =>
              setActiveIndex(activeIndex === index ? null : index)
            }
          >
            <span
              className={`w-[9px] h-[9px] rounded-[2px] border-[2px] ${
                activeIndex !== index
                  ? 'border-white52'
                  : 'border-white'
              }`}
              style={{
                backgroundColor:
                  activeIndex === index
                    ? '#41F58C'
                    : 'rgba(64, 251, 177, 1)',
              }}
            ></span>
            <p className={` text-[14px] group-hover:text-white`}>
              {label} <span>($20.2M, 20%)</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Liquidity;
