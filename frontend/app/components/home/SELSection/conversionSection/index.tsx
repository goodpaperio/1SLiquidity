import InputAmount from '@/app/components/inputAmount'
import Tag from '@/app/components/tag'
import { TOKENS } from '@/app/lib/constants'
import Image from 'next/image'
import { useState } from 'react'

const ConversionSection: React.FC = ({}) => {
  const [amount, setAmount] = useState(0)
  const [limitType, setLimitType] = useState('Market')

  return (
    <div className="w-full">
      <div className="w-full flex gap-2 justify-between items-center mt-[12px]">
        {/* select token */}
        <div className="flex gap-1 items-center justify-center text-[18px]">
          <Image
            src={'/tokens/usdc.svg'}
            alt="usdc"
            className="w-[18px] h-[18px]"
            width={1000}
            height={1000}
          />
          <p>USDC</p>
        </div>
        <div className="flex-1 flex justify-center items-center cursor-pointer">
          <div className="group">
            <Image
              src={'/icons/swap-arrows.svg'}
              alt="swap-arrows"
              className="w-[18px] h-[18px] rotate-90 group-hover:hidden block"
              width={1000}
              height={1000}
            />
            <Image
              src={'/icons/swap-arrows-green.svg'}
              alt="swap-arrows"
              className="w-[18px] h-[18px] rotate-90 group-hover:block hidden"
              width={1000}
              height={1000}
            />
          </div>
        </div>
        <div className="flex gap-1 items-center justify-center text-[18px]">
          <Image
            src={'/tokens/eth.svg'}
            alt="eth"
            className="w-[18px] h-[18px]"
            width={1000}
            height={1000}
          />
          <p>ETH</p>
        </div>
      </div>

      {/* amount */}
      <div className="w-full flex gap-2 justify-between items-center mt-[12px]">
        {/* <div className="max-w-[33%] w-fit"> */}
        <InputAmount amount={amount} setAmount={setAmount} />
        {/* </div> */}
        <p className="w-[70%] flex justify-center items-cente text-white">
          is equal to
        </p>
        {/* <div className="max-w-[33%] w-fit"> */}
        <InputAmount
          amount={amount}
          setAmount={setAmount}
          disable={true}
          textAlignRight={true}
        />
        {/* </div> */}
      </div>

      {/* bottom section */}
      <div className="mt-2 w-full flex gap-[6px] items-center">
        <Tag
          theme="secondary"
          title="Market"
          value={limitType}
          setValue={setLimitType}
        />
        <Tag
          theme="secondary"
          title="+1%"
          value={limitType}
          setValue={setLimitType}
        />
        <Tag
          theme="secondary"
          title="+5%"
          value={limitType}
          setValue={setLimitType}
        />
        <Tag
          theme="secondary"
          title="+10%"
          value={limitType}
          setValue={setLimitType}
        />
      </div>
    </div>
  )
}

export default ConversionSection
