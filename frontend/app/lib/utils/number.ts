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
