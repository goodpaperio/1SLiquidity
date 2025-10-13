import { formatNumberAdvanced } from '@/lib/utils'

/**
 * Formats a number with decimal limits and subscript notation for consecutive zeros
 * @param value The number to format (number, string, or undefined)
 * @param maxDecimals Maximum number of decimal places (default: 5)
 * @returns Formatted number string, or null if value is undefined
 */
export function formatNumberWithSubscript(
  value: number | string | undefined,
  maxDecimals: number = 5
): string | null {
  if (value === undefined) return null

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  // If not the right type or NaN, return as is
  if (isNaN(numValue)) return numValue.toString()

  // Handle zero
  if (numValue === 0) return '0'

  const limitedNum = parseFloat(numValue.toFixed(maxDecimals))
  let numStr = limitedNum.toString()

  // Split into integer and decimal parts
  const [integerPart, decimalPart] = numStr.split('.')

  // Function to convert number to subscript
  const toSubscript = (n: number): string => {
    return n
      .toString()
      .replace(/\d/g, (digit) => String.fromCharCode(8320 + parseInt(digit)))
  }

  // Only apply subscript formatting to decimal part
  let formattedDecimal = decimalPart
  if (decimalPart) {
    formattedDecimal = decimalPart.replace(/0{3,}/g, (match) => {
      const zeroCount = match.length
      return `0${toSubscript(zeroCount)}`
    })
  }

  // Combine integer and decimal parts
  return formattedDecimal ? `${integerPart}.${formattedDecimal}` : integerPart
}

/**
 * Smart wrapper that decides which formatting function to use based on the number's characteristics
 * @param value The number to format (number, string, or undefined)
 * @param maxDecimals Maximum number of decimal places for subscript formatting (default: 5)
 * @returns Formatted number string, or null if value is undefined
 *
 * Logic:
 * - If number >= 10,000: use formatNumberAdvanced
 * - If number < 10,000 with significant decimals: use formatNumberWithSubscript
 */
export function formatNumberSmart(
  value: number | string | undefined,
  maxDecimals: number = 5
): string | null {
  if (value === undefined) return null

  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) return numValue.toString()

  if (numValue === 0) return '0'

  const absValue = Math.abs(numValue)

  // If the number is >= 10,000, use formatNumberAdvanced
  if (absValue >= 10000) {
    return formatNumberAdvanced(numValue)
  }

  // For numbers < 10,000, use formatNumberWithSubscript
  return formatNumberWithSubscript(value, maxDecimals)
}
