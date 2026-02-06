'use client'

import useOnClickInside from '@/app/lib/hooks/useOnClickInside'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'
import React, { useRef, useState } from 'react'
import { NumericFormat } from 'react-number-format'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface InputAmountProps {
  amount: number
  setAmount?: (value: number) => void
  disable?: boolean
  textAlignRight?: boolean
  inValidAmount?: boolean
  inputRef?: any
  onInputFocus?: () => void
  isLoading?: boolean
  isBuySection?: boolean
  isSellSection?: boolean
  skeletonClassName?: string
  autoFocus?: boolean
}

const InputAmount: React.FC<InputAmountProps> = ({
  amount,
  setAmount,
  disable = false,
  textAlignRight = false,
  inValidAmount,
  inputRef,
  onInputFocus,
  isLoading = false,
  isBuySection = false,
  isSellSection = false,
  skeletonClassName,
  autoFocus = true,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [focus, setFocus] = useState(false)

  // Handler to update the amount
  const handleValueChange = (values: any) => {
    const { floatValue } = values
    if (setAmount) {
      // Ensure the value is non-negative
      const validValue = floatValue && floatValue >= 0 ? floatValue : 0
      setAmount(validValue)
    }
  }

  // useOnClickOutside(inputRef, () => {
  //   // const inputElement = wrapperRef.current?.querySelector('input');
  //   // if (inputElement) {
  //   //   inputElement.focus();
  //   // }
  //   setFocus(true);
  // });

  // If loading, render custom skeleton that matches input dimensions
  if (isLoading) {
    return (
      <Skeleton className={cn('h-10 w-32 sm:w-[12rem]', skeletonClassName)} />
    )
  }

  return (
    <NumericFormat
      value={amount === 0 ? '' : amount}
      displayType={'input'}
      thousandSeparator={true}
      allowNegative={false}
      allowLeadingZeros={false}
      decimalScale={8}
      fixedDecimalScale={false}
      onFocus={onInputFocus}
      onValueChange={handleValueChange}
      placeholder="0"
      autoFocus={autoFocus}
      disabled={disable}
      className={`w-full placeholder:text-white h-full bg-transparent border-none outline-none placeholder:text-gray text-[30px] md:text-[42px] ${
        textAlignRight ? 'text-right' : ''
      } ${inValidAmount ? 'text-primaryRed' : ''} ${
        disable
          ? (isBuySection || isSellSection) && amount > 0
            ? 'cursor-not-allowed'
            : 'cursor-not-allowed opacity-50'
          : ''
      } ${
        (isBuySection || isSellSection) && amount > 0
          ? ''
          : 'disabled:opacity-55'
      }`}
      getInputRef={inputRef}
    />
  )
}

export default InputAmount
