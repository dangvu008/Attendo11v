/**
 * Utility functions for handling time calculations in the app
 */

/**
 * Normalizes check-out time to ensure it's after check-in time
 * If check-out is before check-in, assumes it's the next day
 *
 * @param {Date|string} checkInTime - The check-in time
 * @param {Date|string} checkOutTime - The check-out time
 * @returns {Object} - Normalized check-in and check-out times
 */
export const normalizeShiftTimes = (checkInTime, checkOutTime) => {
  // Convert to Date objects if strings
  const checkIn = checkInTime instanceof Date ? new Date(checkInTime) : new Date(checkInTime)
  const checkOut = checkOutTime instanceof Date ? new Date(checkOutTime) : new Date(checkOutTime)

  // If check-out is before check-in, assume it's the next day
  if (checkOut <= checkIn) {
    checkOut.setDate(checkOut.getDate() + 1)
  }

  return {
    checkIn,
    checkOut,
  }
}

/**
 * Calculates the duration between two times in minutes
 * Handles overnight shifts correctly
 *
 * @param {Date|string} startTime - The start time
 * @param {Date|string} endTime - The end time
 * @returns {number} - Duration in minutes
 */
export const calculateDurationInMinutes = (startTime, endTime) => {
  const { checkIn, checkOut } = normalizeShiftTimes(startTime, endTime)
  return Math.floor((checkOut - checkIn) / (1000 * 60))
}

/**
 * Calculates a valid alarm time that's in the future
 *
 * @param {Date|string} targetTime - The target time for the alarm
 * @param {number} minutesBefore - Minutes before target time to set alarm
 * @returns {Date|null} - The alarm time or null if it would be in the past
 */
export const calculateAlarmTime = (targetTime, minutesBefore = 15) => {
  const target = targetTime instanceof Date ? new Date(targetTime) : new Date(targetTime)
  const alarmTime = new Date(target.getTime() - minutesBefore * 60 * 1000)
  const now = new Date()

  // If alarm time is in the past, return null or reschedule for next occurrence
  if (alarmTime <= now) {
    console.warn("Calculated alarm time is in the past")

    // For recurring alarms, you could add days until it's in the future
    // Example: alarmTime.setDate(alarmTime.getDate() + 7); // Next week

    return null
  }

  return alarmTime
}

/**
 * Formats a date to ISO string with timezone information
 *
 * @param {Date} date - The date to format
 * @returns {string} - ISO string with timezone
 */
export const formatDateWithTimezone = (date) => {
  return date.toISOString()
}

/**
 * Parses an ISO date string to local date
 *
 * @param {string} isoString - ISO date string
 * @returns {Date} - Local date object
 */
export const parseISOToLocalDate = (isoString) => {
  return new Date(isoString)
}

/**
 * Gets the next occurrence of a specific day of week
 *
 * @param {number} dayIndex - Day index (0 = Monday, 6 = Sunday)
 * @returns {Date} - Date of next occurrence
 */
export const getNextDayOfWeek = (dayIndex) => {
  const today = new Date()
  const todayDayIndex = (today.getDay() + 6) % 7 // Convert Sunday=0 to Monday=0

  let daysToAdd = dayIndex - todayDayIndex
  if (daysToAdd <= 0) {
    daysToAdd += 7
  }

  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysToAdd)
  return nextDate
}

/**
 * Formats time for display in the app
 *
 * @param {Date|string} time - The time to format
 * @param {string} format - Format string ('HH:mm', 'HH:mm:ss', etc.)
 * @returns {string} - Formatted time string
 */
export const formatTimeForDisplay = (time, format = "HH:mm") => {
  const date = time instanceof Date ? time : new Date(time)

  if (format === "HH:mm") {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }

  if (format === "HH:mm:ss") {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`
  }

  return date.toLocaleTimeString()
}

