import * as Notifications from "expo-notifications"
import { initNotifications, scheduleNotification } from "./notificationUtils"

// Thêm hàm lên lịch thông báo cho ghi chú

/**
 * Lên lịch thông báo cho ghi chú
 * @param {Object} note - Thông tin ghi chú
 * @param {Array} shifts - Danh sách ca làm việc
 */
export const scheduleNoteNotifications = async (note, shifts) => {
  if (!note.reminderTime) return

  const hasPermission = await initNotifications()
  if (!hasPermission) return

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
  if (reminderDays.length === 0) return

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

    // Lên lịch thông báo
    await scheduleNotification({
      title: note.title,
      body: note.content,
      date: nextDate,
      data: { type: "note", noteId: note.id },
      identifier: `note_${note.id}_${day}`,
    })
  }
}

/**
 * Hủy tất cả thông báo của một ghi chú
 * @param {string} noteId - ID của ghi chú
 */
export const cancelNoteNotifications = async (noteId) => {
  // Hủy thông báo cho tất cả các ngày trong tuần
  for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    await Notifications.cancelScheduledNotificationAsync(`note_${noteId}_${day}`)
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

