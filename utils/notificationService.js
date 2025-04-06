import * as Notifications from "expo-notifications"
import { initNotifications, scheduleNotification } from "./notificationUtils"
import AsyncStorage from "@react-native-async-storage/async-storage"

// Add a logging function to track notification activities
const logNotificationActivity = async (action, details) => {
  try {
    const now = new Date().toISOString()
    const logKey = "attendo_notification_logs"
    const existingLogsJson = await AsyncStorage.getItem(logKey)
    const existingLogs = existingLogsJson ? JSON.parse(existingLogsJson) : []

    // Add new log entry
    const newLog = {
      timestamp: now,
      action,
      details,
    }

    // Keep only the last 100 logs to prevent storage issues
    const updatedLogs = [newLog, ...existingLogs].slice(0, 100)
    await AsyncStorage.setItem(logKey, JSON.stringify(updatedLogs))

    console.log(`[Notification ${action}]`, details)
  } catch (error) {
    console.error("Failed to log notification activity:", error)
  }
}

// Add a function to check for duplicate notifications
const isDuplicateNotification = async (identifier, timeWindowMinutes = 60) => {
  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()

    // Check if there's already a notification with the same identifier
    const existingNotification = scheduledNotifications.find((notification) => notification.identifier === identifier)

    if (existingNotification) {
      // If notification exists, check if it's scheduled within the time window
      const existingTriggerDate = new Date(existingNotification.trigger.date)
      const now = new Date()
      const timeDiffMinutes = Math.abs((existingTriggerDate - now) / (60 * 1000))

      // If it's within the time window, consider it a duplicate
      return timeDiffMinutes <= timeWindowMinutes
    }

    return false
  } catch (error) {
    console.error("Error checking for duplicate notifications:", error)
    return false // In case of error, allow the notification to be scheduled
  }
}

// Add a notification log tracker to prevent duplicates
const NOTIFICATION_LOG_KEY = "attendo_notification_log"

/**
 * Log a scheduled notification to prevent duplicates
 * @param {string} identifier - Unique notification identifier
 * @param {Date} scheduledTime - When the notification is scheduled for
 */
const logScheduledNotification = async (identifier, scheduledTime) => {
  try {
    const logJson = await AsyncStorage.getItem(NOTIFICATION_LOG_KEY)
    const log = logJson ? JSON.parse(logJson) : {}

    // Store the scheduled time
    log[identifier] = {
      scheduledAt: new Date().toISOString(),
      scheduledFor: scheduledTime.toISOString(),
    }

    // Clean up old entries (older than 7 days)
    const now = new Date()
    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7))

    Object.keys(log).forEach((key) => {
      const entry = log[key]
      if (new Date(entry.scheduledFor) < oneWeekAgo) {
        delete log[key]
      }
    })

    await AsyncStorage.setItem(NOTIFICATION_LOG_KEY, JSON.stringify(log))
    console.log(`[Notification] Logged: ${identifier} for ${scheduledTime.toISOString()}`)
  } catch (error) {
    console.error("[Notification] Failed to log scheduled notification:", error)
  }
}

/**
 * Check if a notification with the same identifier has been scheduled recently
 * @param {string} identifier - Notification identifier
 * @returns {boolean} True if already scheduled
 */
const isNotificationAlreadyScheduled = async (identifier) => {
  try {
    const logJson = await AsyncStorage.getItem(NOTIFICATION_LOG_KEY)
    if (!logJson) return false

    const log = JSON.parse(logJson)
    return !!log[identifier]
  } catch (error) {
    console.error("[Notification] Failed to check notification log:", error)
    return false
  }
}

/**
 * Lên lịch thông báo cho ghi chú
 * @param {Object} note - Thông tin ghi chú
 * @param {Array} shifts - Danh sách ca làm việc
 */
