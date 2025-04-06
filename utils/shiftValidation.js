/**
 * Shift Validation Utilities
 *
 * This module provides functions for validating check-in and check-out times
 * against assigned shifts, with special handling for overnight shifts.
 */

// Default tolerance in minutes for early/late check-in/out
const DEFAULT_TOLERANCE_MINUTES = 15

/**
 * Determines if a shift is an overnight shift (crosses midnight)
 *
 * @param {string} startTime - Shift start time (HH:MM format)
 * @param {string} endTime - Shift end time (HH:MM format)
 * @returns {boolean} - True if shift crosses midnight
 */
export const isOvernightShift = (startTime, endTime) => {
  if (!startTime || !endTime) return false

  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const startMinutesTotal = startHours * 60 + startMinutes
  const endMinutesTotal = endHours * 60 + endMinutes

  // If end time is earlier than start time, it's an overnight shift
  return endMinutesTotal < startMinutesTotal
}

/**
 * Converts a time string to a Date object with the specified base date
 *
 * @param {string} timeString - Time string in HH:MM format
 * @param {Date} baseDate - Base date to use
 * @returns {Date} - Date object with the specified time
 */
export const timeStringToDate = (timeString, baseDate) => {
  if (!timeString || !baseDate) return null

  const [hours, minutes] = timeString.split(":").map(Number)
  const result = new Date(baseDate)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Gets the valid check-in time range for a shift
 *
 * @param {Object} shift - Shift object with startTime and endTime
 * @param {Date} currentDate - Current date
 * @param {number} toleranceMinutes - Tolerance in minutes (default: 15)
 * @returns {Object} - Object with earliestTime and latestTime
 */
export const getValidCheckInTimeRange = (shift, currentDate, toleranceMinutes = DEFAULT_TOLERANCE_MINUTES) => {
  if (!shift || !currentDate) {
    return { earliestTime: null, latestTime: null }
  }

  const today = new Date(currentDate)
  today.setHours(0, 0, 0, 0)

  // Create start time for today
  const shiftStart = timeStringToDate(shift.startTime, today)

  // Calculate earliest allowed check-in time (shift start - tolerance)
  const earliestTime = new Date(shiftStart)
  earliestTime.setMinutes(earliestTime.getMinutes() - toleranceMinutes)

  // Calculate latest allowed check-in time (shift start + tolerance)
  const latestTime = new Date(shiftStart)
  latestTime.setMinutes(latestTime.getMinutes() + toleranceMinutes)

  // For overnight shifts, check if we need to adjust the date
  const isOvernight = isOvernightShift(shift.startTime, shift.endTime)

  // If it's an overnight shift and current time is after noon,
  // the shift likely starts today (not yesterday)
  if (isOvernight && currentDate.getHours() >= 12) {
    return { earliestTime, latestTime }
  }

  // If it's an overnight shift and current time is before noon,
  // the shift likely started yesterday
  if (isOvernight && currentDate.getHours() < 12) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const yesterdayShiftStart = timeStringToDate(shift.startTime, yesterday)

    const yesterdayEarliestTime = new Date(yesterdayShiftStart)
    yesterdayEarliestTime.setMinutes(yesterdayEarliestTime.getMinutes() - toleranceMinutes)

    const yesterdayLatestTime = new Date(yesterdayShiftStart)
    yesterdayLatestTime.setMinutes(yesterdayLatestTime.getMinutes() + toleranceMinutes)

    return { earliestTime: yesterdayEarliestTime, latestTime: yesterdayLatestTime }
  }

  return { earliestTime, latestTime }
}

/**
 * Gets the valid check-out time range for a shift
 *
 * @param {Object} shift - Shift object with startTime and endTime
 * @param {Date} checkInTime - Check-in time
 * @param {number} toleranceMinutes - Tolerance in minutes (default: 15)
 * @returns {Object} - Object with earliestTime and latestTime
 */
export const getValidCheckOutTimeRange = (shift, checkInTime, toleranceMinutes = DEFAULT_TOLERANCE_MINUTES) => {
  if (!shift || !checkInTime) {
    return { earliestTime: null, latestTime: null }
  }

  const checkInDate = new Date(checkInTime)
  checkInDate.setHours(0, 0, 0, 0)

  // Create end time based on check-in date
  const shiftEnd = timeStringToDate(shift.endTime, checkInDate)

  // For overnight shifts, add a day to the end time
  if (isOvernightShift(shift.startTime, shift.endTime)) {
    shiftEnd.setDate(shiftEnd.getDate() + 1)
  }

  // Calculate earliest allowed check-out time (shift end - tolerance)
  const earliestTime = new Date(shiftEnd)
  earliestTime.setMinutes(earliestTime.getMinutes() - toleranceMinutes)

  // Calculate latest allowed check-out time (shift end + tolerance)
  const latestTime = new Date(shiftEnd)
  latestTime.setMinutes(latestTime.getMinutes() + toleranceMinutes)

  return { earliestTime, latestTime }
}

