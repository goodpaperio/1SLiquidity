import { formatWalletAddress } from '@/app/lib/helper'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import JazzAvatar from '../shared/JazzAvatar'

type Props = {
  onClick?: () => void
  address: string
  isWalletDetailsSidebarOpen: boolean
}

const WalletButton: React.FC<Props> = ({
  onClick,
  address,
  isWalletDetailsSidebarOpen,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'min-w-12 w-fit h-10 gap-2 rounded-[12px] p-2 flex items-center transition-all duration-300 justify-center border-primary border-[2px] cursor-pointer',
        isWalletDetailsSidebarOpen
          ? 'border-success bg-successGradient'
          : 'hover:bg-[#2a2a2a]'
      )}
    >
      {/* <div className="relative h-fit">
        <Image
          src={'/icons/token.svg'}
          alt="coin"
          className="w-6 h-6"
          width={1000}
          height={1000}
        />
        <Image
          src="/icons/token-icon.svg"
          alt="token symbol"
          className="w-3 h-3 absolute bottom-0 right-0"
          width={20}
          height={20}
        />
      </div> */}
      <JazzAvatar address={address} diameter={20} />
      <p>{formatWalletAddress(address)}</p>
    </div>
  )
}

export default WalletButton
