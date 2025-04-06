/**
 * Database Utilities Module
 *
 * This module provides functions for interacting with the application's data storage.
 * It handles CRUD operations for user settings, shifts, attendance logs, work status,
 * and notes using AsyncStorage as the persistent data store.
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import { validateShift, validateNote, validateAttendanceLog, validateUserSettings } from "./dataValidation"

// Keys for AsyncStorage - used to store different types of data
export const STORAGE_KEYS = {
  USER_SETTINGS: "userSettings", // User preferences
  SHIFT_LIST: "shiftList", // List of work shifts
  ACTIVE_SHIFT: "activeShift", // Currently active shift
  ATTENDANCE_LOGS: "attendanceLogs", // Daily attendance logs
  DAILY_WORK_STATUS: "dailyWorkStatus", // Daily work status summaries
  NOTES: "notes", // User notes
  LAST_RESET_TIME: "lastResetTime", // Timestamp of last reset
  DB_INITIALIZED: "db_initialized", // Flag to check if DB is initialized
  MANUAL_STATUS_UPDATES: "manualStatusUpdates", // Manual status overrides
  DATA_BACKUP: "dataBackup", // Backup of all data
  LAST_BACKUP_TIME: "lastBackupTime", // Timestamp of last backup
}

/**
 * Safe storage wrapper for AsyncStorage.setItem
 *
 * @param {string} key - Storage key
 * @param {any} data - Data to store
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const safeSetItem = async (key, data) => {
  try {
    const jsonData = JSON.stringify(data)
    await AsyncStorage.setItem(key, jsonData)
    return true
  } catch (error) {
    console.error(`Error storing data for ${key}:`, error)
    return false
  }
}

/**
 * Safe storage wrapper for AsyncStorage.getItem
 *
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if item doesn't exist
 * @returns {Promise<any>} - Retrieved data or default value
 */
export const safeGetItem = async (key, defaultValue = null) => {
  try {
    const data = await AsyncStorage.getItem(key)
    if (data === null) return defaultValue
    return JSON.parse(data)
  } catch (error) {
    console.error(`Error retrieving data for ${key}:`, error)
    return defaultValue
  }
}

/**
 * Initialize the database
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const initializeDatabase = async () => {
  try {
    const isInitialized = await safeGetItem(STORAGE_KEYS.DB_INITIALIZED, false)
    if (!isInitialized) {
      // Set default user settings
      const defaultSettings = {
        darkMode: true,
        language: "vi",
        soundEnabled: true,
        vibrationEnabled: true,
      }
      await safeSetItem(STORAGE_KEYS.USER_SETTINGS, defaultSettings)

      // Set initialized flag
      await safeSetItem(STORAGE_KEYS.DB_INITIALIZED, true)
      console.log("Database initialized with default settings")
    } else {
      console.log("Database already initialized")
    }
    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    return false
  }
}

/**
 * Get weekly status
 */
export const getWeeklyStatus = async (weekDays) => {
  try {
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    const manualStatusUpdates = await safeGetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, {})

    const weeklyStatus = {}

    for (const day of weekDays) {
      const dateString = day.toISOString().split("T")[0]

      // Check for manual status update
      if (manualStatusUpdates[dateString]) {
        weeklyStatus[dateString] = {
          status: manualStatusUpdates[dateString],
          logs: [],
        }
      } else {
        // Get daily work status
        const status = dailyWorkStatus[dateString] || { status: "not_updated" }

        // Get attendance logs for the day
        const logs = attendanceLogs[dateString] || []

        weeklyStatus[dateString] = {
          status: status.status,
          logs: logs,
        }
      }
    }

    return weeklyStatus
  } catch (error) {
    console.error("Error getting weekly status:", error)
    return {}
  }
}

/**
 * Set manual status for a day
 */
export const setManualStatus = async (date, status) => {
  try {
    const manualStatusUpdates = await safeGetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, {})
    manualStatusUpdates[date] = status
    await safeSetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, manualStatusUpdates)
    return true
  } catch (error) {
    console.error("Error setting manual status:", error)
    return false
  }
}