/**
 * Validates if a check-in time is within the allowed range for a shift
 *
 * @param {Date} checkInTime - Check-in time to validate
 * @param {Object} shift - Shift object with startTime and endTime
 * @param {number} toleranceMinutes - Tolerance in minutes (default: 15)
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateCheckInTime = (checkInTime, shift, toleranceMinutes = DEFAULT_TOLERANCE_MINUTES) => {
  if (!checkInTime || !shift) {
    return { isValid: false, message: "Missing check-in time or shift information" }
  }

  const { earliestTime, latestTime } = getValidCheckInTimeRange(shift, checkInTime, toleranceMinutes)

  if (checkInTime < earliestTime) {
    const minutesTooEarly = Math.round((earliestTime - checkInTime) / (60 * 1000))
    return {
      isValid: false,
      message: `You're checking in ${minutesTooEarly} minutes too early. Earliest allowed check-in time is ${formatTime(earliestTime)}.`,
    }
  }

  if (checkInTime > latestTime) {
    const minutesTooLate = Math.round((checkInTime - latestTime) / (60 * 1000))
    return {
      isValid: false,
      message: `You're checking in ${minutesTooLate} minutes too late. Latest allowed check-in time is ${formatTime(latestTime)}.`,
    }
  }

  return { isValid: true, message: null }
}

/**
 * Validates if a check-out time is within the allowed range for a shift
 *
 * @param {Date} checkOutTime - Check-out time to validate
 * @param {Date} checkInTime - Check-in time
 * @param {Object} shift - Shift object with startTime and endTime
 * @param {number} toleranceMinutes - Tolerance in minutes (default: 15)
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateCheckOutTime = (
  checkOutTime,
  checkInTime,
  shift,
  toleranceMinutes = DEFAULT_TOLERANCE_MINUTES,
) => {
  if (!checkOutTime || !checkInTime || !shift) {
    return { isValid: false, message: "Missing check-out time, check-in time, or shift information" }
  }

  // Ensure check-out is after check-in
  if (checkOutTime <= checkInTime) {
    return {
      isValid: false,
      message: "Check-out time must be after check-in time",
    }
  }

  const { earliestTime, latestTime } = getValidCheckOutTimeRange(shift, checkInTime, toleranceMinutes)

  if (checkOutTime < earliestTime) {
    const minutesTooEarly = Math.round((earliestTime - checkOutTime) / (60 * 1000))
    return {
      isValid: false,
      message: `You're checking out ${minutesTooEarly} minutes too early. Earliest allowed check-out time is ${formatTime(earliestTime)}.`,
    }
  }

  if (checkOutTime > latestTime) {
    const minutesTooLate = Math.round((checkOutTime - latestTime) / (60 * 1000))
    return {
      isValid: false,
      message: `You're checking out ${minutesTooLate} minutes too late. Latest allowed check-out time is ${formatTime(latestTime)}.`,
    }
  }

  return { isValid: true, message: null }
}

/**
 * Formats a Date object as a time string (HH:MM)
 *
 * @param {Date} date - Date to format
 * @returns {string} - Formatted time string
 */
export const formatTime = (date) => {
  if (!date) return "--:--"

  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/**
 * Calculates work hours based on check-in and check-out times
 *
 * @param {Date} checkInTime - Check-in time
 * @param {Date} checkOutTime - Check-out time
 * @param {Object} shift - Shift object with startTime, endTime, and officeEndTime
 * @returns {Object} - Object with regularHours and overtimeHours
 */
export const calculateWorkHours = (checkInTime, checkOutTime, shift) => {
  if (!checkInTime || !checkOutTime || !shift) {
    return { regularHours: 0, overtimeHours: 0 }
  }

  // Get shift times as Date objects
  const checkInDate = new Date(checkInTime)
  checkInDate.setHours(0, 0, 0, 0)

  const shiftStart = timeStringToDate(shift.startTime, checkInDate)
  const shiftOfficeEnd = timeStringToDate(shift.officeEndTime, checkInDate)
  const shiftEnd = timeStringToDate(shift.endTime, checkInDate)

  // Handle overnight shifts
  if (isOvernightShift(shift.startTime, shift.endTime)) {
    if (shiftOfficeEnd < shiftStart) {
      shiftOfficeEnd.setDate(shiftOfficeEnd.getDate() + 1)
    }
    if (shiftEnd < shiftStart) {
      shiftEnd.setDate(shiftEnd.getDate() + 1)
    }
  }

  // Adjust check-in time if it's before shift start
  const effectiveCheckIn = checkInTime < shiftStart ? shiftStart : checkInTime

  // Adjust check-out time if it's after shift end
  const effectiveCheckOut = checkOutTime > shiftEnd ? shiftEnd : checkOutTime

  // Calculate total work duration in hours
  const totalWorkMs = effectiveCheckOut - effectiveCheckIn
  const totalWorkHours = Math.max(0, totalWorkMs / (1000 * 60 * 60))

  // Calculate regular hours (up to office end time)
  let regularHours = 0
  if (effectiveCheckOut <= shiftOfficeEnd) {
    // All hours are regular
    regularHours = totalWorkHours
  } else if (effectiveCheckIn >= shiftOfficeEnd) {
    // All hours are overtime
    regularHours = 0
  } else {
    // Split between regular and overtime
    const regularWorkMs = shiftOfficeEnd - effectiveCheckIn
    regularHours = Math.max(0, regularWorkMs / (1000 * 60 * 60))
  }

  // Calculate overtime hours
  const overtimeHours = Math.max(0, totalWorkHours - regularHours)

  // Round to 2 decimal places
  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
  }
}

