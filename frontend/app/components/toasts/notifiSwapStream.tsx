import ImageFallback from '@/app/shared/ImageFallback'
import Image from 'next/image'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'

type Props = {
  tokenInObj: any
  tokenOutObj: any
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  progress?: number // Progress percentage (0-100)
  step?: string // Current step description
  currentStep?: number // Current step number (1, 2, 3, etc.)
  totalSteps?: number // Total number of steps
  isError?: boolean // Whether this is an error state
}

const NotifiSwapStream: React.FC<Props> = ({
  tokenInObj,
  tokenOutObj,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  progress = 0,
  step = 'Starting trade...',
  currentStep = 1,
  totalSteps = 3,
  isError = false,
}) => {
  // Get the correct token icon
  const getTokenIcon = (token: TOKENS_TYPE) => {
    if (token.symbol.toLowerCase() === 'usdt') {
      return '/tokens/usdt.png'
    }
    return token.icon
  }

  // Determine colors based on error state
  const textColor = isError ? 'text-red-400' : 'text-white'
  const progressBarColor = isError ? 'bg-red-500' : 'bg-primary'
  const spinnerColor = isError ? 'border-red-500' : 'border-primary'

  return (
    <div className="w-full">
      <div className="flex mr-8 items-center gap-1.5">
        <Image
          src="/icons/swap-stream.svg"
          width={24}
          height={24}
          alt="swapStream"
        />
        <p className={textColor}>{step}</p>
      </div>

      {/* main content */}
      <div className="ml-[27px] flex flex-col">
        <div className="flex gap-[6px] items-center mt-2.5">
          <div className="flex items-center gap-1">
            <ImageFallback
              src={getTokenIcon(tokenInObj)}
              width={2400}
              height={2400}
              alt="swapStream"
              className="w-[18px] h-[18px]"
            />
            <p className="text-white uppercase">
              {amountIn} {tokenInObj.symbol}
            </p>
          </div>
          <Image
            src="/icons/right-arrow.svg"
            width={2400}
            height={2400}
            alt="swapStream"
            className="w-[10px]"
          />
          <div className="flex items-center gap-1">
            <ImageFallback
              src={getTokenIcon(tokenOutObj)}
              width={2400}
              height={2400}
              alt="swapStream"
              className="w-[18px] h-[18px]"
            />
            <p className="text-white uppercase">
              {amountOut} {tokenOutObj.symbol}{' '}
              {amountOut.includes('Required:') ? '' : '(Est)'}
            </p>
          </div>
        </div>

        <div className="w-full h-[3px] bg-white005 mt-[12px] relative">
          <div
            className={`h-[3px] ${progressBarColor} absolute top-0 left-0 transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        {/* <div className="mt-[3px] flex justify-between items-center gap-2 text-white52">
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
        </div> */}
        <div className="mt-[8px] flex justify-between items-center gap-2 text-white52">
          <p className="text-sm">
            {currentStep}/{totalSteps} {step}
          </p>
          {progress < 100 && !isError && (
            <div className="flex items-center gap-1">
              <div
                className={`w-3 h-3 border-t-2 ${spinnerColor} animate-spin rounded-full`}
              ></div>
              <p className="text-sm">{Math.round(progress)}%</p>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <p className="text-sm text-red-400">Failed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotifiSwapStream
