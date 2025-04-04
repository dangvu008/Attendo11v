import AsyncStorage from "@react-native-async-storage/async-storage"
import { parseISO, isWithinInterval } from "date-fns"
import { v4 as uuidv4 } from "uuid"

// Database keys
const SHIFTS_KEY = "attendo_shifts"
const WORK_LOGS_KEY = "attendo_work_logs"
const WORK_STATUS_KEY = "attendo_work_status"
const NOTES_KEY = "attendo_notes"
const WEATHER_SETTINGS_KEY = "attendo_weather_settings"
const INITIALIZED_KEY = "attendo_initialized"
const DAILY_WORK_STATUS_KEY = "attendo_daily_work_status"

export const initializeDatabase = async () => {
  try {
    const initialized = await AsyncStorage.getItem(INITIALIZED_KEY)

    if (!initialized) {
      await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify([]))
      await AsyncStorage.setItem(WORK_LOGS_KEY, JSON.stringify([]))
      await AsyncStorage.setItem(WORK_STATUS_KEY, JSON.stringify({}))
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify([]))
      await AsyncStorage.setItem(
        WEATHER_SETTINGS_KEY,
        JSON.stringify({
          enabled: true,
          alertRain: true,
          alertCold: true,
          alertHeat: true,
          alertStorm: true,
        }),
      )
      await AsyncStorage.setItem(INITIALIZED_KEY, "true")
    }
  } catch (error) {
    console.error("Failed to initialize database:", error)
    throw error
  }
}

// Shifts
export const getShifts = async () => {
  try {
    const shiftsJson = await AsyncStorage.getItem(SHIFTS_KEY)
    return shiftsJson ? JSON.parse(shiftsJson) : []
  } catch (error) {
    console.error("Failed to get shifts:", error)
    return []
  }
}

export const saveShift = async (shift) => {
  try {
    const shifts = await getShifts()
    const newShift = {
      ...shift,
      id: shift.id || Date.now(),
    }

    shifts.push(newShift)
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts))

    return newShift.id
  } catch (error) {
    console.error("Failed to save shift:", error)
    throw error
  }
}

export const updateShiftById = async (shiftId, updatedShift) => {
  try {
    const shifts = await getShifts()
    const index = shifts.findIndex((shift) => shift.id === shiftId)

    if (index !== -1) {
      shifts[index] = {
        ...shifts[index],
        ...updatedShift,
        id: shiftId,
      }

      await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts))
      return true
    }

    return false
  } catch (error) {
    console.error("Failed to update shift:", error)
    throw error
  }
}

export const removeShift = async (shiftId) => {
  try {
    const shifts = await getShifts()
    const filteredShifts = shifts.filter((shift) => shift.id !== shiftId)

    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(filteredShifts))
    return true
  } catch (error) {
    console.error("Failed to remove shift:", error)
    throw error
  }
}

// Work Logs
export const getWorkLogs = async (startDate, endDate) => {
  try {
    const logsJson = await AsyncStorage.getItem(WORK_LOGS_KEY)
    const logs = logsJson ? JSON.parse(logsJson) : []

    if (startDate && endDate) {
      return logs.filter((log) => {
        const logDate = parseISO(log.timestamp)
        return isWithinInterval(logDate, { start: startDate, end: endDate })
      })
    }

    return logs
  } catch (error) {
    console.error("Failed to get work logs:", error)
    return []
  }
}

export const saveWorkLog = async (log) => {
  try {
    const logs = await getWorkLogs()
    const newLog = {
      ...log,
      id: Date.now(),
    }

    logs.push(newLog)
    await AsyncStorage.setItem(WORK_LOGS_KEY, JSON.stringify(logs))

    return newLog.id
  } catch (error) {
    console.error("Failed to save work log:", error)
    throw error
  }
}

// Work Status
export const getWorkStatus = async (date) => {
  try {
    const statusJson = await AsyncStorage.getItem(WORK_STATUS_KEY)
    const allStatus = statusJson ? JSON.parse(statusJson) : {}

    return allStatus[date] || null
  } catch (error) {
    console.error("Failed to get work status:", error)
    return null
  }
}

export const saveWorkStatus = async (status) => {
  try {
    const statusJson = await AsyncStorage.getItem(WORK_STATUS_KEY)
    const allStatus = statusJson ? JSON.parse(statusJson) : {}

    allStatus[status.date] = status
    await AsyncStorage.setItem(WORK_STATUS_KEY, JSON.stringify(allStatus))

    return true
  } catch (error) {
    console.error("Failed to save work status:", error)
    throw error
  }
}

export const updateWorkStatus = async (date, updates) => {
  try {
    const status = await getWorkStatus(date)

    if (status) {
      const updatedStatus = {
        ...status,
        ...updates,
      }

      return await saveWorkStatus(updatedStatus)
    }

    return false
  } catch (error) {
    console.error("Failed to update work status:", error)
    throw error
  }
}

// Notes
export const getNotes = async () => {
  try {
    const notesJson = await AsyncStorage.getItem(NOTES_KEY)
    return notesJson ? JSON.parse(notesJson) : []
  } catch (error) {
    console.error("Failed to get notes:", error)
    return []
  }
}

export const saveNote = async (note) => {
  try {
    const notes = await getNotes()
    const newNote = {
      ...note,
      id: note.id || uuidv4(), // Sử dụng UUID nếu không có ID
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    notes.push(newNote)
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes))

    return newNote.id
  } catch (error) {
    console.error("Failed to save note:", error)
    throw error
  }
}

export const updateNote = async (noteId, updatedNote) => {
  try {
    const notes = await getNotes()
    const index = notes.findIndex((note) => note.id === noteId)

    if (index !== -1) {
      notes[index] = {
        ...notes[index],
        ...updatedNote,
        id: noteId,
        updatedAt: new Date().toISOString(),
      }

      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes))
      return true
    }

    return false
  } catch (error) {
    console.error("Failed to update note:", error)
    throw error
  }
}

export const deleteNote = async (noteId) => {
  try {
    const notes = await getNotes()
    const filteredNotes = notes.filter((note) => note.id !== noteId)

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(filteredNotes))
    return true
  } catch (error) {
    console.error("Failed to delete note:", error)
    throw error
  }
}

// Weather Settings
export const getWeatherSettings = async () => {
  try {
    const settingsJson = await AsyncStorage.getItem(WEATHER_SETTINGS_KEY)
    return settingsJson
      ? JSON.parse(settingsJson)
      : {
          enabled: true,
          alertRain: true,
          alertCold: true,
          alertHeat: true,
          alertStorm: true,
        }
  } catch (error) {
    console.error("Failed to get weather settings:", error)
    return {
      enabled: true,
      alertRain: true,
      alertCold: true,
      alertHeat: true,
      alertStorm: true,
    }
  }
}

export const saveWeatherSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(WEATHER_SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch (error) {
    console.error("Failed to save weather settings:", error)
    throw error
  }
}

// Daily Work Status
export const getDailyWorkStatus = async (date) => {
  try {
    const statusJson = await AsyncStorage.getItem(`${DAILY_WORK_STATUS_KEY}_${date}`)
    return statusJson ? JSON.parse(statusJson) : null
  } catch (error) {
    console.error("Failed to get daily work status:", error)
    return null
  }
}

export const updateDailyWorkStatus = async (date, status) => {
  try {
    await AsyncStorage.setItem(`${DAILY_WORK_STATUS_KEY}_${date}`, JSON.stringify(status))
    return true
  } catch (error) {
    console.error("Failed to update daily work status:", error)
    throw error
  }
}

