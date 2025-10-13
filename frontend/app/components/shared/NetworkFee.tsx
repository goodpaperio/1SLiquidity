import React from 'react'
import AmountTag from '../amountTag'

interface NetworkFeeProps {
  buyAmount?: string
  tokenToUsdPrice?: number
  tokenToSymbol?: string
  contractInfo?: {
    streamProtocolFeeBps: string | number
    streamBotFeeBps: string | number
  } | null
  isCalculating?: boolean
  titleClassName?: string
}

const NetworkFee: React.FC<NetworkFeeProps> = ({
  buyAmount,
  tokenToUsdPrice,
  tokenToSymbol,
  contractInfo,
  isCalculating = false,
  titleClassName,
}) => {
  // Calculate dynamic network fee from contract
  const getNetworkFeeBps = () => {
    if (contractInfo) {
      const streamProtocolFeeBps = Number(contractInfo.streamProtocolFeeBps)
      const streamBotFeeBps = Number(contractInfo.streamBotFeeBps)
      return streamProtocolFeeBps + streamBotFeeBps
    }

    return 20 // 20 basis points as fallback
  }

  // Calculate network fee amount - calculated on output token
  const calculateNetworkFee = () => {
    const networkFeeBps = getNetworkFeeBps()

    if (!buyAmount || !tokenToUsdPrice || isCalculating) {
      return `${networkFeeBps} bps${tokenToSymbol ? ` ${tokenToSymbol}` : ''}`
    }

    const numericBuyAmount = parseFloat(buyAmount)
    if (isNaN(numericBuyAmount)) {
      return `${networkFeeBps} bps${tokenToSymbol ? ` ${tokenToSymbol}` : ''}`
    }

    // Calculate fee in token amount (buyAmount is in output token units)
    const networkFeeInToken = numericBuyAmount * (networkFeeBps / 10000)
    const networkFeeUsd = networkFeeInToken * tokenToUsdPrice

    return (
      <div className="flex flex-col items-end">
        <p className="">
          {networkFeeBps} bps ({networkFeeInToken.toFixed(2)}{' '}
          {tokenToSymbol || ''})
        </p>
        <p className="text-white52 text-[12px]">${networkFeeUsd.toFixed(2)}</p>
      </div>
    )
  }

  return (
    <AmountTag
      title="Network Fee"
      amount={isCalculating ? undefined : calculateNetworkFee()}
      infoDetail="Estimated"
      isLoading={isCalculating}
      titleClassName={titleClassName}
    />
  )
}

export default NetworkFee
