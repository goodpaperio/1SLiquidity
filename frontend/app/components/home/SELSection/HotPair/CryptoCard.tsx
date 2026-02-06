'use client'

import Image from 'next/image'

export default function CryptoCard({
  icon1,
  icon2,
  pair,
  price,
  vol,
  details1,
  details2,
  showBgIcon1,
  showBgIcon2,
}: {
  icon1: string
  icon2: string
  showBgIcon1?: boolean
  showBgIcon2?: boolean
  pair: string
  price: number
  vol: number
  details1: string
  details2: string
}) {
  return (
    <div className="group relative rounded-md p-[1px] transition-all duration-300 cursor-pointer">
      <div
        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(87.35deg, #3F4542 2.21%, #33F498 100%)',
        }}
      ></div>

      <div
        className="relative z-10 p-3 rounded-md bg-gradient-to-b from-[#2C2D2E] to-[#292B2C]
                   border border-[#3F4542] group-hover:border-transparent transition-colors duration-300"
      >
        <div className="flex flex-col gap-2 justify-between">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-5">
                {/* Ethereum icon */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10">
                  <Image
                    src={icon1}
                    alt="eth"
                    width={20}
                    height={20}
                    className="w-full h-full"
                  />
                </div>

                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33]">
                  <Image
                    src={icon2}
                    alt="dai"
                    width={20}
                    height={20}
                    className="w-full h-full"
                  />
                </div>
              </div>
              <h2 className="text-white text-xl font-semibold">{pair}</h2>
            </div>
            <div className="text-2xl font-bold text-[#40FAAC]">${price}</div>
          </div>
          <div className="flex items-center justify-between w-full">
            <p className="text-zinc-400 text-lg">{details1}</p>
            <p className="text-zinc-400 text-lg">{details2}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
