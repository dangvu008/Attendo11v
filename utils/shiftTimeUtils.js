/**
 * Tiện ích xử lý thời gian ca làm việc
 *
 * Module này cung cấp các hàm để xử lý thời gian ca làm việc, đặc biệt là ca đêm
 * trải dài qua hai ngày. Nó đảm bảo tính toán chính xác khoảng thời gian làm việc,
 * thời gian tăng ca, và xác định đúng trạng thái "vào muộn" hoặc "ra sớm".
 */

/**
 * Chuyển đổi chuỗi thời gian thành đối tượng Date với ngày cụ thể
 *
 * @param {string} timeString - Chuỗi thời gian định dạng "HH:MM"
 * @param {Date} baseDate - Ngày cơ sở để gán thời gian
 * @returns {Date} - Đối tượng Date với ngày và thời gian đã được thiết lập
 */
export const timeStringToDate = (timeString, baseDate) => {
  if (!timeString || !baseDate) return null

  const [hours, minutes] = timeString.split(":").map(Number)
  const result = new Date(baseDate)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Xác định xem ca làm việc có phải là ca đêm hay không
 * (ca đêm được định nghĩa là ca có thời gian kết thúc vào ngày hôm sau)
 *
 * @param {string} startTime - Thời gian bắt đầu ca (HH:MM)
 * @param {string} endTime - Thời gian kết thúc ca (HH:MM)
 * @returns {boolean} - true nếu là ca đêm, false nếu không phải
 */
export const isNightShift = (startTime, endTime) => {
  if (!startTime || !endTime) return false

  const [startHours, startMinutes] = startTime.split(":").map(Number)
  const [endHours, endMinutes] = endTime.split(":").map(Number)

  const startMinutesTotal = startHours * 60 + startMinutes
  const endMinutesTotal = endHours * 60 + endMinutes

  // Nếu thời gian kết thúc nhỏ hơn thời gian bắt đầu, đây là ca đêm
  return endMinutesTotal < startMinutesTotal
}

/**
 * Tính toán thời gian kết thúc thực tế cho ca đêm
 * (thêm 1 ngày vào thời gian kết thúc nếu là ca đêm)
 *
 * @param {Date} startDateTime - Thời gian bắt đầu ca (đối tượng Date)
 * @param {string} endTimeString - Thời gian kết thúc ca (HH:MM)
 * @returns {Date} - Thời gian kết thúc thực tế (đối tượng Date)
 */
export const calculateActualEndTime = (startDateTime, endTimeString) => {
  if (!startDateTime || !endTimeString) return null

  const [endHours, endMinutes] = endTimeString.split(":").map(Number)

  // Tạo thời gian kết thúc với cùng ngày như thời gian bắt đầu
  const endDateTime = new Date(startDateTime)
  endDateTime.setHours(endHours, endMinutes, 0, 0)

  // Nếu thời gian kết thúc nhỏ hơn thời gian bắt đầu, thêm 1 ngày
  if (endDateTime < startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1)
  }

  return endDateTime
}

/**
 * Tính toán khoảng thời gian giữa hai thời điểm, xử lý đúng ca đêm
 *
 * @param {Date|string} startTime - Thời gian bắt đầu
 * @param {Date|string} endTime - Thời gian kết thúc
 * @param {boolean} inMinutes - Trả về kết quả theo phút (true) hoặc giờ (false)
 * @returns {number} - Khoảng thời gian tính bằng phút hoặc giờ
 */
export const calculateTimeDifference = (startTime, endTime, inMinutes = false) => {
  if (!startTime || !endTime) return 0

  // Chuyển đổi thành đối tượng Date nếu là chuỗi
  const start = typeof startTime === "string" ? new Date(startTime) : startTime
  const end = typeof endTime === "string" ? new Date(endTime) : endTime

  // Tính khoảng thời gian bằng mili giây
  let diffMs = end.getTime() - start.getTime()

  // Nếu kết quả âm (có thể do ca đêm), thêm 24 giờ
  if (diffMs < 0) {
    const endNextDay = new Date(end)
    endNextDay.setDate(endNextDay.getDate() + 1)
    diffMs = endNextDay.getTime() - start.getTime()
  }

  // Chuyển đổi sang phút hoặc giờ
  if (inMinutes) {
    return Math.round(diffMs / (1000 * 60))
  } else {
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100 // Làm tròn đến 2 chữ số thập phân
  }
}

/**
 * Kiểm tra xem người dùng có đến muộn không dựa trên ca làm việc
 *
 * @param {Date} checkInTime - Thời gian chấm công vào
 * @param {string} shiftStartTime - Thời gian bắt đầu ca (HH:MM)
 * @param {number} graceMinutes - Số phút ân hạn (mặc định: 5 phút)
 * @returns {Object} - Kết quả kiểm tra {isLate: boolean, lateMinutes: number}
 */
