"use client"

import { createContext, useState, useContext, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { format } from "date-fns"
import { saveWorkLog, updateDailyWorkStatus } from "../utils/database"
import { calculateWorkStatus } from "../utils/workStatusCalculator"
import { useShift } from "./ShiftContext"
import { cancelNotificationByType } from "../utils/notificationService"
import * as Notifications from "expo-notifications"

// Create context
const WorkStatusContext = createContext()

// Work status provider component
export function WorkStatusProvider({ children }) {
  const { currentShift } = useShift()
  const [workStatus, setWorkStatus] = useState({
    status: "idle", // idle, go_work, check_in, punch, check_out, complete
    goToWorkTime: null,
    checkInTime: null,
    punchTime: null,
    checkOutTime: null,
    completeTime: null,
    date: format(new Date(), "yyyy-MM-dd"),
  })

  // Load saved work status
  useEffect(() => {
    const loadWorkStatus = async () => {
      try {
        const today = format(new Date(), "yyyy-MM-dd")

        // Lấy logs của ngày hiện tại
        const logsJson = await AsyncStorage.getItem(`attendo_work_logs_${today}`)
        const logs = logsJson ? JSON.parse(logsJson) : []

        // Xác định trạng thái dựa trên logs
        let status = "idle"
        let goToWorkTime = null
        let checkInTime = null
        let punchTime = null
        let checkOutTime = null
        let completeTime = null

        for (const log of logs) {
          switch (log.type) {
            case "go_work":
              status = "go_work"
              goToWorkTime = log.timestamp
              break
            case "check_in":
              status = "check_in"
              checkInTime = log.timestamp
              break
            case "punch":
              status = "punch"
              punchTime = log.timestamp
              break
            case "check_out":
              status = "check_out"
              checkOutTime = log.timestamp
              break
            case "complete":
              status = "complete"
              completeTime = log.timestamp
              break
          }
        }

        setWorkStatus({
          status,
          goToWorkTime,
          checkInTime,
          punchTime,
          checkOutTime,
          completeTime,
          date: today,
        })
      } catch (error) {
        console.error("Failed to load work status:", error)
      }
    }

    loadWorkStatus()
  }, [])

  // Add a function to debug and fix notification issues
  const debugNotifications = async () => {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
      console.log(`[WorkStatusContext] Currently scheduled notifications: ${scheduledNotifications.length}`)

      // Log notification details for debugging
      scheduledNotifications.forEach((notification, index) => {
        console.log(`[WorkStatusContext] Notification ${index + 1}:`, {
          id: notification.identifier,
          title: notification.content.title,
          body: notification.content.body,
          triggerDate: notification.trigger.date,
          data: notification.content.data,
        })
      })

      // Check for duplicate notifications
      const notificationIds = {}
      const duplicates = []

      scheduledNotifications.forEach((notification) => {
        const title = notification.content.title
        if (notificationIds[title]) {
          duplicates.push(notification)
        } else {
          notificationIds[title] = notification
        }
      })

      // Cancel duplicate notifications
      if (duplicates.length > 0) {
        console.log(`[WorkStatusContext] Found ${duplicates.length} duplicate notifications, canceling...`)
        for (const notification of duplicates) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier)
        }
      }

      return {
        total: scheduledNotifications.length,
        duplicates: duplicates.length,
        remaining: scheduledNotifications.length - duplicates.length,
      }
    } catch (error) {
      console.error("[WorkStatusContext] Error debugging notifications:", error)
      return { error: error.message }
    }
  }

  // Add this to the WorkStatusProvider component
  useEffect(() => {
    // Debug notifications on startup
    const checkNotifications = async () => {
      try {
        const result = await debugNotifications()
        console.log("[WorkStatusContext] Notification check result:", result)
      } catch (error) {
        console.error("[WorkStatusContext] Error checking notifications:", error)
      }
    }

    checkNotifications()
  }, [])

  // Update work status
  const updateWorkStatus = async (action, timestamp) => {
    try {
      console.log(`[WorkStatusContext] Updating work status: ${action}`)
      const today = format(new Date(), "yyyy-MM-dd")
      let newStatus = { ...workStatus, date: today }

      // Lưu log vào database
      try {
        await saveWorkLog({
          type: action,
          timestamp: timestamp.toISOString(),
          shiftId: currentShift?.id,
        })
      } catch (dbError) {
        console.error("[WorkStatusContext] Failed to save work log to database:", dbError)
        // Continue execution even if database save fails
      }

      // Hủy thông báo tương ứng
      try {
        await cancelNotificationByType(action, today)
      } catch (notificationError) {
        console.error("[WorkStatusContext] Failed to cancel notification:", notificationError)
        // Continue execution even if notification cancellation fails
      }

      // Cập nhật trạng thái
      switch (action) {
        case "go_work":
          newStatus = {
            ...newStatus,
            status: "go_work",
            goToWorkTime: timestamp.toISOString(),
          }
          break
        case "check_in":
          newStatus = {
            ...newStatus,
            status: "check_in",
            checkInTime: timestamp.toISOString(),
          }
          break
        case "punch":
          newStatus = {
            ...newStatus,
            status: "punch",
            punchTime: timestamp.toISOString(),
          }
          break
        case "check_out":
          newStatus = {
            ...newStatus,
            status: "check_out",
            checkOutTime: timestamp.toISOString(),
          }
          break
        case "complete":
          newStatus = {
            ...newStatus,
            status: "complete",
            completeTime: timestamp.toISOString(),
          }
          break
      }

      setWorkStatus(newStatus)

      // Lấy tất cả logs của ngày hiện tại
      try {
        const logsJson = await AsyncStorage.getItem(`attendo_work_logs_${today}`)
        const logs = logsJson ? JSON.parse(logsJson) : []

        // Thêm log mới
        logs.push({
          type: action,
          timestamp: timestamp.toISOString(),
          shiftId: currentShift?.id,
        })

        // Lưu logs
        await AsyncStorage.setItem(`attendo_work_logs_${today}`, JSON.stringify(logs))

        // Tính toán trạng thái công nếu đã check-in và check-out hoặc đã hoàn tất
        if (action === "check_out" || action === "complete" || (action === "go_work" && currentShift?.onlyGoWorkMode)) {
          // Kiểm tra xem có phải chế độ chỉ có nút "Đi làm" không
          const userSettingsJson = await AsyncStorage.getItem("attendo_user_settings")
          const userSettings = userSettingsJson ? JSON.parse(userSettingsJson) : { onlyGoWorkMode: false }

          // Truyền thông tin chế độ nút vào ca làm việc
          const shiftWithButtonMode = {
            ...currentShift,
            onlyGoWorkMode: userSettings.onlyGoWorkMode,
          }

          // Tính toán trạng thái công
          const workStatusCalc = calculateWorkStatus(logs, shiftWithButtonMode)

          // Cập nhật vào database
          await updateDailyWorkStatus(today, workStatusCalc)
        }
      } catch (storageError) {
        console.error("[WorkStatusContext] Failed to update AsyncStorage:", storageError)
        // If we can't update AsyncStorage, at least the state is updated
      }
    } catch (error) {
      console.error("[WorkStatusContext] Failed to update work status:", error)
      throw error
    }
  }

  // Reset work status
  const resetWorkStatus = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd")

      // Xóa logs của ngày hiện tại
      await AsyncStorage.removeItem(`attendo_work_logs_${today}`)

      // Reset trạng thái
      const newStatus = {
        status: "idle",
        goToWorkTime: null,
        checkInTime: null,
        punchTime: null,
        checkOutTime: null,
        completeTime: null,
        date: today,
      }

      setWorkStatus(newStatus)

      // Xóa trạng thái công của ngày hiện tại
      await AsyncStorage.removeItem(`attendo_daily_work_status_${today}`)
    } catch (error) {
      console.error("Failed to reset work status:", error)
      throw error
    }
  }

  return (
    <WorkStatusContext.Provider
      value={{
        workStatus,
        updateWorkStatus,
        resetWorkStatus,
      }}
    >
      {children}
    </WorkStatusContext.Provider>
  )
}

// Custom hook for using work status
export function useWorkStatus() {
  const context = useContext(WorkStatusContext)
  if (!context) {
    throw new Error("useWorkStatus must be used within a WorkStatusProvider")
  }
  return context
}

