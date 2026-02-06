import { cn } from '@/lib/utils'
import { useAppKit } from '@reown/appkit/react'
import { Loader2 } from 'lucide-react'

type Props = {
  text: string
  onClick?: () => void
  error?: boolean
  disabled?: boolean
  theme?:
    | 'gradient'
    | 'primary'
    | 'secondary'
    | 'white'
    | 'black'
    | 'success'
    | 'destructive'
  loading?: boolean
  className?: string
  isSellAndBuyAmount?: boolean
}

const Button: React.FC<Props> = ({
  text,
  onClick,
  error,
  disabled,
  theme,
  loading,
  className,
  isSellAndBuyAmount,
}) => {
  const { open } = useAppKit()
  const handleConnectWallet = () => {
    open()
  }
  // : 'bg-gray text-white opacity-50 cursor-not-allowed bg-opacity-[23%]'
  // ? 'text-[#951b1d] bg-[#ec6264]'

  return (
    <button
      onClick={
        text === 'Connect Wallet'
          ? handleConnectWallet
          : onClick
          ? onClick
          : () => {}
      }
      disabled={error || disabled}
      className={cn(
        `min-w-[130px] w-full p-2 h-10 rounded-[12px] flex items-center justify-center uppercase
        ${
          error
            ? 'text-[#E43A3D] bg-[#3d0e0e]'
            : // ? 'text-primaryRed border-error border-[2px] bg-opacity-[23%]'
            disabled
            ? text === 'STREAM'
              ? 'relative bg-[length:200%_100%] bg-[position:100%] hover:bg-[position:0%] transition-all duration-500 bg-[linear-gradient(90deg,_#40FCB4_0%,_#41F58C_21.95%,_#40FCB4_48.58%,_#41F58C_71.52%,_#40FCB4_100%)] text-black before:absolute before:inset-0 before:bg-black before:opacity-0 hover:before:opacity-20 before:transition-opacity before:rounded-[12px]'
              : 'bg-gray text-white bg-[#0d0d0d] cursor-not-allowed border-[2px] border-white12'
            : theme == 'gradient'
            ? 'relative bg-[length:200%_100%] bg-[position:100%] hover:bg-[position:0%] transition-all duration-500 bg-[linear-gradient(90deg,_#40FCB4_0%,_#41F58C_21.95%,_#40FCB4_48.58%,_#41F58C_71.52%,_#40FCB4_100%)] text-black before:absolute before:inset-0 before:bg-black before:opacity-0 hover:before:opacity-20 before:transition-opacity before:rounded-[12px]'
            : theme == 'destructive'
            ? 'bg-red-700 text-red-200 hover:bg-red-600 transition-colors duration-300'
            : 'relative bg-secondary text-primary before:absolute before:inset-0 before:rounded-[12px] before:bg-[linear-gradient(90deg,_#40FCB4_0%,_#41F58C_21.95%,_#40FCB4_48.58%,_#41F58C_71.52%,_#40FCB4_100%)] before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300 hover:text-secondary'
        } ${
          loading
            ? 'cursor-not-allowed bg-[#0d0d0d] opacity-100 border-[2px] border-white12'
            : ''
        }`,
        className
      )}
    >
      {loading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
      <span className={cn(`relative z-10`, error && 'text-lg font-bold')}>{`${
        error ? (!!text ? text : 'Something went wrong') : text
      }`}</span>
    </button>
  )
}

export default Button
