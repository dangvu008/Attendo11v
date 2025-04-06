"use client"

import { useContext, useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { getWeekDays, formatDate } from "../utils/dateUtils"
import { getStatusIcon, formatStatusDetails, getStatusOptions } from "../utils/statusUtils"
import { getWeeklyStatus, setManualStatus } from "../utils/database"

export default function WeeklyStatusGrid({ darkMode }) {
  const { currentShift, t, weeklyStatusRefreshTrigger } = useContext(AppContext)
  const [weekDays, setWeekDays] = useState(getWeekDays())
  const [weeklyStatus, setWeeklyStatus] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)

  // Load weekly status data
  const loadWeeklyStatus = useCallback(async () => {
    const status = await getWeeklyStatus(weekDays)
    setWeeklyStatus(status)
  }, [weekDays])

  // Load weekly status
  useEffect(() => {
    // Sử dụng startWithMonday=true để bắt đầu tuần từ Thứ Hai
    setWeekDays(getWeekDays(true))

    loadWeeklyStatus()

    // Refresh status every minute
    const intervalId = setInterval(() => {
      loadWeeklyStatus()
    }, 60000)

    return () => clearInterval(intervalId)
  }, [loadWeeklyStatus, weeklyStatusRefreshTrigger])

  // Get day name
  const getDayName = (date) => {
    const dayIndex = date.getDay() // 0 = Sunday, 1 = Monday, ...
    const dayKeys = [
      "day_short_sun",
      "day_short_mon",
      "day_short_tue",
      "day_short_wed",
      "day_short_thu",
      "day_short_fri",
      "day_short_sat",
    ]

    return t(dayKeys[dayIndex]) || date.toLocaleString("vi-VN", { weekday: "short" })
  }

  // Handle day press to show details
  const handleDayPress = (date) => {
    setSelectedDate(date)
    setDetailsModalVisible(true)
  }

  // Handle long press to update status
  const handleDayLongPress = (date) => {
    // Only allow manual updates for past and current days
    const today = new Date()
    if (date > today) return

    setSelectedDate(date)
    setStatusModalVisible(true)
  }

  // Handle status selection
  const handleStatusSelect = async (status) => {
    if (!selectedDate) return

    const dateString = formatDate(selectedDate)
    await setManualStatus(dateString, status)

    // Reload weekly status
    await loadWeeklyStatus()

    // Close modal
    setStatusModalVisible(false)
  }

  // Render status details modal
  const renderDetailsModal = () => {
    if (!selectedDate) return null

    const dateString = formatDate(selectedDate)
    const dayStatus = weeklyStatus[dateString] || { status: "not_updated", logs: [] }
    const { status, logs } = dayStatus

    const { icon, iconType, label, color, description } = getStatusIcon(status)
    const details = formatStatusDetails(logs, status, currentShift)

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={detailsModalVisible}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDetailsModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: darkMode ? "#fff" : "#000" }]}>
                {selectedDate.toLocaleDateString("vi-VN")} - {getDayName(selectedDate)}
              </Text>
              <View style={[styles.statusIconContainer, { backgroundColor: color }]}>
                <Ionicons name={icon} size={20} color="#fff" />
              </View>
            </View>

            <View style={styles.detailsContainer}>
              <Text style={[styles.statusLabel, { color: color }]}>{label}</Text>
              <Text style={[styles.detailsText, { color: darkMode ? "#bbb" : "#555" }]}>{details}</Text>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
              onPress={() => setDetailsModalVisible(false)}
            >
              <Ionicons name="close-outline" size={20} color={darkMode ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    )
  }

  // Cập nhật tooltip chọn trạng thái làm việc ở lưới trạng thái tuần
  // Render status selection modal
  const renderStatusModal = () => {
    if (!selectedDate) return null

    const statusOptions = getStatusOptions()

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStatusModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
            <Text style={[styles.modalTitle, { color: darkMode ? "#fff" : "#000" }]}>
              {t("update_status") || "Update Status"}
            </Text>

            <View style={styles.statusOptionsContainer}>
              {statusOptions.map((option) => {
                const { icon, color } = getStatusIcon(option.value)

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.statusOption, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
                    onPress={() => handleStatusSelect(option.value)}
                  >
                    <View style={[styles.optionIconContainer, { backgroundColor: color }]}>
                      <Ionicons name={icon} size={18} color="#fff" />
                    </View>
                    <Text style={[styles.statusText, { color: darkMode ? "#fff" : "#000" }]}>{option.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
              onPress={() => setStatusModalVisible(false)}
            >
              <Ionicons name="close-outline" size={20} color={darkMode ? "#fff" : "#000"} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
      <View style={styles.headerRow}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.dayHeader}>
            <Text style={[styles.dayName, { color: darkMode ? "#fff" : "#000" }]}>{getDayName(day)}</Text>
            <Text style={[styles.dayNumber, { color: darkMode ? "#bbb" : "#555" }]}>{day.getDate()}</Text>
          </View>
        ))}
      </View>

      <View style={styles.statusRow}>
        {weekDays.map((day, index) => {
          const dateString = formatDate(day)
          const dayStatus = weeklyStatus[dateString] || { status: "not_updated" }
          const isToday = day.toDateString() === new Date().toDateString()
          const isFuture = day > new Date()

          // Get status icon and color
          const { icon, color } = getStatusIcon(isFuture ? "not_updated" : dayStatus.status)

          return (
            <TouchableOpacity
              key={index}
              style={[styles.statusCell, isToday && styles.todayCell]}
              onPress={() => handleDayPress(day)}
              onLongPress={() => handleDayLongPress(day)}
              delayLongPress={500}
            >
              {isFuture ? (
                <Text style={[styles.futureText, { color: darkMode ? "#666" : "#999" }]}>--</Text>
              ) : (
                <View style={[styles.iconContainer, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <View style={styles.timeRow}>
        {weekDays.map((day, index) => {
          const shiftTime = getShiftTime(day)

          if (!shiftTime) {
            return (
              <View key={index} style={styles.timeCell}>
                <Text style={[styles.noShiftText, { color: darkMode ? "#666" : "#999" }]}>-</Text>
              </View>
            )
          }

          return (
            <View key={index} style={styles.timeCell}>
              <Text style={[styles.timeText, { color: darkMode ? "#bbb" : "#555" }]}>{shiftTime.start}</Text>
              <Text style={[styles.timeText, { color: darkMode ? "#bbb" : "#555" }]}>-</Text>
              <Text style={[styles.timeText, { color: darkMode ? "#bbb" : "#555" }]}>{shiftTime.end}</Text>
            </View>
          )
        })}
      </View>

      {/* Status Details Modal */}
      {renderDetailsModal()}

      {/* Status Selection Modal */}
      {renderStatusModal()}
    </View>
  )

  // Get shift time for the day
  function getShiftTime(date) {
    if (!currentShift) return null

    const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ...

    // Check if daysApplied exists and is an array
    if (!currentShift.daysApplied || !Array.isArray(currentShift.daysApplied)) {
      return null
    }

    // Check if the day is within the array bounds
    if (dayOfWeek < 0 || dayOfWeek >= currentShift.daysApplied.length) {
      return null
    }

    const isApplied = currentShift.daysApplied[dayOfWeek]

    if (!isApplied) return null

    // Make sure startTime and endTime exist
    if (!currentShift.startTime || !currentShift.endTime) {
      return null
    }

    return {
      start: currentShift.startTime,
      end: currentShift.endTime,
    }
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
  },
  dayName: {
    fontSize: 14,
    fontWeight: "500",
  },
  dayNumber: {
    fontSize: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  statusCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  todayCell: {
    backgroundColor: "rgba(106, 90, 205, 0.1)",
    borderRadius: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  futureText: {
    fontSize: 16,
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.05)",
  },
  timeCell: {
    flex: 1,
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
  },
  noShiftText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 8,
  },
  statusOptionsContainer: {
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusText: {
    fontSize: 16,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
})

