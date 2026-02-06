import Image from 'next/image'
import { useState } from 'react'

type Props = {
  active: boolean
  disabled?: boolean
}

const SwapBox: React.FC<Props> = ({ active = false, disabled = false }) => {
  return (
    <div className="w-16 h-16 overflow-hidden flex gap-4 p-2 group">
      <div
        className={`w-full h-full rounded-[4px] flex justify-center bg-neutral-800 items-center p-1 ${
          disabled
            ? 'opacity-50'
            : 'group-hover:bg-gradient-to-r from-[#071310] to-[#062118]'
        }`}
      >
        <Image
          src={'/icons/swap-arrows.svg'}
          alt="swap"
          className={`-rotate-45 w-5 block ${
            disabled ? 'block' : 'block group-hover:hidden'
          }`}
          width={1000}
          height={1000}
        />
        <Image
          src={'/icons/swap-arrows-green.svg'}
          alt="swap"
          className={`-rotate-45 w-5 block ${
            disabled ? 'hidden' : 'hidden group-hover:block'
          }`}
          width={1000}
          height={1000}
        />
      </div>
    </div>
  )
}

export default SwapBox
