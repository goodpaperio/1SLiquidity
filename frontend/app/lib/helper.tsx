export const formatWalletAddress = (address: string): string => {
  if (!address) return ''
  if (address.length <= 8) return address
  return `${address.slice(0, 4)}....${address.slice(-4)}`
}

export function formatCustomTime(date: any) {
  const now: any = new Date()
  const diffInSeconds = (date - now) / 1000
  const absDiff = Math.abs(diffInSeconds)

  const minutes = Math.floor(absDiff / 60) % 60
  const hours = Math.floor(absDiff / 3600) % 24
  const days = Math.floor(absDiff / 86400)

  // Function to build the output string
  function formatString(unit: any, value: any) {
    if (value === 0) {
      return `0 ${unit} ago` // Special case for "0 min ago"
    }
    const suffix = diffInSeconds < 0 ? 'ago' : 'remaining'
    return `${value} ${unit}${value > 1 ? 's' : ''} ${suffix}`
  }

  if (days > 0) {
    return formatString('day', days)
  } else if (hours > 0) {
    return formatString('hour', hours)
  } else if (minutes > 0) {
    return formatString('min', minutes)
  } else {
    // If less than a minute, handle as seconds for accuracy
    return formatString('min', 0)
  }
}

export function isNumberValid(input: any): boolean {
  const isValid = /^[0-9]*\.?[0-9]+$/.test(input)
  return isValid
}