export const checkLateArrival = (checkInTime, shiftStartTime, graceMinutes = 5) => {
  if (!checkInTime || !shiftStartTime) {
    return { isLate: false, lateMinutes: 0 }
  }

  // Tạo thời gian bắt đầu ca với cùng ngày như thời gian chấm công
  const shiftStart = timeStringToDate(shiftStartTime, checkInTime)

  // Tính số phút đến muộn
  const lateMinutes = Math.max(0, Math.round((checkInTime - shiftStart) / (1000 * 60)))

  // Kiểm tra có đến muộn không (vượt quá thời gian ân hạn)
  const isLate = lateMinutes > graceMinutes

  return { isLate, lateMinutes }
}

/**
 * Kiểm tra xem người dùng có về sớm không dựa trên ca làm việc
 *
 * @param {Date} checkOutTime - Thời gian chấm công ra
 * @param {string} shiftEndTime - Thời gian kết thúc ca (HH:MM)
 * @param {Date} checkInTime - Thời gian chấm công vào (để xác định ngày làm việc)
 * @param {number} graceMinutes - Số phút ân hạn (mặc định: 5 phút)
 * @returns {Object} - Kết quả kiểm tra {isEarly: boolean, earlyMinutes: number}
 */
export const checkEarlyDeparture = (checkOutTime, shiftEndTime, checkInTime, graceMinutes = 5) => {
  if (!checkOutTime || !shiftEndTime || !checkInTime) {
    return { isEarly: false, earlyMinutes: 0 }
  }

  // Tạo thời gian kết thúc ca với cùng ngày như thời gian chấm công vào
  const baseShiftEnd = timeStringToDate(shiftEndTime, checkInTime)

  // Xử lý ca đêm: nếu thời gian kết thúc ca nhỏ hơn thời gian chấm công vào, thêm 1 ngày
  const shiftEnd =
    baseShiftEnd < checkInTime ? new Date(baseShiftEnd.setDate(baseShiftEnd.getDate() + 1)) : baseShiftEnd

  // Tính số phút về sớm
  const earlyMinutes = Math.max(0, Math.round((shiftEnd - checkOutTime) / (1000 * 60)))

  // Kiểm tra có về sớm không (vượt quá thời gian ân hạn)
  const isEarly = earlyMinutes > graceMinutes

  return { isEarly, earlyMinutes }
}

/**
 * Tính toán thời gian tăng ca dựa trên ca làm việc
 *
 * @param {Date} checkOutTime - Thời gian chấm công ra
 * @param {string} officeEndTime - Thời gian kết thúc giờ hành chính (HH:MM)
 * @param {Date} checkInTime - Thời gian chấm công vào (để xác định ngày làm việc)
 * @returns {Object} - Kết quả tính toán {hasOvertime: boolean, overtimeMinutes: number, overtimeHours: number}
 */
export const calculateOvertime = (checkOutTime, officeEndTime, checkInTime) => {
  if (!checkOutTime || !officeEndTime || !checkInTime) {
    return { hasOvertime: false, overtimeMinutes: 0, overtimeHours: 0 }
  }

  // Tạo thời gian kết thúc giờ hành chính với cùng ngày như thời gian chấm công vào
  const baseOfficeEnd = timeStringToDate(officeEndTime, checkInTime)

  // Xử lý ca đêm: nếu thời gian kết thúc giờ hành chính nhỏ hơn thời gian chấm công vào, thêm 1 ngày
  const officeEnd =
    baseOfficeEnd < checkInTime ? new Date(baseOfficeEnd.setDate(baseOfficeEnd.getDate() + 1)) : baseOfficeEnd

  // Tính số phút tăng ca
  const overtimeMinutes = Math.max(0, Math.round((checkOutTime - officeEnd) / (1000 * 60)))

  // Chuyển đổi sang giờ (làm tròn đến 1 chữ số thập phân)
  const overtimeHours = Math.round((overtimeMinutes / 60) * 10) / 10

  // Kiểm tra có tăng ca không (tối thiểu 30 phút)
  const hasOvertime = overtimeMinutes >= 30

  return { hasOvertime, overtimeMinutes, overtimeHours }
}

/**
 * Tính toán tổng thời gian làm việc dựa trên thời gian chấm công
 *
 * @param {Date} checkInTime - Thời gian chấm công vào
 * @param {Date} checkOutTime - Thời gian chấm công ra
 * @returns {Object} - Kết quả tính toán {totalMinutes: number, totalHours: number}
 */
export const calculateTotalWorkTime = (checkInTime, checkOutTime) => {
  if (!checkInTime || !checkOutTime) {
    return { totalMinutes: 0, totalHours: 0 }
  }

  // Tính khoảng thời gian làm việc
  const totalMinutes = calculateTimeDifference(checkInTime, checkOutTime, true)

  // Chuyển đổi sang giờ (làm tròn đến 1 chữ số thập phân)
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10

  return { totalMinutes, totalHours }
}

