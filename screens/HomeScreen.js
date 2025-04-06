"use client"

import { useContext, useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { formatTime, getDayName, getWeekDays } from "../utils/dateUtils"
import AttendanceActions from "../components/AttendanceActions"
import WeeklyStatusGrid from "../components/WeeklyStatusGrid"
import NotesList from "../components/NotesList"

export default function HomeScreen({ navigation }) {
  const { darkMode, currentShift, workStatus, t } = useContext(AppContext)

  const [currentTime, setCurrentTime] = useState(new Date())
  const [weekDays, setWeekDays] = useState(getWeekDays())

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  // Format current time as HH:MM
  const formattedTime = currentTime
    ? currentTime.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "--:--"

  // Format current date
  const formattedDate = currentTime
    ? `${getDayName(currentTime.getDay(), t)}, ${currentTime.getDate()}/${currentTime.getMonth() + 1}`
    : ""

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.appTitle, { color: darkMode ? "#fff" : "#000" }]}>Attendo11</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.timeContainer}>
          <Text style={[styles.currentTime, { color: darkMode ? "#fff" : "#000" }]}>{formattedTime}</Text>
          <Text style={[styles.currentDate, { color: darkMode ? "#bbb" : "#555" }]}>{formattedDate}</Text>
        </View>

        {currentShift && (
          <View style={[styles.shiftCard, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
            <View style={styles.shiftHeader}>
              <Ionicons name="calendar-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
              <Text style={[styles.shiftName, { color: darkMode ? "#fff" : "#000" }]}>{currentShift.name}</Text>
            </View>
            <Text style={[styles.shiftTime, { color: darkMode ? "#bbb" : "#555" }]}>
              {currentShift.startTime ? formatTime(currentShift.startTime) : "--:--"} →{" "}
              {currentShift.endTime ? formatTime(currentShift.endTime) : "--:--"}
            </Text>
          </View>
        )}

        {/* Work Status Card */}
        <View style={[styles.statusCard, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.statusTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("work_status")}</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: darkMode ? "#bbb" : "#555" }]}>{t("status")}:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color:
                    workStatus.status === "Đủ công"
                      ? "#4caf50"
                      : workStatus.status === "Vào muộn" || workStatus.status === "Ra sớm"
                        ? "#ff9800"
                        : workStatus.status === "OT"
                          ? "#2196f3"
                          : darkMode
                            ? "#fff"
                            : "#000",
                },
              ]}
            >
              {workStatus.status}
            </Text>
          </View>

          {workStatus.totalWorkTime > 0 && (
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: darkMode ? "#bbb" : "#555" }]}>{t("work_time")}:</Text>
              <Text style={[styles.statusValue, { color: darkMode ? "#fff" : "#000" }]}>
                {workStatus.totalWorkTime} {t("hours")}
              </Text>
            </View>
          )}

          {workStatus.overtime > 0 && (
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: darkMode ? "#bbb" : "#555" }]}>{t("overtime")}:</Text>
              <Text style={[styles.statusValue, { color: "#2196f3" }]}>
                {workStatus.overtime} {t("hours")}
              </Text>
            </View>
          )}

          {workStatus.remarks && (
            <Text style={[styles.statusRemarks, { color: darkMode ? "#bbb" : "#555" }]}>{workStatus.remarks}</Text>
          )}
        </View>

        {/* Attendance Actions */}
        <AttendanceActions darkMode={darkMode} />

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("weekly_status")}</Text>
          <WeeklyStatusGrid darkMode={darkMode} />
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.notesHeader}>
            <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("notes")}</Text>
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => navigation.navigate("AddNote")}
              accessibilityLabel={t("add_note") || "Add Note"}
            >
              <Ionicons name="add-circle-outline" size={24} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
          </View>
          <NotesList darkMode={darkMode} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
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
  appTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  timeContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: "bold",
  },
  currentDate: {
    fontSize: 16,
    marginTop: 4,
  },
  shiftCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  shiftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  shiftName: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  shiftTime: {
    fontSize: 16,
    marginTop: 8,
  },
  statusCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  statusRemarks: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  sectionContainer: {
    marginTop: 24,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  notesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addNoteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
})

