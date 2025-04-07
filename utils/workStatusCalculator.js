import { parseISO, differenceInMinutes, format } from "date-fns"

/**
 * Tính toán trạng thái công dựa trên dữ liệu chấm công và ca làm việc
 * @param {Array} logs - Mảng các log chấm công trong ngày
 * @param {Object} shift - Thông tin ca làm việc
 * @returns {Object} Trạng thái công đã tính toán
 */
export const calculateWorkStatus = (logs, shift) => {
  if (!logs || !shift) {
    return {
      status: "unknown", // Chưa cập nhật
      checkInTime: null,
      checkOutTime: null,
      totalWorkTime: 0,
      overtime: 0,
      remarks: "",
    }
  }

  // Tìm các log chấm công
  const goWorkLog = logs.find((log) => log.type === "go_work")
  const checkInLog = logs.find((log) => log.type === "check_in")
  const checkOutLog = logs.find((log) => log.type === "check_out")
  const punchLog = logs.find((log) => log.type === "punch")
  const completeLog = logs.find((log) => log.type === "complete")

  // Kiểm tra trạng thái hoàn tất
  const isCompleted =
    logs.some((log) => log.type === "complete") ||
    (checkOutLog && checkInLog) ||
    (goWorkLog && logs.length === 1 && shift.onlyGoWorkMode)

  // Parse thời gian từ shift
  const parseShiftTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  const startTime = parseShiftTime(shift.startTime)
  const officeEndTime = parseShiftTime(shift.officeEndTime)
  const endTime = parseShiftTime(shift.endTime)

  // Handle overnight shifts - if end time is before start time, it's the next day
  if (endTime < startTime) {
    endTime.setDate(endTime.getDate() + 1)
  }

  // Nếu đã hoàn tất hoặc chỉ có nút "Đi làm" và đã bấm
  if (isCompleted) {
    // Xác định thời gian check-in và check-out
    let actualCheckInTime, actualCheckOutTime

    if (checkInLog && checkOutLog) {
      actualCheckInTime = parseISO(checkInLog.timestamp)
      actualCheckOutTime = parseISO(checkOutLog.timestamp)

      // Handle overnight shifts - if check-out is before check-in, it's the next day
      if (actualCheckOutTime < actualCheckInTime) {
        actualCheckOutTime = new Date(actualCheckOutTime)
        actualCheckOutTime.setDate(actualCheckOutTime.getDate() + 1)
      }
    } else if (goWorkLog && shift.onlyGoWorkMode) {
      // Nếu chỉ có nút "Đi làm" và đã bấm
      actualCheckInTime = startTime
      actualCheckOutTime = endTime
    } else {
      // Trường hợp khác, sử dụng thời gian ca làm việc
      actualCheckInTime = startTime
      actualCheckOutTime = endTime
    }

    // Tính OT
    let overtimeMinutes = 0
    if (actualCheckOutTime > officeEndTime) {
      overtimeMinutes = differenceInMinutes(actualCheckOutTime, officeEndTime)
      overtimeMinutes = Math.max(0, overtimeMinutes) // Đảm bảo không âm
    }

    // Tính tổng thời gian làm việc
    const totalMinutes = differenceInMinutes(endTime, startTime)

    // Chuyển đổi sang giờ
    const totalWorkTime = Number.parseFloat((totalMinutes / 60).toFixed(2))
    const overtime = Number.parseFloat((overtimeMinutes / 60).toFixed(2))

    return {
      status: "complete", // Đủ công
      checkInTime: format(actualCheckInTime, "HH:mm:ss"),
      checkOutTime: format(actualCheckOutTime, "HH:mm:ss"),
      totalWorkTime,
      overtime,
      remarks: overtime > 0 ? `OT ${overtime.toFixed(2)}h.` : "",
    }
  }

  // Nếu không hoàn tất, xử lý như trước
  if (!checkInLog || !checkOutLog) {
    return {
      status: "incomplete", // Thiếu chấm công
      checkInTime: checkInLog ? format(parseISO(checkInLog.timestamp), "HH:mm:ss") : null,
      checkOutTime: checkOutLog ? format(parseISO(checkOutLog.timestamp), "HH:mm:ss") : null,
      totalWorkTime: 0,
      overtime: 0,
      remarks: "Thiếu chấm công",
    }
  }

  // Parse thời gian check-in/check-out
  const checkInTime = parseISO(checkInLog.timestamp)
  const checkOutTime = parseISO(checkOutLog.timestamp)

  // Tính phạt đi muộn
  let lateMinutes = 0
  if (checkInTime > startTime) {
    lateMinutes = Math.ceil(differenceInMinutes(checkInTime, startTime) / 30) * 30
  }

  // Tính phạt về sớm
  let earlyMinutes = 0
  if (checkOutTime < officeEndTime) {
    earlyMinutes = Math.ceil(differenceInMinutes(officeEndTime, checkOutTime) / 30) * 30
  }

  // Tính OT
  let overtimeMinutes = 0
  if (checkOutTime > officeEndTime) {
    const maxEndTime = endTime > checkOutTime ? checkOutTime : endTime
    overtimeMinutes = differenceInMinutes(maxEndTime, officeEndTime)
    overtimeMinutes = Math.max(0, overtimeMinutes) // Đảm bảo không âm
  }

  // Tính tổng thời gian làm việc
  const totalMinutes = differenceInMinutes(checkOutTime, checkInTime)
  const totalWorkMinutes = Math.max(0, totalMinutes - lateMinutes - earlyMinutes)

  // Chuyển đổi sang giờ
  const totalWorkTime = Number.parseFloat((totalWorkMinutes / 60).toFixed(2))
  const overtime = Number.parseFloat((overtimeMinutes / 60).toFixed(2))

  // Xác định trạng thái và ghi chú
  let status = "complete" // Đủ công
  let remarks = ""

  if (lateMinutes > 0 || earlyMinutes > 0) {
    status = "RV" // Vào muộn/Ra sớm

    if (lateMinutes > 0) {
      remarks += `Đi muộn ${lateMinutes} phút. `
    }

    if (earlyMinutes > 0) {
      remarks += `Về sớm ${earlyMinutes} phút. `
    }
  }

  if (overtime > 0) {
    remarks += `OT ${overtime.toFixed(2)}h. `
  }

  return {
    status,
    checkInTime: format(checkInTime, "HH:mm:ss"),
    checkOutTime: format(checkOutTime, "HH:mm:ss"),
    totalWorkTime,
    overtime,
    remarks: remarks.trim(),
  }
}

