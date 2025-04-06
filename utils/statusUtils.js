/**
 * Status Utilities Module
 *
 * This module provides utilities for handling attendance status indicators,
 * determining status based on attendance logs, and formatting status details
 * for display in the UI.
 */

// Define all possible status types used in the application
export const STATUS_TYPES = {
  FULL_ATTENDANCE: "full_attendance", // Đủ Công - Full attendance with no issues
  INCOMPLETE: "incomplete", // Thiếu Chấm Công - Missing check-in or check-out
  NOT_UPDATED: "not_updated", // Chưa Cập Nhật - No attendance data yet
  LEAVE: "leave", // Nghỉ Phép - Approved leave
  SICK: "sick", // Nghỉ Bệnh - Sick leave
  HOLIDAY: "holiday", // Nghỉ Lễ - Public holiday
  ABSENT: "absent", // Vắng Không Lý Do - Unauthorized absence
  LATE_ARRIVAL: "late_arrival", // Vào Muộn - Late arrival
  EARLY_DEPARTURE: "early_departure", // Ra Sớm - Early departure
  LATE_AND_EARLY: "late_and_early", // Vào Muộn & Ra Sớm - Both late and early
  OVERTIME: "overtime", // Tăng Ca (OT) - Overtime work
}

/**
 * Get icon, label, and color for a specific status type
 *
 * This function maps each status type to its visual representation,
 * including the icon to display, the label text, and the color to use.
 * Used for consistent status visualization across the app.
 *
 * @param {string} status - The status type from STATUS_TYPES
 * @returns {Object} - Object containing icon, iconType, label, color, and description
 */
export const getStatusIcon = (status) => {
  switch (status) {
    case STATUS_TYPES.FULL_ATTENDANCE:
      return {
        icon: "checkmark-circle",
        iconType: "ionicon",
        label: "Đủ Công",
        color: "#4caf50",
        description: "Chấm công đầy đủ và đúng giờ",
      }
    case STATUS_TYPES.INCOMPLETE:
      return {
        icon: "alert-triangle",
        iconType: "ionicon",
        label: "Thiếu Chấm Công",
        color: "#ff9800",
        description: "Thiếu chấm công vào hoặc ra",
      }
    case STATUS_TYPES.NOT_UPDATED:
      return {
        icon: "help-circle",
        iconType: "ionicon",
        label: "Chưa Cập Nhật",
        color: "#9e9e9e",
        description: "Chưa có thông tin chấm công",
      }
    case STATUS_TYPES.LEAVE:
      return {
        icon: "briefcase",
        iconType: "ionicon",
        label: "Nghỉ Phép",
        color: "#2196f3",
        description: "Đã đăng ký nghỉ phép",
      }
    case STATUS_TYPES.SICK:
      return {
        icon: "medkit",
        iconType: "ionicon",
        label: "Nghỉ Bệnh",
        color: "#9c27b0",
        description: "Đã đăng ký nghỉ bệnh",
      }
    case STATUS_TYPES.HOLIDAY:
      return {
        icon: "gift",
        iconType: "ionicon",
        label: "Nghỉ Lễ",
        color: "#e91e63",
        description: "Ngày nghỉ lễ",
      }
    case STATUS_TYPES.ABSENT:
      return {
        icon: "close-circle",
        iconType: "ionicon",
        label: "Vắng Không Lý Do",
        color: "#f44336",
        description: "Vắng mặt không có lý do",
      }
    case STATUS_TYPES.LATE_ARRIVAL:
      return {
        icon: "time",
        iconType: "ionicon",
        label: "Vào Muộn",
        color: "#ff9800",
        description: "Đi làm muộn giờ",
      }
    case STATUS_TYPES.EARLY_DEPARTURE:
      return {
        icon: "exit",
        iconType: "ionicon",
        label: "Ra Sớm",
        color: "#ff9800",
        description: "Về sớm trước giờ",
      }
    case STATUS_TYPES.LATE_AND_EARLY:
      return {
        icon: "timer-outline",
        iconType: "ionicon",
        label: "Vào Muộn & Ra Sớm",
        color: "#ff9800",
        description: "Vừa đi muộn vừa về sớm",
      }
    case STATUS_TYPES.OVERTIME:
      return {
        icon: "hourglass",
        iconType: "ionicon",
        label: "Tăng Ca",
        color: "#2196f3",
        description: "Làm việc ngoài giờ",
      }
    default:
      return {
        icon: "ellipsis-horizontal",
        iconType: "ionicon",
        label: "Không Xác Định",
        color: "#9e9e9e",
        description: "Trạng thái không xác định",
      }
  }
}

/**
 * Determine attendance status based on logs and shift times
 *
 * This function analyzes attendance logs and shift information to determine
 * the appropriate status for a given day. It checks for completeness of actions,
 * late arrivals, early departures, and overtime.
 *
 * @param {Array} logs - Array of attendance logs for the day
 * @param {Object} shift - Shift information including start and end times
 * @returns {string} - The determined status from STATUS_TYPES
 */
