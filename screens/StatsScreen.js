"use client"

import { useContext, useState, useEffect, useCallback } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { getMonthDays, formatDate } from "../utils/dateUtils"
import { calculateWorkHours } from "../utils/shiftValidation"

export default function StatsScreen({ navigation }) {
  const { darkMode, t, currentShift } = useContext(AppContext)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [monthlyStats, setMonthlyStats] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // Get days for the current month
  const monthDays = getMonthDays(currentMonth)

  // Format month name
  const monthName = currentMonth.toLocaleString("vi-VN", { month: "long", year: "numeric" })

  // Load monthly statistics
  const loadMonthlyStats = useCallback(async () => {
    try {
      setIsLoading(true)

      // Import necessary functions from database.js
      const { getAttendanceLogs, getDailyWorkStatus } = require("../utils/database")

      const stats = {}

      // Process each day in the month
      for (const day of monthDays) {
        const dateString = formatDate(day)

        // Get attendance logs for the day
        const logs = await getAttendanceLogs(dateString)

        // Get work status for the day
        const workStatus = await getDailyWorkStatus(dateString)

        // Find check-in and check-out logs
        const checkInLog = logs.find((log) => log.type === "check_in")
        const checkOutLog = logs.find((log) => log.type === "check_out")

        // Calculate check-in and check-out times
        const checkInTime = checkInLog ? new Date(checkInLog.timestamp) : null
        const checkOutTime = checkOutLog ? new Date(checkOutLog.timestamp) : null

        // Format times for display
        const checkInTimeFormatted = checkInTime
          ? checkInTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })
          : "--:--"

        const checkOutTimeFormatted = checkOutTime
          ? checkOutTime.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })
          : "--:--"

        // Calculate work hours
        let regularHours = 0
        let ot150 = 0
        let ot200 = 0
        const ot300 = 0

        if (checkInTime && checkOutTime && currentShift) {
          // Use the shiftValidation utility to calculate work hours
          const { regularHours: regHrs, overtimeHours } = calculateWorkHours(checkInTime, checkOutTime, currentShift)

          regularHours = regHrs

          // Distribute overtime hours based on day type
          // For simplicity, we'll put all overtime in OT150 for weekdays and OT200 for weekends
          const dayOfWeek = day.getDay() // 0 = Sunday, 6 = Saturday

          if (dayOfWeek === 0) {
            // Sunday
            ot200 = overtimeHours
          } else if (dayOfWeek === 6) {
            // Saturday
            ot150 = overtimeHours
          } else {
            // Weekdays
            ot150 = overtimeHours
          }

          // For special holidays, we would set ot300 (not implemented here)
        } else if (workStatus) {
          // If we have work status but not complete logs, use the stored values
          regularHours = workStatus.totalWorkTime || 0
          ot150 = workStatus.overtime || 0
        }

        // Store the statistics for this day
        stats[dateString] = {
          checkInTime: checkInTimeFormatted,
          checkOutTime: checkOutTimeFormatted,
          regularHours: regularHours.toFixed(1),
          ot150: ot150.toFixed(1),
          ot200: ot200.toFixed(1),
          ot300: ot300.toFixed(1),
          hasData: checkInTime !== null || checkOutTime !== null || (workStatus && workStatus.status !== "not_updated"),
        }
      }

      setMonthlyStats(stats)
      setIsLoading(false)
    } catch (error) {
      console.error("Error loading monthly stats:", error)
      setIsLoading(false)
    }
  }, [currentShift, monthDays])

  useEffect(() => {
    loadMonthlyStats()
  }, [currentMonth, loadMonthlyStats])

  // Go to previous month
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() - 1)
    setCurrentMonth(newMonth)
  }

  // Go to next month
  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + 1)
    setCurrentMonth(newMonth)
  }

  // Get day name
  const getDayName = (date) => {
    return date.toLocaleString("vi-VN", { weekday: "short" })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("monthly_stats")}</Text>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Ionicons name="chevron-back" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={[styles.monthName, { color: darkMode ? "#fff" : "#000" }]}>{monthName}</Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6a5acd" />
          <Text style={[styles.loadingText, { color: darkMode ? "#fff" : "#000" }]}>
            {t("loading_stats") || "Loading statistics..."}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          <View style={[styles.tableContainer, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.dateCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("date")}
              </Text>
              <Text style={[styles.headerCell, styles.dayCell, { color: darkMode ? "#fff" : "#000" }]}>{t("day")}</Text>
              <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("check_in")}
              </Text>
              <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("check_out")}
              </Text>
              <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("regular_hours")}
              </Text>
              <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("ot_150")}
              </Text>
              <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("ot_200")}
              </Text>
              <Text style={[styles.headerCell, styles.timeCell, { color: darkMode ? "#fff" : "#000" }]}>
                {t("ot_300")}
              </Text>
            </View>

            {monthDays.map((day) => {
              const dateString = formatDate(day)
              const dayStats = monthlyStats[dateString] || {
                checkInTime: "--:--",
                checkOutTime: "--:--",
                regularHours: "-",
                ot150: "-",
                ot200: "-",
                ot300: "-",
                hasData: false,
              }

              const isToday = day.toDateString() === new Date().toDateString()
              const isFuture = day > new Date()

              return (
                <View
                  key={day.toISOString()}
                  style={[
                    styles.tableRow,
                    isToday && styles.todayRow,
                    { borderBottomColor: darkMode ? "#333" : "#eee" },
                  ]}
                >
                  <Text style={[styles.cell, styles.dateCell, { color: darkMode ? "#fff" : "#000" }]}>
                    {day.getDate()}/{day.getMonth() + 1}/{day.getFullYear()}
                  </Text>
                  <Text style={[styles.cell, styles.dayCell, { color: darkMode ? "#fff" : "#000" }]}>
                    {getDayName(day)}
                  </Text>
                  <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                    {dayStats.checkInTime}
                  </Text>
                  <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                    {dayStats.checkOutTime}
                  </Text>
                  <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                    {isFuture ? "-" : dayStats.hasData ? dayStats.regularHours : "-"}
                  </Text>
                  <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                    {isFuture ? "-" : dayStats.hasData ? dayStats.ot150 : "-"}
                  </Text>
                  <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                    {isFuture ? "-" : dayStats.hasData ? dayStats.ot200 : "-"}
                  </Text>
                  <Text style={[styles.cell, styles.timeCell, { color: darkMode ? "#bbb" : "#555" }]}>
                    {isFuture ? "-" : dayStats.hasData ? dayStats.ot300 : "-"}
                  </Text>
                </View>
              )
            })}
          </View>

          {/* Monthly Summary Section */}
          <View style={[styles.summaryContainer, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
            <Text style={[styles.summaryTitle, { color: darkMode ? "#fff" : "#000" }]}>
              {t("monthly_summary") || "Monthly Summary"}
            </Text>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("total_regular_hours") || "Total Regular Hours"}:
              </Text>
              <Text style={[styles.summaryValue, { color: darkMode ? "#fff" : "#000" }]}>
                {calculateTotalHours(monthlyStats, "regularHours")}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("total_ot_150") || "Total OT 150%"}:
              </Text>
              <Text style={[styles.summaryValue, { color: darkMode ? "#fff" : "#000" }]}>
                {calculateTotalHours(monthlyStats, "ot150")}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("total_ot_200") || "Total OT 200%"}:
              </Text>
              <Text style={[styles.summaryValue, { color: darkMode ? "#fff" : "#000" }]}>
                {calculateTotalHours(monthlyStats, "ot200")}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("total_ot_300") || "Total OT 300%"}:
              </Text>
              <Text style={[styles.summaryValue, { color: darkMode ? "#fff" : "#000" }]}>
                {calculateTotalHours(monthlyStats, "ot300")}
              </Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.summaryLabel, styles.totalLabel, { color: darkMode ? "#fff" : "#000" }]}>
                {t("grand_total") || "Grand Total"}:
              </Text>
              <Text style={[styles.summaryValue, styles.totalValue, { color: darkMode ? "#6a5acd" : "#6a5acd" }]}>
                {calculateGrandTotal(monthlyStats)}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )

  // Helper function to calculate total hours for a specific type
  function calculateTotalHours(stats, type) {
    let total = 0

    Object.values(stats).forEach((dayStat) => {
      if (dayStat.hasData && dayStat[type] !== "-") {
        total += Number.parseFloat(dayStat[type])
      }
    })

    return total.toFixed(1)
  }

  // Helper function to calculate grand total of all hours
  function calculateGrandTotal(stats) {
    let total = 0

    Object.values(stats).forEach((dayStat) => {
      if (dayStat.hasData) {
        if (dayStat.regularHours !== "-") total += Number.parseFloat(dayStat.regularHours)
        if (dayStat.ot150 !== "-") total += Number.parseFloat(dayStat.ot150)
        if (dayStat.ot200 !== "-") total += Number.parseFloat(dayStat.ot200)
        if (dayStat.ot300 !== "-") total += Number.parseFloat(dayStat.ot300)
      }
    })

    return total.toFixed(1)
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  monthName: {
    fontSize: 16,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  tableContainer: {
    margin: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingVertical: 12,
  },
  headerCell: {
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  cell: {
    fontSize: 14,
    textAlign: "center",
  },
  dateCell: {
    flex: 1.5,
  },
  dayCell: {
    flex: 1,
  },
  timeCell: {
    flex: 1,
  },
  todayRow: {
    backgroundColor: "rgba(106, 90, 205, 0.1)",
  },
  summaryContainer: {
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(106, 90, 205, 0.3)",
  },
  totalLabel: {
    fontWeight: "bold",
  },
  totalValue: {
    fontWeight: "bold",
    fontSize: 18,
  },
})

