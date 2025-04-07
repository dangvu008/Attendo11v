"use client"

import { createContext, useState, useEffect } from "react"
import { getTranslation } from "../utils/translations"
import {
  initializeDatabase,
  getUserSettings,
  updateUserSettings,
  getShiftList,
  getActiveShift,
  addShift as addShiftDB,
  getAttendanceLogs,
  resetTodayAttendanceLogs,
  getDailyWorkStatus,
  getNotes,
  createDataBackup,
  updateDailyWorkStatus,
  getAttendanceLogByType,
  addAttendanceLog as addAttendanceLogDB,
  validateTimeInterval,
  updateWorkStatusForNewLog,
} from "../utils/database"
import {
  configureNotifications,
  scheduleNotificationsForActiveShift,
  setupNotificationListeners,
  cancelNotificationsByType,
  cancelAllNotifications,
} from "../utils/notificationUtils"
import { initializeAlarmSystem } from "../utils/alarmUtils"
import { checkIfResetNeeded } from "../utils/workStatusUtils"
import { scheduleAutomaticBackup } from "../utils/dataBackupUtils"

// Create context
export const AppContext = createContext()

// Provider component
export const AppProvider = ({ children }) => {
  // State
  const [darkMode, setDarkMode] = useState(true)
  const [language, setLanguage] = useState("vi")
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [vibrationEnabled, setVibrationEnabled] = useState(true)
  const [multiButtonMode, setMultiButtonMode] = useState(false)
  const [alarmEnabled, setAlarmEnabled] = useState(true) // New state for alarm mode
  const [shifts, setShifts] = useState([])
  const [currentShift, setCurrentShift] = useState(null)
  const [todayLogs, setTodayLogs] = useState([])
  const [workStatus, setWorkStatus] = useState({
    status: "Chưa cập nhật",
    totalWorkTime: 0,
    overtime: 0,
    remarks: "",
  })
  const [notes, setNotes] = useState([])
  const [weeklyStatus, setWeeklyStatus] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [dataError, setDataError] = useState(null)
  const [showAlarmModal, setShowAlarmModal] = useState(false) // State for alarm modal
  const [alarmData, setAlarmData] = useState(null) // State for alarm data
  const [weeklyStatusRefreshTrigger, setWeeklyStatusRefreshTrigger] = useState(0)

  // Translation function
  const t = (key) => getTranslation(key, language)

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Initialize database
        await initializeDatabase()

        // Configure notifications
        await configureNotifications()

        // Initialize alarm system
        await initializeAlarmSystem()

        // Setup notification listeners
        const setupResult = setupNotificationListeners()
        const cleanupListeners = setupResult?.removeNotificationListeners

        // Check if reset is needed
        const resetNeeded = await checkIfResetNeeded()
        if (resetNeeded) {
          await resetTodayAttendanceLogs()
        }

        // Load user settings
        const settings = await getUserSettings()
        if (settings) {
          setDarkMode(settings.darkMode)
          setLanguage(settings.language)
          setSoundEnabled(settings.soundEnabled)
          setVibrationEnabled(settings.vibrationEnabled)
          setMultiButtonMode(settings.multiButtonMode)
          setAlarmEnabled(settings.alarmEnabled !== undefined ? settings.alarmEnabled : true)
        }

        // Load shifts
        const shiftList = await getShiftList()
        setShifts(shiftList)

        // Load active shift
        const activeShift = await getActiveShift()
        setCurrentShift(activeShift)

        // Schedule notifications for active shift
        if (activeShift) {
          await scheduleNotificationsForActiveShift()
        }

        // Load today's attendance logs
        const today = new Date().toISOString().split("T")[0]
        const logs = await getAttendanceLogs(today)
        setTodayLogs(logs)

        // Load today's work status
        const status = await getDailyWorkStatus(today)
        if (status) {
          setWorkStatus(status)
        }

        // Load notes
        const notesList = await getNotes()
        setNotes(notesList)

        // Schedule automatic backup
        await scheduleAutomaticBackup()

        setIsLoading(false)
      } catch (error) {
        console.error("Error loading data:", error)
        setDataError("Failed to load application data. Please restart the app.")
        setIsLoading(false)
      }
    }

    loadData()

    // Cleanup function
    return () => {
      // Cleanup notification listeners if needed
      if (typeof cleanupListeners === "function") {
        cleanupListeners()
      }
    }
  }, [])

  // Update user settings
  const handleUpdateSettings = async (newSettings) => {
    try {
      const success = await updateUserSettings(newSettings)
      if (success) {
        // Update state
        if (newSettings.darkMode !== undefined) setDarkMode(newSettings.darkMode)
        if (newSettings.language !== undefined) setLanguage(newSettings.language)
        if (newSettings.soundEnabled !== undefined) setSoundEnabled(newSettings.soundEnabled)
        if (newSettings.vibrationEnabled !== undefined) setVibrationEnabled(newSettings.vibrationEnabled)
        if (newSettings.multiButtonMode !== undefined) setMultiButtonMode(newSettings.multiButtonMode)
        if (newSettings.alarmEnabled !== undefined) setAlarmEnabled(newSettings.alarmEnabled)

        // Create backup after updating settings
        await createDataBackup()

        return true
      }
      return false
    } catch (error) {
      console.error("Error updating settings:", error)
      return false
    }
  }

  // Add a new shift
  const handleAddShift = async (shift) => {
    try {
      const newShift = await addShiftDB(shift)
      if (newShift) {
        setShifts([...shifts, newShift])
        return newShift
      }
      return null
    } catch (error) {
      console.error("Error adding shift:", error)
      return null
    }
  }

  // Update an existing shift
  const handleUpdateShift = async (updatedShift) => {}

  // Reset today's logs
  const handleResetTodayLogs = async () => {
    try {
      const success = await resetTodayAttendanceLogs()
      if (success) {
        setTodayLogs([])

        // Reset work status
        const today = new Date().toISOString().split("T")[0]
        const resetStatus = {
          status: "Chưa cập nhật",
          totalWorkTime: 0,
          overtime: 0,
          remarks: "",
        }
        await updateDailyWorkStatus(today, resetStatus)
        setWorkStatus(resetStatus)

        // Refresh weekly status
        setWeeklyStatusRefreshTrigger((prev) => prev + 1)

        return true
      }
      return false
    } catch (error) {
      console.error("Error resetting today's logs:", error)
      return false
    }
  }

  // Add a new attendance log
  const handleAddAttendanceLog = async (logType, force = false) => {
    try {
      console.log("Starting handleAddAttendanceLog with logType:", logType, "force:", force)
      const today = new Date().toISOString().split("T")[0]

      // If not forcing the action, validate time rules
      if (!force) {
        let previousActionType = null
        let previousActionTime = null

        if (logType === "go_work") {
          const goWorkLog = await getAttendanceLogByType(today, "go_work")
          if (goWorkLog) {
            previousActionType = "go_work"
            previousActionTime = goWorkLog.timestamp
          }
        } else if (logType === "check_out") {
          const checkInLog = await getAttendanceLogByType(today, "check_in")
          if (checkInLog) {
            previousActionType = "check_in"
            previousActionTime = checkInLog.timestamp
          }
        }

        // Validate time interval
        if (typeof validateTimeInterval === "function") {
          const validation = validateTimeInterval(previousActionType, previousActionTime, logType)
          if (!validation.isValid && !force) {
            return {
              success: false,
              message: validation.message,
              needsConfirmation: true,
            }
          }
        } else {
          console.warn("validateTimeInterval function not available")
        }
      }

      // Add the attendance log
      console.log("Adding attendance log for date:", today, "type:", logType)
      const newLog = await addAttendanceLogDB(today, logType)

      if (newLog) {
        console.log("Successfully added log:", newLog)
        // Update local state
        setTodayLogs([...todayLogs, newLog])

        // Update work status based on the new log
        try {
          if (typeof updateWorkStatusForNewLog === "function") {
            const updatedStatus = await updateWorkStatusForNewLog(today, logType)
            if (updatedStatus) {
              setWorkStatus(updatedStatus)
            }
          } else {
            console.warn("updateWorkStatusForNewLog function not available")
          }
        } catch (statusError) {
          console.error("Error updating work status:", statusError)
          // Continue even if status update fails
        }

        // Cancel corresponding notification
        try {
          if (logType === "go_work") {
            await cancelNotificationsByType("departure")
          } else if (logType === "check_in") {
            await cancelNotificationsByType("check-in")
          } else if (logType === "check_out") {
            await cancelNotificationsByType("check-out")
          } else if (logType === "complete") {
            // Cancel all notifications when complete
            await cancelAllNotifications()

            // Reschedule notifications for next day
            if (currentShift) {
              await scheduleNotificationsForActiveShift()
            }
          }
        } catch (notificationError) {
          console.error("Error handling notifications:", notificationError)
          // Continue even if notification handling fails
        }

        return { success: true, log: newLog }
      }

      console.error("Failed to add attendance log - newLog is null or undefined")
      return { success: false, message: "Failed to add attendance log" }
    } catch (error) {
      console.error("Error in handleAddAttendanceLog:", error)
      console.error("Error details:", error.message)
      console.error("Error stack:", error.stack)
      return { success: false, message: error.message }
    }
  }

  // Context value
  const contextValue = {
    darkMode,
    setDarkMode,
    language,
    setLanguage,
    t,
    soundEnabled,
    setSoundEnabled,
    vibrationEnabled,
    setVibrationEnabled,
    multiButtonMode,
    setMultiButtonMode,
    alarmEnabled,
    setAlarmEnabled,
    handleUpdateSettings,
    shifts,
    setShifts,
    handleAddShift,
    currentShift,
    setCurrentShift,
    todayLogs,
    setTodayLogs,
    workStatus,
    setWorkStatus,
    notes,
    setNotes,
    weeklyStatus,
    setWeeklyStatus,
    isLoading,
    dataError,
    showAlarmModal,
    setShowAlarmModal,
    alarmData,
    setAlarmData,
    weeklyStatusRefreshTrigger,
    refreshWeeklyStatus: () => setWeeklyStatusRefreshTrigger((prev) => prev + 1),
    resetTodayLogs: handleResetTodayLogs,
    addAttendanceLog: handleAddAttendanceLog,
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
}