/**
 * Get user settings
 *
 * @returns {Promise<object>} - User settings object
 */
export const getUserSettings = async () => {
  try {
    const settings = await safeGetItem(STORAGE_KEYS.USER_SETTINGS, {
      darkMode: true,
      language: "vi",
      soundEnabled: true,
      vibrationEnabled: true,
    })

    return settings
  } catch (error) {
    console.error("Error getting user settings:", error)
    return null
  }
}

/**
 * Update user settings
 *
 * @param {object} newSettings - New settings to update
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateUserSettings = async (newSettings) => {
  try {
    const settings = await safeGetItem(STORAGE_KEYS.USER_SETTINGS, {})

    // Merge new settings with existing settings
    const updatedSettings = { ...settings, ...newSettings }

    // Validate settings
    const validation = validateUserSettings(updatedSettings)
    if (!validation.isValid) {
      console.error("Invalid settings:", validation.error)
      return false
    }

    return await safeSetItem(STORAGE_KEYS.USER_SETTINGS, updatedSettings)
  } catch (error) {
    console.error("Error updating user settings:", error)
    return false
  }
}

/**
 * Get shift list
 *
 * @returns {Promise<array>} - Array of shift objects
 */
export const getShiftList = async () => {
  try {
    return await safeGetItem(STORAGE_KEYS.SHIFT_LIST, [])
  } catch (error) {
    console.error("Error getting shift list:", error)
    return []
  }
}

/**
 * Get shift by ID
 *
 * @param {string} shiftId - ID of the shift to retrieve
 * @returns {Promise<object|null>} - Shift object or null if not found
 */
export const getShiftById = async (shiftId) => {
  try {
    const shifts = await getShiftList()
    return shifts.find((shift) => shift.id === shiftId) || null
  } catch (error) {
    console.error("Error getting shift by ID:", error)
    return null
  }
}

/**
 * Get active shift
 *
 * @returns {Promise<object>} - Active shift object
 */
export const getActiveShift = async () => {
  try {
    return await safeGetItem(STORAGE_KEYS.ACTIVE_SHIFT, null)
  } catch (error) {
    console.error("Error getting active shift:", error)
    return null
  }
}

/**
 * Set active shift
 *
 * @param {string} shiftId - ID of the shift to set as active
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const setActiveShift = async (shiftId) => {
  try {
    if (!shiftId) {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT)
      return true
    }

    const shiftList = await getShiftList()
    const shift = shiftList.find((s) => s.id === shiftId)

    if (!shift) {
      console.error("Shift not found with ID:", shiftId)
      return false
    }

    return await safeSetItem(STORAGE_KEYS.ACTIVE_SHIFT, shift)
  } catch (error) {
    console.error("Error setting active shift:", error)
    return false
  }
}

/**
 * Add a new shift
 *
 * @param {object} shift - Shift object to add
 * @returns {Promise<object>} - The new shift object if successful, null otherwise
 */
export const addShift = async (shift) => {
  try {
    // Validate shift
    const validation = validateShift(shift)
    if (!validation.isValid) {
      console.error("Invalid shift data:", validation.error)
      return null
    }

    const shiftList = await getShiftList()
    shiftList.push(shift)
    await safeSetItem(STORAGE_KEYS.SHIFT_LIST, shiftList)
    return shift
  } catch (error) {
    console.error("Error adding shift:", error)
    return null
  }
}

