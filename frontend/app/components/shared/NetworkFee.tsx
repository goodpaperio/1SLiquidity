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
      return `${networkFeeBps} BPS${tokenToSymbol ? ` ${tokenToSymbol}` : ''}`
    }

    const numericBuyAmount = parseFloat(buyAmount)
    if (isNaN(numericBuyAmount)) {
      return `${networkFeeBps} BPS${tokenToSymbol ? ` ${tokenToSymbol}` : ''}`
    }

    // Calculate fee in token amount (buyAmount is in output token units)
    const networkFeeInToken = numericBuyAmount * (networkFeeBps / 10000)
    const networkFeeUsd = networkFeeInToken * tokenToUsdPrice

    return `${networkFeeBps} BPS ${
      tokenToSymbol || ''
    } ($${networkFeeUsd.toFixed(2)})`
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
