export type TimePeriod = '1D' | '1W' | '1M' | '1Y' | 'ALL'

export type ChartBarSelection = {
  groupKey: string
  fullDate: string
}

export function getTradeGroupKey(date: Date, timePeriod: TimePeriod): string {
  if (timePeriod === '1Y' || timePeriod === 'ALL') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function tradeMatchesChartBar(
  createdAt: string | number,
  groupKey: string,
  timePeriod: TimePeriod
): boolean {
  const tradeDate = new Date(Number(createdAt) * 1000)
  return getTradeGroupKey(tradeDate, timePeriod) === groupKey
}
