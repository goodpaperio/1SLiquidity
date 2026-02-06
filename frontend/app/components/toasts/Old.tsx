import Image from 'next/image'

type Props = {}

const NotifiSwapStream: React.FC<Props> = () => {
  return (
    <div className="w-full">
      <div className="flex mr-8 items-center gap-1.5">
        <Image
          src="/icons/swap-stream.svg"
          width={24}
          height={24}
          alt="swapStream"
        />
        <p className="text-white">Swap stream 1/2 completed</p>
      </div>

      {/* main content */}
      <div className="ml-[27px] flex flex-col">
        <div className="flex gap-[6px] items-center mt-2.5">
          <div className="flex items-center gap-1">
            <Image
              src="/tokens/eth.svg"
              width={2400}
              height={2400}
              alt="swapStream"
              className="w-[18px] h-[18px]"
            />
            <p className="text-white uppercase">1 ETH</p>
          </div>
          <Image
            src="/icons/right-arrow.svg"
            width={2400}
            height={2400}
            alt="swapStream"
            className="w-[10px]"
          />
          <div className="flex items-center gap-1">
            <Image
              src="/tokens/usdc.svg"
              width={2400}
              height={2400}
              alt="swapStream"
              className="w-[18px] h-[18px]"
            />
            <p className="text-white uppercase">3,300 USDC (Est)</p>
          </div>
        </div>

        <div className="w-full h-[3px] bg-white005 mt-[12px] relative">
          <div
            className="w-[80%] h-[3px] bg-primary absolute top-0 left-0"
            // style={{ animation: 'fillup 2s linear forwards' }}
          />
        </div>

        <div className="mt-[3px] flex justify-between items-center gap-2 text-white52">
          <p className="">1/2 completed</p>
          <div className="flex gap-1">
            {' '}
            <Image
              src="/icons/time.svg"
              alt="clock"
              className="w-5"
              width={20}
              height={20}
            />
            <p>9 min</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotifiSwapStream
