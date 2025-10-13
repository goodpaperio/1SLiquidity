import Image from 'next/image'
import { useRef, useState } from 'react'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'
import { useModal } from '@/app/lib/context/modalContext'
import SelectTokenWithAmountSection from '../home/SELSection/SelectTokenWithAmountSection'
import InputFieldWithIcon from './InputFieldWithIcon'
import { TooltipContent } from '@/components/ui/tooltip'
import {
  Tooltip,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { InfoIcon } from '@/app/lib/icons'

interface Props {
  amount: number
  setAmount: (amount: number) => void
  inValidAmount?: boolean
  disabled?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
  active: boolean
  handleActive: (active: boolean) => void
  isLoading: boolean
  slippageSavingsUsd: number
}

const WinSection: React.FC<Props> = ({
  amount,
  setAmount,
  inValidAmount,
  disabled,
  isInsufficientBalance,
  setIsInsufficientBalance,
  active,
  handleActive,
  isLoading,
  slippageSavingsUsd,
}) => {
  // const [active, setActive] = useState(true)
  const sectionRef = useRef<HTMLDivElement>(null)

  // useOnClickOutside(sectionRef, () => {
  //   setActive(false)
  // })

  return (
    <div ref={sectionRef} className="md:w-fit w-full h-fit relative">
      {/* {amount > 0 && (
        <div className="absolute -top-9 right-2 z-[100]">
          <div
            className="flex items-center justify-center rounded-md bg-neutral-700 py-[2px] px-2 hover:bg-neutral-800 cursor-pointer"
            onClick={() => {
              setAmount(0)
            }}
          >
            Clear
          </div>
        </div>
      )} */}

      <div
        className={`w-full h-[150px] md:h-[171px] md:min-w-[25rem] rounded-[15px] p-[2px] relative
          ${
            amount > 0 && !inValidAmount
              ? 'bg-neutral-800'
              : inValidAmount
              ? 'bg-primaryRed'
              : 'bg-neutral-800'
          }`}
      >
        <div
          className={`w-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-5 rounded-[13px] h-full overflow-hidden ${
            amount > 0 && !inValidAmount
              ? active
                ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
                : 'bg-[#0D0D0D]'
              : 'bg-[#0D0D0D]'
          }`}
        >
          {/* title */}
          <div className="flex items-center gap-2">
            <p className="uppercase text-white text-[18px]">% WIN</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 cursor-help block" />
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                  <p>Win info</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="w-full h-full">
            <InputFieldWithIcon
              inputField="win"
              amount={amount}
              setAmount={setAmount}
              inValidAmount={inValidAmount}
              inputRef={sectionRef}
              onInputFocus={() => {
                handleActive(true)
              }}
              disabled={disabled}
              isInsufficientBalance={isInsufficientBalance}
              setIsInsufficientBalance={setIsInsufficientBalance}
              isLoading={isLoading}
              slippageSavingsUsd={slippageSavingsUsd}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default WinSection
