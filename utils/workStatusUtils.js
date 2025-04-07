import { getActiveShift, getAttendanceLogs, updateDailyWorkStatus, getDailyWorkStatus } from "./database"
import { determineWorkStatus, calculateTotalWorkTime, isNightShift } from "./shiftTimeUtils"

// Calculate work status based on attendance logs
export const calculateWorkStatus = async (date) => {
  try {
    // Get active shift
    const activeShift = await getActiveShift()
    if (!activeShift) {
      console.log("No active shift found, cannot calculate work status")
      return null
    }

    // Get attendance logs for the date
    const logs = await getAttendanceLogs(date)
    if (!logs || logs.length === 0) {
      console.log("No attendance logs found for the date")
      return {
        status: "Chưa cập nhật",
        totalWorkTime: 0,
        overtime: 0,
        remarks: "Không có dữ liệu chấm công",
      }
    }

    // Find relevant logs
    const goWorkLog = logs.find((log) => log.type === "go_work")
    const checkInLog = logs.find((log) => log.type === "check_in")
    const checkOutLog = logs.find((log) => log.type === "check_out")
    const completeLog = logs.find((log) => log.type === "complete")

    // Initialize status
    let status = "Đang xử lý"
    let totalWorkTime = 0
    let overtime = 0
    let remarks = ""

    // Check if the user has completed all steps
    const hasCompleted = completeLog !== undefined

    // If the user has completed all steps, consider it as full attendance
    if (hasCompleted) {
      // Use shift times instead of actual check-in/check-out times
      // This ensures that quick button presses don't result in incorrect calculations

      // Create date objects for shift start and end times
      const today = new Date(date)
      const shiftStartTime = new Date(today)
      const shiftEndTime = new Date(today)
      const officeEndTime = new Date(today)

      // Parse shift times
      const [startHours, startMinutes] = activeShift.startTime.split(":").map(Number)
      const [endHours, endMinutes] = activeShift.endTime.split(":").map(Number)
      const [officeEndHours, officeEndMinutes] = activeShift.officeEndTime.split(":").map(Number)

      // Set hours and minutes
      shiftStartTime.setHours(startHours, startMinutes, 0, 0)
      shiftEndTime.setHours(endHours, endMinutes, 0, 0)
      officeEndTime.setHours(officeEndHours, officeEndMinutes, 0, 0)

      // Handle night shift (if end time is earlier than start time, add a day)
      if (shiftEndTime < shiftStartTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1)
      }

      if (officeEndTime < shiftStartTime) {
        officeEndTime.setDate(officeEndTime.getDate() + 1)
      }

      // Calculate total work time (in hours)
      const workMs = shiftEndTime - shiftStartTime
      totalWorkTime = Math.round((workMs / (1000 * 60 * 60)) * 10) / 10 // Round to 1 decimal place

      // Calculate overtime if applicable
      if (shiftEndTime > officeEndTime) {
        const overtimeMs = shiftEndTime - officeEndTime
        overtime = Math.round((overtimeMs / (1000 * 60 * 60)) * 10) / 10 // Round to 1 decimal place
      }

      // Set status as full attendance
      status = "Đủ công"
      remarks = "Đã hoàn thành đầy đủ công việc"

      return {
        status,
        totalWorkTime,
        overtime,
        remarks,
      }
    }

    // If we have check-in and check-out logs but not completed, calculate actual work status
    if (checkInLog && checkOutLog) {
      const checkInTime = new Date(checkInLog.timestamp)
      const checkOutTime = new Date(checkOutLog.timestamp)

      // Determine if this is a night shift
      const isNightShiftWork = isNightShift(activeShift.startTime, activeShift.endTime)

      // For night shifts, we need to check if check-out is on the next day
      // If check-out time is earlier than check-in time and it's a night shift,
      // we assume check-out is on the next day
      let adjustedCheckOutTime = checkOutTime
      if (checkOutTime < checkInTime && isNightShiftWork) {
        adjustedCheckOutTime = new Date(checkOutTime)
        adjustedCheckOutTime.setDate(adjustedCheckOutTime.getDate() + 1)
      }

      // Use the shiftTimeUtils to determine work status
      const workStatusDetails = determineWorkStatus(checkInTime, adjustedCheckOutTime, activeShift)

      status = workStatusDetails.status
      totalWorkTime = workStatusDetails.totalWorkTime
      overtime = workStatusDetails.overtime
      remarks = workStatusDetails.remarks
    } else if (checkInLog && !checkOutLog) {
      // Only checked in, not checked out
      status = "Chưa hoàn thành"
      remarks = "Đã chấm công vào nhưng chưa chấm công ra"

      // Calculate work time so far
      const checkInTime = new Date(checkInLog.timestamp)
      const now = new Date()
      const { totalHours } = calculateTotalWorkTime(checkInTime, now)
      totalWorkTime = totalHours
    } else if (goWorkLog && !checkInLog) {
      // Only marked as going to work
      status = "Đang đi làm"
      remarks = "Đã bấm nút đi làm nhưng chưa chấm công vào"
      totalWorkTime = 0
    }

    // Create work status object
    const workStatus = {
      status,
      totalWorkTime,
      overtime,
      remarks,
    }

    // Update work status in database
    await updateDailyWorkStatus(date, workStatus)

    return workStatus
  } catch (error) {
    console.error("Error calculating work status:", error)
    return null
  }
}

