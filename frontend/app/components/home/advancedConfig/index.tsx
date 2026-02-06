import Image from 'next/image'
import React, { useState } from 'react'
import AmountTag from '../../amountTag'
import { ReserveData } from '@/app/lib/dex/calculators'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

type Props = {}

const AdvancedConfig: React.FC<Props> = ({}) => {
  const [showDetails, setShowDetails] = useState(true)

  const toggleDetails = () => setShowDetails(!showDetails)

  return (
    <div className="w-full p-5 border-[2px] border-white12 bg-[#0D0D0D] mt-[26px] rounded-[15px]">
      <div
        className={`w-full flex justify-between gap-1 duration-300 ease-in-out cursor-pointer`}
        onClick={toggleDetails}
      >
        <div className="flex gap-1.5">
          <p>Advanced Config</p>
        </div>
        <div className="flex gap-2.5 items-center">
          <Image
            src="/icons/up-arrow.svg"
            alt="up-arrow"
            className={`w-2.5 ${showDetails ? 'rotate-0' : 'rotate-180'}`}
            width={20}
            height={20}
          />
        </div>
      </div>

      {/* Animate visibility of amount details */}
      <div
        className={`transition-height duration-300 ease-in-out overflow-hidden ${
          showDetails
            ? 'max-h-[1000px] border-t mt-4 border-borderBottom'
            : 'max-h-0'
        }`}
      >
        <div className="w-full flex flex-col gap-2 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">Slippage Tolerance</div>
            <Input
              className="w-16 h-[1.75rem] bg-neutral-800 border-none text-white text-right rounded px-2 py-1 text-sm"
              placeholder="0.5"
            />
          </div>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">Instant settlement</div>
            <Checkbox />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-400">Bot Gas Limit</div>
            <Input
              className="w-16 h-[1.75rem] bg-neutral-800 border-none text-white text-right rounded px-2 py-1 text-sm"
              placeholder="1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedConfig
