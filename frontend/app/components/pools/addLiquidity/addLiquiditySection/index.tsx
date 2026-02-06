import Image from 'next/image'
import LiquidityToken from '../LiquidityToken'

interface Props extends InputAmountProps {
  active: boolean
  setActive: (active: boolean) => void
  inValidAmount?: boolean
}

interface InputAmountProps {
  amount: number
  setAmount: (amount: number) => void
}

const AddLiquidtySection: React.FC<Props> = ({
  amount,
  setAmount,
  active,
  setActive,
  inValidAmount,
}) => {
  return (
    <div className="w-fit h-fit relative">
      {amount > 0 && !inValidAmount && (
        <Image
          src="/assets/valid-amount-succes.svg"
          alt="valid"
          className={`w-[95vw] md:w-full h-full scale-y-[160%] -z-10 scale-x-[110%] sm:scale-[123%] absolute left-0 top-0 ${
            amount > 0 ? 'blink-animation' : ''
          }`}
          width={20}
          height={20}
        />
      )}
      <div
        className={`w-full min-h-[150px] md:min-h-[167px] rounded-[15px] p-[2px] relative ${
          amount > 0 && !inValidAmount
            ? 'bg-primary'
            : inValidAmount
            ? 'bg-primaryRed'
            : 'bg-neutral-800'
        }`}
        onClick={() => setActive(!active)}
      >
        {amount > 0 && !inValidAmount && (
          <Image
            src="/assets/valid-amount-dots.svg"
            alt="valid"
            className="w-full h-full absolute left-0 top-0 blink-animation opacity-90 z-20"
            width={20}
            height={20}
          />
        )}
        <div
          className={`w-full h-full z-20 sticky left-0 top-0 px-7 py-5 rounded-[13px] ${
            amount > 0 && !inValidAmount
              ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
              : 'bg-black'
          }`}
        >
          {/* title */}
          <p className="uppercase text-white text-[18px]">Add Liquidity</p>

          <LiquidityToken
            amount={amount}
            setAmount={setAmount}
            inValidAmount={inValidAmount}
          />
        </div>
      </div>
    </div>
  )
}

export default AddLiquidtySection