/**
 * Update an existing shift
 *
 * @param {object} updatedShift - Updated shift object
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateShift = async (updatedShift) => {
  try {
    // Validate shift
    const validation = validateShift(updatedShift)
    if (!validation.isValid) {
      console.error("Invalid shift data:", validation.error)
      return false
    }

    const shiftList = await getShiftList()
    const updatedList = shiftList.map((shift) => (shift.id === updatedShift.id ? updatedShift : shift))
    return await safeSetItem(STORAGE_KEYS.SHIFT_LIST, updatedList)
  } catch (error) {
    console.error("Error updating shift:", error)
    return false
  }
}

/**
 * Delete a shift
 *
 * @param {string} shiftId - ID of the shift to delete
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const deleteShift = async (shiftId) => {
  try {
    const shiftList = await getShiftList()
    const updatedList = shiftList.filter((shift) => shift.id !== shiftId)

    // Also update any notes that reference this shift
    const notes = await getNotes()
    let notesUpdated = false

    const updatedNotes = notes.map((note) => {
      if (note.associatedShiftIds && note.associatedShiftIds.includes(shiftId)) {
        notesUpdated = true
        return {
          ...note,
          associatedShiftIds: note.associatedShiftIds.filter((id) => id !== shiftId),
        }
      }
      return note
    })

    // Save updated shifts
    const shiftsResult = await safeSetItem(STORAGE_KEYS.SHIFT_LIST, updatedList)

    // Save updated notes if needed
    if (notesUpdated) {
      await safeSetItem(STORAGE_KEYS.NOTES, updatedNotes)
    }

    // Clear current shift if it's the one being deleted
    if (shiftsResult) {
      const currentShift = await getActiveShift()
      if (currentShift && currentShift.id === shiftId) {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SHIFT)
      }
    }

    return shiftsResult
  } catch (error) {
    console.error("Error deleting shift:", error)
    return false
  }
}

/**
 * Get attendance logs for a specific date
 *
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Promise<array>} - Array of attendance log objects
 */
export const getAttendanceLogs = async (date) => {
  try {
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    return attendanceLogs[date] || []
  } catch (error) {
    console.error("Error getting attendance logs:", error)
    return []
  }
}

/**
 * Add a new attendance log
 *
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {string} type - Type of attendance log (e.g., "check_in", "check_out")
 * @returns {Promise<object>} - The new attendance log object if successful, null otherwise
 */
export const addAttendanceLog = async (date, type) => {
  try {
    const newLog = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      type: type,
      timestamp: new Date().toISOString(),
    }

    // Validate log
    const validation = validateAttendanceLog(newLog)
    if (!validation.isValid) {
      console.error("Invalid attendance log:", validation.error)
      return null
    }

    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    const dateLogs = attendanceLogs[date] || []
    dateLogs.push(newLog)
    attendanceLogs[date] = dateLogs
    await safeSetItem(STORAGE_KEYS.ATTENDANCE_LOGS, attendanceLogs)
    return newLog
  } catch (error) {
    console.error("Error adding attendance log:", error)
    return null
  }
}

/**
 * Reset today's attendance logs
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const resetTodayAttendanceLogs = async () => {
  try {
    const today = new Date().toISOString().split("T")[0]
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    delete attendanceLogs[today]
    await safeSetItem(STORAGE_KEYS.ATTENDANCE_LOGS, attendanceLogs)

    // Reset daily work status
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    delete dailyWorkStatus[today]
    await safeSetItem(STORAGE_KEYS.DAILY_WORK_STATUS, dailyWorkStatus)

    return true
  } catch (error) {
    console.error("Error resetting today's attendance logs:", error)
    return false
  }
}

/**
 * Get daily work status for a specific date
 *
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Promise<object>} - Daily work status object
 */
export const getDailyWorkStatus = async (date) => {
  try {
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    return dailyWorkStatus[date] || null
  } catch (error) {
    console.error("Error getting daily work status:", error)
    return null
  }
}

/**
 * Update daily work status for a specific date
 *
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {object} status - Daily work status object
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateDailyWorkStatus = async (date, status) => {
  try {
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    dailyWorkStatus[date] = status
    return await safeSetItem(STORAGE_KEYS.DAILY_WORK_STATUS, dailyWorkStatus)
  } catch (error) {
    console.error("Error updating daily work status:", error)
    return false
  }
}

/**
 * Get notes
 *
 * @returns {Promise<array>} - Array of note objects
 */
