/**
 * Formats a timestamp into a relative time string (e.g., "2s ago", "1m ago", "2h ago")
 * @param timestamp Unix timestamp in seconds or milliseconds
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number | string): string {
  // Convert string to number if needed
  const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp

  // Convert to milliseconds if timestamp is in seconds
  const timestampMs = ts < 1e12 ? ts * 1000 : ts

  const now = Date.now()
  const diff = now - timestampMs
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(months / 12)

  if (seconds < 60) {
    return `${seconds}s ago`
  } else if (minutes < 60) {
    return `${minutes}m ago`
  } else if (hours < 24) {
    return `${hours}h ago`
  } else if (days < 30) {
    return `${days}d ago`
  } else if (months < 12) {
    return `${months}mo ago`
  } else {
    return `${years}y ago`
  }
}

/**
 * Formats a duration in seconds into a human-readable string (e.g., "2s", "1m", "2h")
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  } else {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
}

/**
 * Formats a future timestamp into a countdown string
 * @param timestamp Unix timestamp in seconds or milliseconds
 * @returns Formatted countdown string
 */
export function formatCountdown(timestamp: number | string): string {
  // Convert string to number if needed
  const ts = typeof timestamp === 'string' ? Number(timestamp) : timestamp

  // Convert to milliseconds if timestamp is in seconds
  const timestampMs = ts < 1e12 ? ts * 1000 : ts

  const now = Date.now()
  const diff = timestampMs - now

  if (diff <= 0) {
    return 'now'
  }

  const seconds = Math.floor(diff / 1000)
  return formatDuration(seconds)
}
