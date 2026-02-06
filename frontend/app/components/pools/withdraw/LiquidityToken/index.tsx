import InputAmount from '@/app/components/inputAmount'
import Image from 'next/image'

interface InputAmountProps {
  amount: number
  setAmount: any
  inValidAmount?: boolean
}

const LiquidityToken: React.FC<InputAmountProps> = ({
  amount,
  setAmount,
  inValidAmount,
}) => {
  return (
    <div className="w-full">
      <div className="w-full flex gap-4 justify-between mt-[12px]">
        {/* amount */}
        <div className="flex-1">
          <InputAmount
            amount={amount}
            inValidAmount={inValidAmount}
            setAmount={(val: any) => {
              setAmount(val)
            }}
          />
        </div>

        {/* select token */}
        <div
          className={`min-w-[165px] w-fit h-12 bg-blackGradient border-[2px] p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold ${
            amount > 0 && !inValidAmount ? 'border-success' : 'border-primary'
          }`}
        >
          <div className="flex items-center w-fit h-fit">
            <div className="mr-2.5 relative">
              <Image
                src={'/tokens/eth.svg'}
                alt={'eth'}
                className="w-[85%]"
                width={1000}
                height={1000}
              />
              <Image
                src="/icons/token.svg"
                alt="close"
                className="w-fit h-fit absolute bottom-0 right-[5px]"
                width={20}
                height={20}
              />
            </div>
            <p>ETH</p>
          </div>
        </div>
      </div>

      {/* bottom section */}
      <div className="mt-2 w-full flex justify-between gap-3 items-center">
        <p className={`${inValidAmount ? 'text-primaryRed' : 'text-primary'}`}>
          ${amount}
        </p>
        <div className="flex gap-1.5 items-center">
          <Image
            src={'/icons/wallet.svg'}
            alt="wallet"
            className="w-fit h-fit"
            width={20}
            height={20}
          />
          <p className="text-white">--</p>

          {/* {findedToken && (
            <p className="uppercase text-white">
              {findedToken.symbol}
            </p>
          )} */}
        </div>
      </div>
    </div>
  )
}

export default LiquidityToken