export const getNotes = async () => {
  try {
    return await safeGetItem(STORAGE_KEYS.NOTES, [])
  } catch (error) {
    console.error("Error getting notes:", error)
    return []
  }
}

/**
 * Add a new note
 *
 * @param {object} note - Note object to add
 * @returns {Promise<object>} - The new note object if successful, null otherwise
 */
export const addNote = async (note) => {
  try {
    // Validate note
    const validation = validateNote(note)
    if (!validation.isValid) {
      console.error("Invalid note data:", validation.error)
      return null
    }

    const notes = await getNotes()
    notes.push(note)
    await safeSetItem(STORAGE_KEYS.NOTES, notes)
    return note
  } catch (error) {
    console.error("Error adding note:", error)
    return null
  }
}

/**
 * Update an existing note
 *
 * @param {object} updatedNote - Updated note object
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const updateNote = async (updatedNote) => {
  try {
    // Validate note
    const validation = validateNote(updatedNote)
    if (!validation.isValid) {
      console.error("Invalid note data:", validation.error)
      return false
    }

    const notes = await getNotes()
    const updatedNotes = notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    return await safeSetItem(STORAGE_KEYS.NOTES, updatedNotes)
  } catch (error) {
    console.error("Error updating note:", error)
    return false
  }
}

/**
 * Delete a note
 *
 * @param {string} noteId - ID of the note to delete
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const deleteNote = async (noteId) => {
  try {
    const notes = await getNotes()
    const updatedNotes = notes.filter((note) => note.id !== noteId)
    return await safeSetItem(STORAGE_KEYS.NOTES, updatedNotes)
  } catch (error) {
    console.error("Error deleting note:", error)
    return false
  }
}

/**
 * Get attendance log by type
 *
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {string} type - Type of attendance log (e.g., "check_in", "check_out")
 * @returns {Promise<object>} - Attendance log object
 */
export const getAttendanceLogByType = async (date, type) => {
  try {
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    const dateLogs = attendanceLogs[date] || []
    return dateLogs.find((log) => log.type === type) || null
  } catch (error) {
    console.error("Error getting attendance log by type:", error)
    return null
  }
}

/**
 * Create data backup
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const createDataBackup = async () => {
  try {
    // Get all data
    const userSettings = await safeGetItem(STORAGE_KEYS.USER_SETTINGS, {})
    const shiftList = await safeGetItem(STORAGE_KEYS.SHIFT_LIST, [])
    const activeShift = await safeGetItem(STORAGE_KEYS.ACTIVE_SHIFT, null)
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    const notes = await safeGetItem(STORAGE_KEYS.NOTES, [])
    const lastResetTime = await safeGetItem(STORAGE_KEYS.LAST_RESET_TIME, {})
    const manualStatusUpdates = await safeGetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, {})

    // Create backup object
    const backup = {
      userSettings,
      shiftList,
      activeShift,
      attendanceLogs,
      dailyWorkStatus,
      notes,
      lastResetTime,
      manualStatusUpdates,
      backupTime: new Date().toISOString(),
      appVersion: "1.0.0", // Add app version for compatibility checks
    }

    // Save backup
    const success = await safeSetItem(STORAGE_KEYS.DATA_BACKUP, backup)
    if (success) {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIME, new Date().toISOString())
    }
    return success
  } catch (error) {
    console.error("Error creating data backup:", error)
    return false
  }
}

/**
 * Restore data from backup
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const restoreFromBackup = async () => {
  try {
    // Get backup data
    const backup = await safeGetItem(STORAGE_KEYS.DATA_BACKUP)
    if (!backup) {
      console.error("No backup found")
      return false
    }

    // Restore each data type
    let success = true

    if (backup.userSettings) {
      success = success && (await safeSetItem(STORAGE_KEYS.USER_SETTINGS, backup.userSettings))
    }

    if (backup.shiftList) {
      success = success && (await safeSetItem(STORAGE_KEYS.SHIFT_LIST, backup.shiftList))
    }

    if (backup.activeShift) {
      success = success && (await safeSetItem(STORAGE_KEYS.ACTIVE_SHIFT, backup.activeShift))
    }

    if (backup.attendanceLogs) {
      success = success && (await safeSetItem(STORAGE_KEYS.ATTENDANCE_LOGS, backup.attendanceLogs))
    }

    if (backup.dailyWorkStatus) {
      success = success && (await safeSetItem(STORAGE_KEYS.DAILY_WORK_STATUS, backup.dailyWorkStatus))
    }

    if (backup.notes) {
      success = success && (await safeSetItem(STORAGE_KEYS.NOTES, backup.notes))
    }

    if (backup.lastResetTime) {
      success = success && (await safeSetItem(STORAGE_KEYS.LAST_RESET_TIME, backup.lastResetTime))
    }

    if (backup.manualStatusUpdates) {
      success = success && (await safeSetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, backup.manualStatusUpdates))
    }

    return success
  } catch (error) {
    console.error("Error restoring from backup:", error)
    return false
  }
}

/**
 * Export all data
 *
 * @returns {Promise<string>} - JSON string of all data
 */
