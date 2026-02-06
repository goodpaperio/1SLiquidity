export interface Stream {
  id: string
  sender: string
  recipient: string
  tokenAddress: string
  amount: string
  startTime: string
  endTime: string
  status: StreamStatus
  tokenSymbol: string
  tokenDecimals: number
  streamedAmount: string
  remainingAmount: string
}

export enum StreamStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface GlobalStreamsResponse {
  globalStreams: {
    scheduled: Stream[]
    ongoing: Stream[]
    total: {
      scheduled: number
      ongoing: number
      scheduledValue: string
      ongoingValue: string
    }
  }
}
