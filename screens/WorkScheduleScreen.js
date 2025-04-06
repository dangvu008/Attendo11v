"use client"

import { useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import ShiftItem from "../components/ShiftItem"

/**
 * WorkScheduleScreen Component
 *
 * This screen displays and manages work shifts, allowing users to apply, edit, and delete shifts.
 * It includes confirmation dialogs for actions to prevent accidental data loss.
 *
 * @param {Object} navigation - React Navigation object for screen navigation
 */
export default function WorkScheduleScreen({ navigation }) {
  const { darkMode, shifts, currentShift, setCurrentShift, t, setShifts, deleteShift } = useContext(AppContext)

  // Apply shift
  const handleApplyShift = (shift) => {
    setCurrentShift(shift.id)
      .then((success) => {
        if (!success) {
          Alert.alert(
            t("error") || "Error",
            t("error_applying_shift") || "There was an error applying the shift. Please try again.",
          )
        }
      })
      .catch((error) => {
        console.error("Error applying shift:", error)
        Alert.alert(t("error") || "Error", t("unexpected_error") || "An unexpected error occurred. Please try again.")
      })
  }

  // Edit shift
  const handleEditShift = (shift) => {
    navigation.navigate("AddShift", { shift, isEditing: true })
  }

  // Delete shift
  const handleDeleteShift = (shiftId) => {
    deleteShift(shiftId)
      .then((success) => {
        if (!success) {
          Alert.alert(
            t("error") || "Error",
            t("error_deleting_shift") || "There was an error deleting the shift. Please try again.",
          )
        }
      })
      .catch((error) => {
        console.error("Error deleting shift:", error)
        Alert.alert(t("error") || "Error", t("unexpected_error") || "An unexpected error occurred. Please try again.")
      })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("work_shifts")}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("work_shifts")}</Text>
            <Text style={[styles.sectionSubtitle, { color: darkMode ? "#bbb" : "#777" }]}>
              {t("manage_work_shifts")}
            </Text>
          </View>

          <View style={styles.shiftsContainer}>
            {shifts.map((shift) => (
              <ShiftItem
                key={shift.id}
                shift={shift}
                isActive={currentShift && currentShift.id === shift.id}
                onApply={() => handleApplyShift(shift)}
                onEdit={() => handleEditShift(shift)}
                onDelete={() => handleDeleteShift(shift.id)}
                darkMode={darkMode}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
            onPress={() => navigation.navigate("AddShift")}
            accessibilityLabel={t("add_work_shift") || "Add Work Shift"}
          >
            <Ionicons name="add-circle-outline" size={24} color={darkMode ? "#6a5acd" : "#6a5acd"} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("current_shift")}</Text>
          </View>

          {currentShift ? (
            <View style={styles.currentShiftContainer}>
              <View style={styles.shiftDetails}>
                <Text style={[styles.shiftName, { color: darkMode ? "#fff" : "#000" }]}>{currentShift.name}</Text>
                <Text style={[styles.shiftTime, { color: darkMode ? "#bbb" : "#777" }]}>
                  {currentShift.startTime} - {currentShift.endTime}
                </Text>
              </View>

              <View style={styles.shiftTimes}>
                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: darkMode ? "#bbb" : "#777" }]}>{t("departure_time")}</Text>
                  <Text style={[styles.timeValue, { color: darkMode ? "#fff" : "#000" }]}>
                    {currentShift.departureTime}
                  </Text>
                </View>

                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: darkMode ? "#bbb" : "#777" }]}>{t("start_time")}</Text>
                  <Text style={[styles.timeValue, { color: darkMode ? "#fff" : "#000" }]}>
                    {currentShift.startTime}
                  </Text>
                </View>

                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: darkMode ? "#bbb" : "#777" }]}>{t("office_end_time")}</Text>
                  <Text style={[styles.timeValue, { color: darkMode ? "#fff" : "#000" }]}>
                    {currentShift.officeEndTime}
                  </Text>
                </View>

                <View style={styles.timeItem}>
                  <Text style={[styles.timeLabel, { color: darkMode ? "#bbb" : "#777" }]}>{t("end_time")}</Text>
                  <Text style={[styles.timeValue, { color: darkMode ? "#fff" : "#000" }]}>{currentShift.endTime}</Text>
                </View>
              </View>

              <View style={styles.daysContainer}>
                <Text style={[styles.daysLabel, { color: darkMode ? "#bbb" : "#777" }]}>{t("days_applied")}:</Text>
                <View style={styles.daysRow}>
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dayIndicator,
                        {
                          backgroundColor: currentShift.daysApplied[index]
                            ? "#6a5acd"
                            : darkMode
                              ? "#2d2d2d"
                              : "#f0f0f0",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: currentShift.daysApplied[index] ? "#fff" : darkMode ? "#bbb" : "#777",
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.noShiftContainer}>
              <Text style={[styles.noShiftText, { color: darkMode ? "#bbb" : "#777" }]}>{t("no_shift_selected")}</Text>
            </View>
          )}
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
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  shiftsContainer: {
    paddingHorizontal: 16,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    margin: 16,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentShiftContainer: {
    padding: 16,
  },
  shiftDetails: {
    marginBottom: 16,
  },
  shiftName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  shiftTime: {
    fontSize: 16,
    marginTop: 4,
  },
  shiftTimes: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  timeItem: {
    width: "50%",
    marginBottom: 12,
  },
  timeLabel: {
    fontSize: 12,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 2,
  },
  daysContainer: {
    marginTop: 8,
  },
  daysLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
  },
  noShiftContainer: {
    padding: 16,
    alignItems: "center",
  },
  noShiftText: {
    fontSize: 16,
  },
})

