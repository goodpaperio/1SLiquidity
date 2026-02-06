import Image from 'next/image'
import SelectTokenWithAmountSection from '../SelectTokenWithAmountSection'
import { useRef, useState } from 'react'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'
import { useModal } from '@/app/lib/context/modalContext'

interface Props {
  amount: number
  setAmount: (amount: number) => void
  inValidAmount?: boolean // This prop will handle the invalid amount logic
  swap?: boolean
  disabled?: boolean
  isLoading?: boolean // Add isLoading prop
}

const CoinBuySection: React.FC<Props> = ({
  amount,
  setAmount,
  inValidAmount,
  swap,
  disabled,
  isLoading, // Destructure isLoading
}) => {
  const [active, setActive] = useState(true)
  const sectionRef = useRef<HTMLDivElement>(null)
  const { selectedTokenTo } = useModal()

  const isInActiveState =
    amount > 0 && !inValidAmount && active && selectedTokenTo && !isLoading

  return (
    <div ref={sectionRef} className="w-full h-full relative">
      {isInActiveState && (
        <Image
          src="/assets/valid-amount-succes.svg"
          alt="valid"
          className={`w-full h-full scale-[123%] absolute left-0 top-0 ${
            amount > 0 ? 'blink-animation' : ''
          }`}
          width={20}
          height={20}
        />
      )}
      <div
        className={`w-full min-h-[163px] md:min-h-[171px] rounded-[15px] p-[2px] relative ${
          isInActiveState
            ? 'bg-primary'
            : inValidAmount
            ? 'bg-primaryRed'
            : 'bg-neutral-800'
        }`}
      >
        <div
          className={`w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-5 rounded-[13px] ${
            isInActiveState
              ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
              : 'bg-[#0D0D0D]'
          } ${isInActiveState}`}
        >
          {/* Title */}
          <p className="uppercase text-white text-[18px]">BUY</p>

          <SelectTokenWithAmountSection
            inputField="to"
            amount={amount}
            setAmount={setAmount}
            inValidAmount={inValidAmount}
            onInputFocus={() => {
              if (!active) {
                setActive(true)
              }
            }}
            disabled={disabled}
            isLoading={isLoading} // Pass isLoading prop
            isBuySection={true}
          />
        </div>
      </div>
    </div>
  )
}

export default CoinBuySection
