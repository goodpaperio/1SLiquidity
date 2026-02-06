'use client'

import { SEL_SECTION_TABS } from '@/app/lib/constants'
import { isNumberValid } from '@/app/lib/helper'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import Button from '../../button'
import DetailSection from '../../home/detailSection'
import AddLiquidtySection from './addLiquiditySection'
import EqualBox from './equalBox'
import LimitSection from './sharePoolSection'

const AddLiquidity = () => {
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
      <div className="w-full flex justify-end gap-2 mb-4">
        {/* setting button */}
        <SettingButton />
      </div>

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
        <div className="absolute items-center flex border-[#1F1F1F] border-[2px] border-opacity-[1.5] bg-black justify-center cursor-pointer rounded-[6px] right-[calc(50%_-_42px)] top-[calc(50%_-_2rem)] rotate-45 z-50">
          <div className="w-[25.3px] h-[22.8px] absolute bg-black -rotate-45 -z-30 -left-[14px] top-[50.2px]" />
          <div className="w-[26.4px] h-[22.8px] absolute bg-black -rotate-45 -z-30 -right-[11.8px] -top-[13.75px]" />
          <EqualBox active={sellAmount > 0 || buyAmount > 0} />
        </div>
        <LimitSection />
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
        <Button theme="gradient" text="Confirm Liquidity" />
      </div>
    </div>
  )
}

const SettingButton = () => {
  return (
    <div className="group w-8 h-8 bg-white hover:bg-tabsGradient bg-opacity-[12%] rounded-[12px] flex items-center justify-center cursor-pointer">
      <Image
        src="/icons/settings.svg"
        alt="settings"
        className="w-fit h-fit block group-hover:hidden"
        width={40}
        height={40}
      />
      <Image
        src="/icons/settings-primary.svg"
        alt="settings"
        className="w-fit h-fit hidden group-hover:block"
        width={40}
        height={40}
      />
    </div>
  )
}

export default AddLiquidity
