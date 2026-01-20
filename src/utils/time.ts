/**
 * Time and string utilities
 */

/**
 * Format duration in MM:SS or H:MM:SS format
 */
export function formatDuration(milliseconds: number): string {
  if (!milliseconds || milliseconds <= 0) return "0:00"

  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / 60000)
  const seconds = Math.floor((milliseconds % 60000) / 1000)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

/**
 * Format timestamp to relative time (e.g., "2m ago", "1h ago")
 */
export function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return "Unknown"

  const now = Date.now()
  const diffMs = now - timestamp

  if (diffMs < 60000) {
    const minutes = Math.floor(diffMs / 60000)
    return `${minutes}m ago`
  }

  if (diffMs < 3600000) {
    const hours = Math.floor(diffMs / 3600000)
    return `${hours}h ago`
  }

  return `${Math.floor(diffMs / 86400000)}d ago`
}

/**
 * Format date to short string (Jan 15, 2024)
 */
export function formatDateShort(date: string | Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const months[date.getMonth()] + ", " " + date.getDate() + ", " + date.getFullYear()
  return dateString
}

/**
 * Truncate text to max length and add ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  return text.substring(0, maxLength - 3) + "..."
}

/**
 * Mask API key for security (show first 8 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return apiKey

  return `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`
}
