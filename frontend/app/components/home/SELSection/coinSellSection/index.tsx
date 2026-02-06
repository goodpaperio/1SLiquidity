import Image from 'next/image'
import SelectTokenWithAmountSection from '../SelectTokenWithAmountSection'
import { useRef, useState } from 'react'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'
import { useModal } from '@/app/lib/context/modalContext'

interface Props {
  amount: number
  setAmount: (amount: number) => void
  inValidAmount?: boolean
  swap?: boolean
  disabled?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
}

const CoinSellSection: React.FC<Props> = ({
  amount,
  setAmount,
  inValidAmount,
  swap,
  disabled,
  isInsufficientBalance,
  setIsInsufficientBalance,
}) => {
  const [active, setActive] = useState(true)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { selectedTokenFrom } = useModal()

  // useOnClickOutside(sectionRef, () => {
  //   setActive(false)
  // })

  return (
    <div ref={sectionRef} className="w-fit h-fit relative">
      {amount > 0 && !inValidAmount && active && selectedTokenFrom && (
        <Image
          src="/assets/valid-amount-succes.svg"
          alt="valid"
          className={`w-full h-full -z-10 scale-y-[145%] scale-[110%] xs:scale-[128%] md:scale-[123%] absolute left-0 top-0 ${
            amount > 0 ? 'blink-animation' : ''
          }`}
          width={20}
          height={20}
        />
      )}
      <div
        className={`w-full min-h-[150px] md:min-h-[171px] rounded-[15px] p-[2px] relative
          ${
            amount > 0 && !inValidAmount && active && selectedTokenFrom
              ? 'bg-primary'
              : inValidAmount
              ? 'bg-primaryRed'
              : 'bg-neutral-800'
          }`}
      >
        <div
          className={`w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-5 rounded-[13px] ${
            amount > 0 && !inValidAmount && active && selectedTokenFrom
              ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
              : 'bg-[#0D0D0D]'
          } ${
            amount > 0 &&
            !inValidAmount &&
            active &&
            selectedTokenFrom &&
            'dotsbg'
          }`}
        >
          {/* title */}
          <p className="uppercase text-white text-[18px]">SELL</p>

          <div className="w-full h-full">
            <SelectTokenWithAmountSection
              inputField="from"
              amount={amount}
              setAmount={setAmount}
              inValidAmount={inValidAmount}
              inputRef={sectionRef}
              onInputFocus={() => {
                if (!active) setActive(true)
              }}
              disabled={disabled}
              isInsufficientBalance={isInsufficientBalance}
              setIsInsufficientBalance={setIsInsufficientBalance}
              isSellSection={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CoinSellSection