// Check if a reset is needed
export const checkIfResetNeeded = async () => {
  try {
    // Get active shift
    const activeShift = await getActiveShift()
    if (!activeShift) {
      return false
    }

    // Get today's date
    const today = new Date().toISOString().split("T")[0]

    // Parse shift start time
    const [hours, minutes] = activeShift.startTime.split(":").map(Number)

    // Create Date object for shift start time
    const shiftStartTime = new Date(today)
    shiftStartTime.setHours(hours, minutes, 0, 0)

    // Calculate reset time (6 hours before shift start)
    const resetTime = new Date(shiftStartTime)
    resetTime.setHours(resetTime.getHours() - 6)

    // Get current time
    const now = new Date()

    // If current time is within the reset window (between resetTime and shiftStartTime)
    if (now >= resetTime && now < shiftStartTime) {
      // Check if we've already reset today
      const workStatus = await getDailyWorkStatus(today)

      // If no work status or status is "Chưa cập nhật", we need to reset
      if (!workStatus || workStatus.status === "Chưa cập nhật") {
        return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking if reset is needed:", error)
    return false
  }
}

// Update work status based on a new attendance log
export const updateWorkStatusForNewLog = async (date, logType) => {
  try {
    // Get current work status
    const workStatus = (await getDailyWorkStatus(date)) || {
      status: "Chưa cập nhật",
      totalWorkTime: 0,
      overtime: 0,
      remarks: "",
    }

    // Get active shift
    const activeShift = await getActiveShift()

    // Get attendance logs
    const logs = await getAttendanceLogs(date)

    // Update status based on log type
    switch (logType) {
      case "go_work":
        workStatus.status = "Đang đi làm"
        workStatus.remarks = "Đã bấm nút đi làm"
        break
      case "check_in":
        workStatus.status = "Đang làm việc"
        workStatus.remarks = "Đã chấm công vào"
        break
      case "check_out": {
        // When checking out, calculate the actual work time
        const checkInLog = logs.find((log) => log.type === "check_in")
        const checkOutLog = logs.find((log) => log.type === "check_out")

        if (checkInLog && checkOutLog && activeShift) {
          const checkInTime = new Date(checkInLog.timestamp)
          const checkOutTime = new Date(checkOutLog.timestamp)

          // Handle night shift
          const isNightShiftWork = isNightShift(activeShift.startTime, activeShift.endTime)
          let adjustedCheckOutTime = checkOutTime

          if (checkOutTime < checkInTime && isNightShiftWork) {
            adjustedCheckOutTime = new Date(checkOutTime)
            adjustedCheckOutTime.setDate(adjustedCheckOutTime.getDate() + 1)
          }

          // Calculate work time
          const { totalHours } = calculateTotalWorkTime(checkInTime, adjustedCheckOutTime)
          workStatus.totalWorkTime = totalHours

          // Calculate overtime if applicable
          if (activeShift) {
            const [officeEndHours, officeEndMinutes] = activeShift.officeEndTime.split(":").map(Number)
            const officeEndTime = new Date(date)
            officeEndTime.setHours(officeEndHours, officeEndMinutes, 0, 0)

            // Handle night shift for office end time
            if (officeEndTime < checkInTime && isNightShiftWork) {
              officeEndTime.setDate(officeEndTime.getDate() + 1)
            }

            // If check-out time is after office end time, calculate overtime
            if (adjustedCheckOutTime > officeEndTime) {
              const overtimeMs = adjustedCheckOutTime - officeEndTime
              const overtimeHours = Math.round((overtimeMs / (1000 * 60 * 60)) * 10) / 10
              workStatus.overtime = overtimeHours

              if (overtimeHours > 0) {
                workStatus.status = "OT"
                workStatus.remarks = `Đã chấm công ra với ${overtimeHours} giờ tăng ca`
              } else {
                workStatus.status = "Đã check-out"
                workStatus.remarks = "Đã chấm công ra"
              }
            } else {
              workStatus.status = "Đã check-out"
              workStatus.remarks = "Đã chấm công ra"
            }
          } else {
            workStatus.status = "Đã check-out"
            workStatus.remarks = "Đã chấm công ra"
          }
        } else {
          workStatus.status = "Đã check-out"
          workStatus.remarks = "Đã chấm công ra"
        }
        break
      }
      case "complete": {
        // Calculate full work status with special handling for completed status
        const fullWorkStatus = await calculateWorkStatus(date)
        if (fullWorkStatus) {
          return fullWorkStatus
        } else {
          workStatus.status = "Đủ công"
          workStatus.remarks = "Đã hoàn thành đầy đủ công việc"
        }
        break
      }
    }

    // Update work status in database
    await updateDailyWorkStatus(date, workStatus)

    return workStatus
  } catch (error) {
    console.error("Error updating work status for new log:", error)
    return null
  }
}

