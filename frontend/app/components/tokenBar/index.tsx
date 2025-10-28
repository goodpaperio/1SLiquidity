import Image from 'next/image'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { Skeleton } from '@/components/ui/skeleton'
import ImageFallback from '@/app/shared/ImageFallback'

type TokenBarProps = {
  sellToken?: TOKENS_TYPE
  buyToken?: TOKENS_TYPE
  isLoading?: boolean
  cancelled?: boolean
}

const TokenBar: React.FC<TokenBarProps> = ({
  sellToken,
  buyToken,
  isLoading = false,
  cancelled = false,
}) => {
  return (
    <div className="flex items-center justify-center relative">
      {/* Sell Token */}
      <div className="flex items-center justify-center">
        <div
          className={
            cancelled
              ? 'bg-red-300 rounded-full p-0.5'
              : 'bg-green-300 rounded-full p-0.5'
          }
        >
          {isLoading ? (
            <Skeleton className="w-[30px] h-[30px] rounded-full" />
          ) : (
            <ImageFallback
              src={
                (sellToken?.symbol.toLowerCase() === 'usdt'
                  ? '/tokens/usdt.svg'
                  : sellToken?.icon) || '/icons/default-token.svg'
              }
              alt={sellToken?.symbol || 'token'}
              width={40}
              height={40}
              className="border-[1.5px] border-black w-[30px] h-[30px] overflow-hidden object-cover rounded-full"
            />
          )}
        </div>
      </div>

      {/* Connector Line */}
      <div
        className={
          cancelled
            ? 'flex-auto border-t-2 border-red-200 relative'
            : 'flex-auto border-t-2 border-green-200 relative'
        }
      >
        <div className="bg-gray rounded-full p-0.5 absolute -top-4 left-1/2 transform -translate-x-1/2">
          <Image
            src={'/assets/logo.svg'}
            alt="logo"
            width={40}
            height={40}
            className="border-[1.5px] border-black w-[28px] h-[28px] rounded-full"
          />
        </div>
      </div>

      {/* Buy Token */}
      <div className="flex items-center justify-center">
        <div className="bg-blue-300 rounded-full p-0.5">
          {isLoading ? (
            <Skeleton className="w-[30px] h-[30px] rounded-full" />
          ) : (
            <ImageFallback
              src={
                (buyToken?.symbol.toLowerCase() === 'usdt'
                  ? '/tokens/usdt.svg'
                  : buyToken?.icon) || '/icons/default-token.svg'
              }
              alt={buyToken?.symbol || 'token'}
              width={40}
              height={40}
              className="border-[1.5px] border-black w-[30px] h-[30px] overflow-hidden object-cover rounded-full"
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default TokenBar