export const exportAllData = async () => {
  try {
    // Get all data
    const userSettings = await safeGetItem(STORAGE_KEYS.USER_SETTINGS, {})
    const shiftList = await safeGetItem(STORAGE_KEYS.SHIFT_LIST, [])
    const activeShift = await safeGetItem(STORAGE_KEYS.ACTIVE_SHIFT, null)
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    const notes = await safeGetItem(STORAGE_KEYS.NOTES, [])
    const lastResetTime = await safeGetItem(STORAGE_KEYS.LAST_RESET_TIME, {})
    const manualStatusUpdates = await safeGetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, {})

    // Create backup object
    const backup = {
      userSettings,
      shiftList,
      activeShift,
      attendanceLogs,
      dailyWorkStatus,
      notes,
      lastResetTime,
      manualStatusUpdates,
    }

    // Convert to JSON string
    return JSON.stringify(backup)
  } catch (error) {
    console.error("Error exporting all data:", error)
    return null
  }
}

/**
 * Import data
 *
 * @param {string} jsonData - JSON string of data to import
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const importData = async (jsonData) => {
  try {
    // Parse JSON data
    const data = JSON.parse(jsonData)

    // Restore each data type
    let success = true

    if (data.userSettings) {
      success = success && (await safeSetItem(STORAGE_KEYS.USER_SETTINGS, data.userSettings))
    }

    if (data.shiftList) {
      success = success && (await safeSetItem(STORAGE_KEYS.SHIFT_LIST, data.shiftList))
    }

    if (data.activeShift) {
      success = success && (await safeSetItem(STORAGE_KEYS.ACTIVE_SHIFT, data.activeShift))
    }

    if (data.attendanceLogs) {
      success = success && (await safeSetItem(STORAGE_KEYS.ATTENDANCE_LOGS, data.attendanceLogs))
    }

    if (data.dailyWorkStatus) {
      success = success && (await safeSetItem(STORAGE_KEYS.DAILY_WORK_STATUS, data.dailyWorkStatus))
    }

    if (data.notes) {
      success = success && (await safeSetItem(STORAGE_KEYS.NOTES, data.notes))
    }

    if (data.lastResetTime) {
      success = success && (await safeSetItem(STORAGE_KEYS.LAST_RESET_TIME, data.lastResetTime))
    }

    if (data.manualStatusUpdates) {
      success = success && (await safeSetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, data.manualStatusUpdates))
    }

    return success
  } catch (error) {
    console.error("Error importing data:", error)
    return false
  }
}

/**
 * Get last backup time
 *
 * @returns {Promise<string>} - Last backup time
 */
export const getLastBackupTime = async () => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIME)
  } catch (error) {
    console.error("Error getting last backup time:", error)
    return null
  }
}

// Export validateTimeInterval and updateWorkStatusForNewLog
export { validateTimeInterval } from "./timeRules"
export { updateWorkStatusForNewLog } from "./workStatusUtils"

