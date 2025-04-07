/**
 * Time Rules Enforcement Module
 *
 * This module contains utility functions for enforcing time rules between attendance actions.
 * It implements business logic for minimum time intervals between different attendance actions
 * and provides validation functions to enforce these rules.
 */

// Constants for time intervals (in milliseconds)
export const TIME_INTERVALS = {
  // Minimum time between "Go to Work" and "Check-in" actions (5 minutes)
  GO_WORK_TO_CHECK_IN: 5 * 60 * 1000,

  // Minimum time between "Check-in" and "Check-out" actions (2 hours)
  CHECK_IN_TO_CHECK_OUT: 2 * 60 * 60 * 1000,
}

// Cập nhật hàm validateTimeInterval để sử dụng các key dịch mới
export const validateTimeInterval = (previousActionType, previousActionTime, currentActionType) => {
  // If no previous action, no validation needed
  if (!previousActionTime) {
    return { isValid: true, message: null }
  }

  const now = new Date()
  const timeDifference = now - new Date(previousActionTime)

  // Check interval between "Go to Work" and "Check-in"
  if (previousActionType === "go_work" && currentActionType === "check_in") {
    if (timeDifference < TIME_INTERVALS.GO_WORK_TO_CHECK_IN) {
      // Calculate remaining time to wait in seconds
      const remainingSeconds = Math.ceil((TIME_INTERVALS.GO_WORK_TO_CHECK_IN - timeDifference) / 1000)
      return {
        isValid: false,
        message: `time_rule_violation_message_check_in|${remainingSeconds}`,
      }
    }
  }

  // Check interval between "Check-in" and "Check-out"
  if (previousActionType === "check_in" && currentActionType === "check_out") {
    if (timeDifference < TIME_INTERVALS.CHECK_IN_TO_CHECK_OUT) {
      // Calculate remaining time to wait in minutes
      const remainingMinutes = Math.ceil((TIME_INTERVALS.CHECK_IN_TO_CHECK_OUT - timeDifference) / (60 * 1000))
      return {
        isValid: false,
        message: `time_rule_violation_message_check_out|${remainingMinutes}`,
      }
    }
  }

  // If all checks pass, return valid
  return { isValid: true, message: null }
}

/**
 * Formats a timestamp for display in the UI
 *
 * @param {Date|string} timestamp - The timestamp to format
 * @returns {string} - Formatted time string (HH:MM:SS)
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return "--:--:--"

  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * Calculates the duration between two timestamps
 *
 * @param {Date|string} startTime - The start timestamp
 * @param {Date|string} endTime - The end timestamp
 * @returns {string} - Formatted duration string (HH:MM:SS)
 */
export const calculateDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return "--:--:--"

  const start = typeof startTime === "string" ? new Date(startTime) : startTime
  const end = typeof endTime === "string" ? new Date(endTime) : endTime

  const durationMs = end - start

  // Convert to hours, minutes, seconds
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((durationMs % (1000 * 60)) / 1000)

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

/**
 * Returns an emoji indicator for a given action type
 * Used to visually represent different attendance actions in the history list
 *
 * @param {string} actionType - The action type
 * @returns {string} - Status indicator emoji
 */
export const getStatusIndicator = (actionType) => {
  switch (actionType) {
    case "go_work":
      return "🚶"
    case "check_in":
      return "✅"
    case "check_out":
      return "🔚"
    case "complete":
      return "🏆"
    default:
      return "❓"
  }
}

