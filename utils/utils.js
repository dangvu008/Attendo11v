/**
 * Combines multiple class names into a single string
 * (This is a simplified version for React Native, as we don't use class names)
 */
export function cn(...args) {
  return args.filter(Boolean).join(" ")
}

/**
 * Format a date as a string
 */
export function formatDate(date) {
  if (!date) return ""

  if (typeof date === "string") {
    date = new Date(date)
  }

  return date.toISOString().split("T")[0]
}

/**
 * Format a time string (HH:MM)
 */
export function formatTime(time) {
  if (!time) return ""

  if (time instanceof Date) {
    return time.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  return time
}

/**
 * Get the current date as YYYY-MM-DD
 */
export function getCurrentDate() {
  return new Date().toISOString().split("T")[0]
}

/**
 * Get the current time as HH:MM
 */
export function getCurrentTime() {
  return new Date().toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