/**
 * Xác định trạng thái làm việc dựa trên thời gian chấm công và ca làm việc
 *
 * @param {Date} checkInTime - Thời gian chấm công vào
 * @param {Date} checkOutTime - Thời gian chấm công ra
 * @param {Object} shift - Thông tin ca làm việc
 * @returns {Object} - Trạng thái làm việc chi tiết
 */
export const determineWorkStatus = (checkInTime, checkOutTime, shift) => {
  if (!checkInTime || !checkOutTime || !shift) {
    return {
      status: "unknown",
      remarks: "Không đủ thông tin để xác định trạng thái",
      totalWorkTime: 0,
      overtime: 0,
      isLate: false,
      lateMinutes: 0,
      isEarly: false,
      earlyMinutes: 0,
    }
  }

  // Kiểm tra xem thời gian giữa check-in và check-out có quá ngắn không
  // Nếu dưới 5 phút, có thể người dùng đang bấm nút liên tục
  const timeBetweenActions = (checkOutTime - checkInTime) / (1000 * 60) // Thời gian tính bằng phút
  const isQuickButtonPress = timeBetweenActions < 5

  // Nếu người dùng bấm nút quá nhanh, coi như đủ công và sử dụng thời gian ca làm việc
  if (isQuickButtonPress) {
    // Tạo thời gian bắt đầu và kết thúc ca từ thông tin ca làm việc
    const today = new Date(checkInTime)
    today.setHours(0, 0, 0, 0) // Đặt về đầu ngày

    const shiftStartTime = new Date(today)
    const shiftEndTime = new Date(today)
    const officeEndTime = new Date(today)

    // Parse thời gian ca
    const [startHours, startMinutes] = shift.startTime.split(":").map(Number)
    const [endHours, endMinutes] = shift.endTime.split(":").map(Number)
    const [officeEndHours, officeEndMinutes] = shift.officeEndTime.split(":").map(Number)

    // Thiết lập giờ và phút
    shiftStartTime.setHours(startHours, startMinutes, 0, 0)
    shiftEndTime.setHours(endHours, endMinutes, 0, 0)
    officeEndTime.setHours(officeEndHours, officeEndMinutes, 0, 0)

    // Xử lý ca đêm
    if (shiftEndTime < shiftStartTime) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1)
    }

    if (officeEndTime < shiftStartTime) {
      officeEndTime.setDate(officeEndTime.getDate() + 1)
    }

    // Tính tổng thời gian làm việc (giờ)
    const workMs = shiftEndTime - shiftStartTime
    const totalHours = Math.round((workMs / (1000 * 60 * 60)) * 10) / 10

    // Tính thời gian tăng ca nếu có
    let overtimeHours = 0
    if (shiftEndTime > officeEndTime) {
      const overtimeMs = shiftEndTime - officeEndTime
      overtimeHours = Math.round((overtimeMs / (1000 * 60 * 60)) * 10) / 10
    }

    return {
      status: "Đủ công",
      remarks: "Đã hoàn thành đầy đủ công việc",
      totalWorkTime: totalHours,
      overtime: overtimeHours,
      isLate: false,
      lateMinutes: 0,
      isEarly: false,
      earlyMinutes: 0,
    }
  }

  // Kiểm tra đến muộn
  const { isLate, lateMinutes } = checkLateArrival(checkInTime, shift.startTime)

  // Kiểm tra về sớm
  const { isEarly, earlyMinutes } = checkEarlyDeparture(checkOutTime, shift.officeEndTime, checkInTime)

  // Tính thời gian tăng ca
  const { hasOvertime, overtimeHours } = calculateOvertime(checkOutTime, shift.officeEndTime, checkInTime)

  // Tính tổng thời gian làm việc
  const { totalHours } = calculateTotalWorkTime(checkInTime, checkOutTime)

  // Xác định trạng thái
  let status = "Đủ công"
  let remarks = "Chấm công đầy đủ và đúng giờ"

  if (isLate && isEarly) {
    status = "Vào muộn & Ra sớm"
    remarks = `Vào muộn ${lateMinutes} phút, ra sớm ${earlyMinutes} phút`
  } else if (isLate) {
    status = "Vào muộn"
    remarks = `Vào muộn ${lateMinutes} phút`
  } else if (isEarly) {
    status = "Ra sớm"
    remarks = `Ra sớm ${earlyMinutes} phút`
  }

  if (hasOvertime) {
    if (status === "Đủ công") {
      status = "OT"
      remarks = `Tăng ca ${overtimeHours} giờ`
    } else {
      status += " & OT"
      remarks += `, tăng ca ${overtimeHours} giờ`
    }
  }

  return {
    status,
    remarks,
    totalWorkTime: totalHours,
    overtime: overtimeHours,
    isLate,
    lateMinutes,
    isEarly,
    earlyMinutes,
  }
}