export const scheduleNoteNotifications = async (note, shifts) => {
  try {
    if (!note.reminderTime) return

    const hasPermission = await initNotifications()
    if (!hasPermission) {
      logNotificationActivity("permission_denied", { noteId: note.id })
      return
    }

    // Xác định các ngày cần nhắc nhở
    let reminderDays = []

    // Nếu ghi chú liên kết với ca làm việc
    if (note.associatedShiftIds && note.associatedShiftIds.length > 0) {
      // Lấy tất cả ngày từ các ca được liên kết
      note.associatedShiftIds.forEach((shiftId) => {
        const shift = shifts.find((s) => s.id === shiftId)
        if (shift && shift.days) {
          // Thêm các ngày không trùng lặp
          shift.days.forEach((day) => {
            if (!reminderDays.includes(day)) {
              reminderDays.push(day)
            }
          })
        }
      })
    }
    // Nếu ghi chú không liên kết với ca
    else if (note.explicitReminderDays && note.explicitReminderDays.length > 0) {
      // Chuyển đổi index thành mã ngày
      reminderDays = note.explicitReminderDays.map((index) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index])
    }

    // Nếu không có ngày nào, không lên lịch
    if (reminderDays.length === 0) {
      logNotificationActivity("no_reminder_days", { noteId: note.id })
      return
    }

    // Lấy giờ và phút từ reminderTime
    const reminderDate = new Date(note.reminderTime)
    const hours = reminderDate.getHours()
    const minutes = reminderDate.getMinutes()

    // Lên lịch thông báo cho từng ngày
    for (const day of reminderDays) {
      const dayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day)
      if (dayIndex === -1) continue

      // Tính toán ngày tiếp theo của tuần có ngày này
      const nextDate = getNextDayOfWeek(dayIndex)
      nextDate.setHours(hours, minutes, 0, 0)

      // Nếu thời gian đã qua, chuyển sang tuần sau
      if (nextDate < new Date()) {
        nextDate.setDate(nextDate.getDate() + 7)
      }

      const notificationId = `note_${note.id}_${day}`

      // Check for duplicates before scheduling
      const isDuplicate = await isDuplicateNotification(notificationId)
      if (isDuplicate) {
        logNotificationActivity("duplicate_skipped", {
          noteId: note.id,
          day,
          scheduledTime: nextDate.toISOString(),
        })
        continue
      }

      // Lên lịch thông báo
      await scheduleNotification({
        title: note.title,
        body: note.content,
        date: nextDate,
        data: { type: "note", noteId: note.id },
        identifier: notificationId,
      })

      logNotificationActivity("scheduled", {
        noteId: note.id,
        day,
        scheduledTime: nextDate.toISOString(),
      })
    }
  } catch (error) {
    console.error("Error scheduling note notifications:", error)
    logNotificationActivity("error", {
      noteId: note?.id,
      error: error.message,
    })
  }
}

/**
 * Hủy tất cả thông báo của một ghi chú
 * @param {string} noteId - ID của ghi chú
 */
export const cancelNoteNotifications = async (noteId) => {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()

    // Filter notifications related to this note
    const noteNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith(`note_${noteId}_`),
    )

    // Cancel each notification
    for (const notification of noteNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      logNotificationActivity("canceled", {
        noteId,
        identifier: notification.identifier,
      })
    }
  } catch (error) {
    console.error("Error canceling note notifications:", error)
    logNotificationActivity("cancel_error", {
      noteId,
      error: error.message,
    })
  }
}

/**
 * Hủy thông báo theo loại
 * @param {string} type - Loại thông báo
 * @param {string} date - Ngày (định dạng yyyy-MM-dd)
 */
export const cancelNotificationByType = async (type, date) => {
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()

    // Filter notifications by type and date
    const matchingNotifications = scheduledNotifications.filter((notification) => {
      const notificationData = notification.content.data || {}
      return notificationData.type === type && notificationData.date === date
    })

    // Cancel each matching notification
    for (const notification of matchingNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
      logNotificationActivity("canceled_by_type", {
        type,
        date,
        identifier: notification.identifier,
      })
    }
  } catch (error) {
    console.error(`Error canceling ${type} notifications for ${date}:`, error)
    logNotificationActivity("cancel_by_type_error", {
      type,
      date,
      error: error.message,
    })
  }
}

/**
 * Lấy ngày tiếp theo của tuần có ngày cụ thể
 * @param {number} dayIndex - Index của ngày (0 = Thứ 2, 6 = Chủ nhật)
 * @returns {Date} Ngày tiếp theo
 */
const getNextDayOfWeek = (dayIndex) => {
  const today = new Date()
  const todayDayIndex = (today.getDay() + 6) % 7 // Chuyển đổi 0 = Chủ nhật sang 0 = Thứ 2

  let daysToAdd = dayIndex - todayDayIndex
  if (daysToAdd <= 0) {
    daysToAdd += 7
  }

  const nextDate = new Date(today)
  nextDate.setDate(today.getDate() + daysToAdd)
  return nextDate
}

// Add a function to clear all notifications (useful for debugging)
export const clearAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    logNotificationActivity("cleared_all", { timestamp: new Date().toISOString() })
    return true
  } catch (error) {
    console.error("Error clearing all notifications:", error)
    logNotificationActivity("clear_all_error", { error: error.message })
    return false
  }
}

// Add a function to get notification logs (useful for debugging)
export const getNotificationLogs = async () => {
  try {
    const logKey = "attendo_notification_logs"
    const logsJson = await AsyncStorage.getItem(logKey)
    return logsJson ? JSON.parse(logsJson) : []
  } catch (error) {
    console.error("Error getting notification logs:", error)
    return []
  }
}

