import InputAmount from '@/app/components/inputAmount'
import Image from 'next/image'
import { ArrowLeftRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InputAmountProps {
  amount: number
  setAmount: any
  inValidAmount?: boolean
  inputRef?: any
  inputField: 'win' | 'savings'
  onInputFocus?: () => void
  disabled?: boolean
  isLoading?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
  icon1: string
  icon2: string
  switchTokens: () => void
}

const InputFieldWithTokenPair: React.FC<InputAmountProps> = ({
  icon1,
  icon2,
  amount,
  setAmount,
  inValidAmount,
  inputRef,
  inputField,
  onInputFocus,
  disabled,
  isLoading,
  isInsufficientBalance,
  setIsInsufficientBalance,
  switchTokens,
}) => {
  return (
    <div className="w-full">
      <div className="w-full flex gap-4 items-center justify-between mt-[12px]">
        {/* amount */}
        <div className="flex-1">
          <InputAmount
            inputRef={inputRef}
            amount={amount}
            inValidAmount={inValidAmount}
            setAmount={(val: any) => {
              setAmount(val)
            }}
            autoFocus={false}
            onInputFocus={onInputFocus}
            disable={disabled}
            isLoading={isLoading}
            skeletonClassName="h-[2.75rem] mt-2"
          />
        </div>

        {icon1 && icon2 && (
          <div className="flex items-center justify-between gap-2">
            {/* Ethereum icon */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10 overflow-hidden">
              <Image
                src={icon1}
                alt="eth"
                width={20}
                height={20}
                className="w-full h-full"
              />
            </div>

            <ArrowLeftRightIcon
              className="w-4 h-4"
              // onClick={switchTokens}
            />

            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#827a7a33] transition-all duration-300 overflow-hidden">
              <Image
                src={icon2}
                alt="dai"
                width={20}
                height={20}
                className="w-full h-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default InputFieldWithTokenPair
