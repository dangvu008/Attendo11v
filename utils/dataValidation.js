/**
 * Data Validation Utilities
 *
 * This module provides functions for validating data before it's stored or processed.
 * It ensures data integrity and consistency throughout the application.
 */

/**
 * Validate a date string in YYYY-MM-DD format
 *
 * @param {string} date - Date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDateString = (date) => {
  if (!date || typeof date !== "string") return false

  // Check format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false

  // Check if it's a valid date
  const parts = date.split("-").map(Number)
  const year = parts[0]
  const month = parts[1] - 1 // JavaScript months are 0-indexed
  const day = parts[2]

  const dateObj = new Date(year, month, day)
  return dateObj.getFullYear() === year && dateObj.getMonth() === month && dateObj.getDate() === day
}

/**
 * Validate a time string in HH:MM format
 *
 * @param {string} time - Time string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidTimeString = (time) => {
  if (!time || typeof time !== "string") return false

  // Check format (HH:MM)
  if (!/^\d{2}:\d{2}$/.test(time)) return false

  // Check if it's a valid time
  const [hours, minutes] = time.split(":").map(Number)
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59
}

/**
 * Validate a shift object
 *
 * @param {Object} shift - Shift object to validate
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateShift = (shift) => {
  if (!shift || typeof shift !== "object") {
    return { isValid: false, error: "Invalid shift object" }
  }

  if (!shift.name || typeof shift.name !== "string" || shift.name.trim() === "") {
    return { isValid: false, error: "Shift name is required" }
  }

  if (!isValidTimeString(shift.startTime)) {
    return { isValid: false, error: "Invalid start time format (HH:MM required)" }
  }

  if (!isValidTimeString(shift.endTime)) {
    return { isValid: false, error: "Invalid end time format (HH:MM required)" }
  }

  if (!isValidTimeString(shift.departureTime)) {
    return { isValid: false, error: "Invalid departure time format (HH:MM required)" }
  }

  if (!isValidTimeString(shift.officeEndTime)) {
    return { isValid: false, error: "Invalid office end time format (HH:MM required)" }
  }

  if (!Array.isArray(shift.daysApplied) || shift.daysApplied.length !== 7) {
    return { isValid: false, error: "Days applied must be an array of 7 boolean values" }
  }

  return { isValid: true, error: null }
}

/**
 * Validate a note object
 *
 * @param {Object} note - Note object to validate
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateNote = (note) => {
  if (!note || typeof note !== "object") {
    return { isValid: false, error: "Invalid note object" }
  }

  if (!note.title || typeof note.title !== "string" || note.title.trim() === "") {
    return { isValid: false, error: "Note title is required" }
  }

  if (note.title.length > 100) {
    return { isValid: false, error: "Title cannot exceed 100 characters" }
  }

  if (!note.content || typeof note.content !== "string" || note.content.trim() === "") {
    return { isValid: false, error: "Note content is required" }
  }

  if (note.content.length > 300) {
    return { isValid: false, error: "Content cannot exceed 300 characters" }
  }

  if (note.reminderTime && !(new Date(note.reminderTime) instanceof Date)) {
    return { isValid: false, error: "Invalid reminder time" }
  }

  // Validate associatedShiftIds
  if (note.associatedShiftIds !== undefined && !Array.isArray(note.associatedShiftIds)) {
    return { isValid: false, error: "Associated shift IDs must be an array" }
  }

  // Validate explicitReminderDays
  if (note.explicitReminderDays !== undefined && !Array.isArray(note.explicitReminderDays)) {
    return { isValid: false, error: "Explicit reminder days must be an array" }
  }

  // If associatedShiftIds is empty, explicitReminderDays should have at least one day
  if (
    (!note.associatedShiftIds || note.associatedShiftIds.length === 0) &&
    (!note.explicitReminderDays || note.explicitReminderDays.length === 0)
  ) {
    return { isValid: false, error: "Either associate with shifts or select specific days" }
  }

  return { isValid: true, error: null }
}

/**
 * Validate attendance log object
 *
 * @param {Object} log - Attendance log object to validate
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateAttendanceLog = (log) => {
  if (!log || typeof log !== "object") {
    return { isValid: false, error: "Invalid attendance log object" }
  }

  if (!log.type || !["go_work", "check_in", "check_out", "complete"].includes(log.type)) {
    return { isValid: false, error: "Invalid log type" }
  }

  if (!log.timestamp || !(new Date(log.timestamp) instanceof Date)) {
    return { isValid: false, error: "Invalid timestamp" }
  }

  return { isValid: true, error: null }
}

/**
 * Validate user settings object
 *
 * @param {Object} settings - User settings object to validate
 * @returns {Object} - Object with isValid flag and error message
 */
export const validateUserSettings = (settings) => {
  if (!settings || typeof settings !== "object") {
    return { isValid: false, error: "Invalid settings object" }
  }

  if (typeof settings.darkMode !== "boolean") {
    return { isValid: false, error: "Dark mode setting must be a boolean" }
  }

  if (!settings.language || !["en", "vi"].includes(settings.language)) {
    return { isValid: false, error: "Invalid language setting" }
  }

  if (typeof settings.soundEnabled !== "boolean") {
    return { isValid: false, error: "Sound enabled setting must be a boolean" }
  }

  if (typeof settings.vibrationEnabled !== "boolean") {
    return { isValid: false, error: "Vibration enabled setting must be a boolean" }
  }

  return { isValid: true, error: null }
}