export const determineStatus = (logs, shift) => {
  // If no logs, status is not updated
  if (!logs || logs.length === 0) {
    return STATUS_TYPES.NOT_UPDATED
  }

  // Check if all required actions are completed
  const hasGoWork = logs.some((log) => log.type === "go_work")
  const hasCheckIn = logs.some((log) => log.type === "check_in")
  const hasCheckOut = logs.some((log) => log.type === "check_out")
  const hasComplete = logs.some((log) => log.type === "complete")

  // If incomplete actions, mark as incomplete
  if (!hasGoWork || !hasCheckIn || !hasCheckOut) {
    return STATUS_TYPES.INCOMPLETE
  }

  // If no shift data, we can only determine if attendance is complete
  if (!shift) {
    return hasComplete ? STATUS_TYPES.FULL_ATTENDANCE : STATUS_TYPES.INCOMPLETE
  }

  // Get timestamps for check-in and check-out
  const checkInLog = logs.find((log) => log.type === "check_in")
  const checkOutLog = logs.find((log) => log.type === "check_out")

  if (!checkInLog || !checkOutLog) {
    return STATUS_TYPES.INCOMPLETE
  }

  const checkInTime = new Date(checkInLog.timestamp)
  const checkOutTime = new Date(checkOutLog.timestamp)

  // Parse shift times
  const [startHours, startMinutes] = shift.startTime.split(":").map(Number)
  const [endHours, endMinutes] = shift.officeEndTime.split(":").map(Number)

  // Create Date objects for shift times
  const today = checkInTime.toISOString().split("T")[0]
  const shiftStartTime = new Date(today)
  shiftStartTime.setHours(startHours, startMinutes, 0, 0)

  const shiftEndTime = new Date(today)
  shiftEndTime.setHours(endHours, endMinutes, 0, 0)

  // Check for late arrival (more than 5 minutes late)
  const isLateArrival = checkInTime > new Date(shiftStartTime.getTime() + 5 * 60 * 1000)

  // Check for early departure (left more than 5 minutes early)
  const isEarlyDeparture = checkOutTime < new Date(shiftEndTime.getTime() - 5 * 60 * 1000)

  // Check for overtime (more than 30 minutes after end time)
  const isOvertime = checkOutTime > new Date(shiftEndTime.getTime() + 30 * 60 * 1000)

  // Determine status based on conditions
  if (isLateArrival && isEarlyDeparture) {
    return STATUS_TYPES.LATE_AND_EARLY
  } else if (isLateArrival) {
    return STATUS_TYPES.LATE_ARRIVAL
  } else if (isEarlyDeparture) {
    return STATUS_TYPES.EARLY_DEPARTURE
  } else if (isOvertime) {
    return STATUS_TYPES.OVERTIME
  }

  // If no issues found, mark as full attendance
  return STATUS_TYPES.FULL_ATTENDANCE
}

/**
 * Format status details for tooltip display
 *
 * This function generates a formatted string with detailed information about
 * a day's attendance status, including check-in/out times, work duration,
 * and shift information.
 *
 * @param {Array} logs - Array of attendance logs for the day
 * @param {string} status - The status type from STATUS_TYPES
 * @param {Object} shift - Shift information
 * @returns {string} - Formatted details string for display in tooltip
 */
export const formatStatusDetails = (logs, status, shift) => {
  const details = []

  // Add status label and description
  const { label, description } = getStatusIcon(status)
  details.push(`Trạng thái: ${label}`)
  details.push(`${description}`)
  details.push("")

  // Add check-in and check-out times if available
  const checkInLog = logs?.find((log) => log.type === "check_in")
  const checkOutLog = logs?.find((log) => log.type === "check_out")

  if (checkInLog) {
    const checkInTime = new Date(checkInLog.timestamp)
    details.push(`Giờ vào: ${checkInTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`)
  } else {
    details.push("Giờ vào: Chưa chấm công")
  }

  if (checkOutLog) {
    const checkOutTime = new Date(checkOutLog.timestamp)
    details.push(`Giờ ra: ${checkOutTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`)
  } else {
    details.push("Giờ ra: Chưa chấm công")
  }

  // Add work duration if both check-in and check-out are available
  if (checkInLog && checkOutLog) {
    const checkInTime = new Date(checkInLog.timestamp)
    const checkOutTime = new Date(checkOutLog.timestamp)
    const durationMs = checkOutTime - checkInTime
    const hours = Math.floor(durationMs / (1000 * 60 * 60))
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    details.push(`Thời gian làm việc: ${hours}h ${minutes}m`)
  }

  // Add shift information if available
  if (shift) {
    details.push("")
    details.push(`Ca làm việc: ${shift.name}`)
    details.push(`Giờ tiêu chuẩn: ${shift.startTime} - ${shift.endTime}`)
  }

  return details.join("\n")
}

/**
 * Get available status options for manual status updates
 *
 * This function returns an array of status options that can be manually
 * selected by the user when updating a day's status.
 *
 * @returns {Array} - Array of status option objects with value and label
 */
export const getStatusOptions = () => [
  { value: STATUS_TYPES.FULL_ATTENDANCE, label: "Đủ Công" },
  { value: STATUS_TYPES.INCOMPLETE, label: "Thiếu Chấm Công" },
  { value: STATUS_TYPES.LEAVE, label: "Nghỉ Phép" },
  { value: STATUS_TYPES.SICK, label: "Nghỉ Bệnh" },
  { value: STATUS_TYPES.HOLIDAY, label: "Nghỉ Lễ" },
  { value: STATUS_TYPES.ABSENT, label: "Vắng Không Lý Do" },
]

