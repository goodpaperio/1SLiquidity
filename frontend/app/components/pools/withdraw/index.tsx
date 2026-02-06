'use client'

import { isNumberValid } from '@/app/lib/helper'
import { useEffect, useState } from 'react'
import Button from '../../button'
import DetailSection from '../../home/detailSection'
import AddLiquidtySection from './addWithdrawSection'

const WithdrawSection = () => {
  const [sellAmount, setSellAmount] = useState(0)
  const [buyAmount, setBuyAmount] = useState(0)
  const [isAddLiquidityAmountActive, SetIsAddLiquidityAmountActive] =
    useState(false)
  const [invaliSelldAmount, setInvalidSellAmount] = useState(false)
  const [invalidBuyAmount, setInvalidBuyAmount] = useState(false)

  useEffect(() => {
    if (!isNumberValid(sellAmount)) {
      setInvalidSellAmount(true)
    } else {
      setInvalidSellAmount(false)
    }

    if (!isNumberValid(buyAmount)) {
      setInvalidBuyAmount(true)
    } else {
      setInvalidBuyAmount(false)
    }
  }, [sellAmount, buyAmount])

  return (
    <div className="md:min-w-[500px] max-w-[500px] w-[95vw] p-2">
      <div className="w-full mt-4 flex flex-col relative gap-[23px]">
        <AddLiquidtySection
          amount={sellAmount}
          setAmount={(val: any) => {
            setSellAmount(val)
          }}
          active={isAddLiquidityAmountActive}
          inValidAmount={invaliSelldAmount}
          setActive={SetIsAddLiquidityAmountActive}
        />
      </div>

      {/* Detail Section */}
      <DetailSection
        sellAmount={`${sellAmount}`}
        buyAmount={`${buyAmount}`}
        inValidAmount={invaliSelldAmount || invalidBuyAmount}
        tokenFromSymbol=""
        tokenToSymbol=""
      />

      <div className="w-full my-[30px]">
        <Button theme="gradient" text="Confirm Withdrawl" />
      </div>
    </div>
  )
}

export default WithdrawSection
