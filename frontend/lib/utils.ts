import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumberAdvanced(
  num: number,
  options: {
    thousandDecimals?: number
    millionDecimals?: number
    billionDecimals?: number
    trillionDecimals?: number
  } = {}
): string {
  if (num === 0) return '0'

  const {
    thousandDecimals = 1,
    millionDecimals = 2,
    billionDecimals = 2,
    trillionDecimals = 2,
  } = options

  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  const ranges = [
    { value: 1e12, suffix: 'T', decimals: trillionDecimals },
    { value: 1e9, suffix: 'B', decimals: billionDecimals },
    { value: 1e6, suffix: 'M', decimals: millionDecimals },
    { value: 1e3, suffix: 'K', decimals: thousandDecimals },
  ]

  // Handle large numbers with suffix
  for (const { value, suffix, decimals } of ranges) {
    if (absNum >= value) {
      const formatted = (absNum / value).toFixed(decimals)
      const cleaned = parseFloat(formatted).toString()
      return `${sign}${cleaned}${suffix}`
    }
  }

  // For numbers less than 1000 → always show up to 3 decimal places
  return `${sign}${absNum.toFixed(3)}`
}