/**
 * Xác định trạng thái hiển thị cho lưới tuần
 * @param {Object} dailyStatus - Trạng thái công của ngày
 * @returns {String} Trạng thái hiển thị
 */
export const getDisplayStatus = (dailyStatus) => {
  if (!dailyStatus) return "unknown"

  switch (dailyStatus.status) {
    case "complete":
      return "complete" // ✅ Đủ công
    case "incomplete":
      return "incomplete" // ❗ Thiếu chấm công
    case "RV":
      return "RV" // RV Vào muộn/Ra sớm
    case "leave":
      return "leave" // 📩 Nghỉ phép
    case "sick":
      return "sick" // 🛌 Nghỉ bệnh
    case "holiday":
      return "holiday" // 🎌 Nghỉ lễ
    case "absent":
      return "absent" // ❌ Vắng
    default:
      return "unknown" // ❓ Chưa cập nhật
  }
}

/**
 * Lấy icon cho trạng thái
 * @param {String} status - Trạng thái
 * @returns {String} Tên icon
 */
export const getStatusIcon = (status) => {
  switch (status) {
    case "complete":
      return "checkmark-circle"
    case "incomplete":
      return "alert-circle"
    case "RV":
      return "time"
    case "leave":
      return "mail"
    case "sick":
      return "medkit"
    case "holiday":
      return "flag"
    case "absent":
      return "close-circle"
    default:
      return "help-circle"
  }
}

/**
 * Lấy màu cho trạng thái
 * @param {String} status - Trạng thái
 * @param {Object} theme - Theme hiện tại
 * @returns {String} Mã màu
 */
export const getStatusColor = (status, theme) => {
  switch (status) {
    case "complete":
      return "#4CAF50" // Xanh lá
    case "incomplete":
      return "#FFC107" // Vàng
    case "RV":
      return "#FF5722" // Cam đỏ
    case "leave":
      return "#2196F3" // Xanh dương
    case "sick":
      return "#9C27B0" // Tím
    case "holiday":
      return "#FF9800" // Cam
    case "absent":
      return "#F44336" // Đỏ
    default:
      return theme.colors.textSecondary // Màu text phụ
  }
}

