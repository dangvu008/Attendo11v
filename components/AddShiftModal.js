"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../contexts/ThemeContext"
import { useI18n } from "../contexts/I18nContext"
import { useShift } from "../contexts/ShiftContext"
import { getShifts } from "../utils/database"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function AddShiftModal({ visible, onClose, editShift }) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const { addShift, updateShift } = useShift()

  const [name, setName] = useState("")
  const [departureTime, setDepartureTime] = useState(new Date())
  const [startTime, setStartTime] = useState(new Date())
  const [endTime, setEndTime] = useState(new Date())
  const [officeEndTime, setOfficeEndTime] = useState(new Date())
  const [remindBeforeStart, setRemindBeforeStart] = useState(15)
  const [remindAfterEnd, setRemindAfterEnd] = useState(15)
  const [showSignButton, setShowSignButton] = useState(false)
  const [selectedWeekdays, setSelectedWeekdays] = useState([0, 1, 2, 3, 4]) // Mon-Fri by default

  const [showTimePicker, setShowTimePicker] = useState(false)
  const [currentTimeField, setCurrentTimeField] = useState(null)

  // Validation states
  const [errors, setErrors] = useState({
    name: null,
    departureTime: null,
    startTime: null,
    officeEndTime: null,
    endTime: null,
    selectedWeekdays: null,
  })

  const [existingShifts, setExistingShifts] = useState([])
  const [isFormValid, setIsFormValid] = useState(false)

  // Load existing shifts for name uniqueness validation
  useEffect(() => {
    const loadExistingShifts = async () => {
      try {
        const shifts = await getShifts()
        // Filter out the current shift if in edit mode
        if (editShift) {
          setExistingShifts(shifts.filter((shift) => shift.id !== editShift.id))
        } else {
          setExistingShifts(shifts)
        }
      } catch (error) {
        console.error("Failed to load existing shifts:", error)
      }
    }

    loadExistingShifts()
  }, [editShift])

  useEffect(() => {
    if (editShift) {
      setName(editShift.name)

      // Convert string times to Date objects
      const setTimeFromString = (timeStr) => {
        const [hours, minutes] = timeStr.split(":").map(Number)
        const date = new Date()
        date.setHours(hours, minutes, 0, 0)
        return date
      }

      setDepartureTime(setTimeFromString(editShift.departureTime))
      setStartTime(setTimeFromString(editShift.startTime))
      setEndTime(setTimeFromString(editShift.endTime))
      setOfficeEndTime(setTimeFromString(editShift.officeEndTime))

      setRemindBeforeStart(editShift.remindBeforeStart)
      setRemindAfterEnd(editShift.remindAfterEnd)
      setShowSignButton(editShift.showSignButton)
      setSelectedWeekdays(editShift.days || [0, 1, 2, 3, 4])
    } else {
      resetForm()
    }

    // Validate form after setting initial values
    validateForm()
  }, [editShift, visible])

  // Validate form whenever any field changes
  useEffect(() => {
    validateForm()
  }, [name, departureTime, startTime, endTime, officeEndTime, selectedWeekdays])

  const resetForm = () => {
    setName("")

    const now = new Date()

    // Set default departure time (7:10 AM)
    const departureDefault = new Date(now)
    departureDefault.setHours(7, 10, 0, 0)
    setDepartureTime(departureDefault)

    // Set default start time (8:00 AM)
    const startDefault = new Date(now)
    startDefault.setHours(8, 0, 0, 0)
    setStartTime(startDefault)

    // Set default end time (5:00 PM)
    const endDefault = new Date(now)
    endDefault.setHours(17, 0, 0, 0)
    setEndTime(endDefault)

    // Set default office end time (same as end time)
    const officeEndDefault = new Date(now)
    officeEndDefault.setHours(17, 0, 0, 0)
    setOfficeEndTime(officeEndDefault)

    setRemindBeforeStart(15)
    setRemindAfterEnd(15)
    setShowSignButton(false)
    setSelectedWeekdays([0, 1, 2, 3, 4]) // Mon-Fri by default

    // Reset errors
    setErrors({
      name: null,
      departureTime: null,
      startTime: null,
      officeEndTime: null,
      endTime: null,
      selectedWeekdays: null,
    })
  }

  // Helper function to convert time to minutes for comparison
  const timeToMinutes = (date) => {
    return date.getHours() * 60 + date.getMinutes()
  }

  // Helper function to calculate time difference in minutes, handling overnight shifts
  const getTimeDifferenceInMinutes = (startDate, endDate) => {
    const startMinutes = timeToMinutes(startDate)
    let endMinutes = timeToMinutes(endDate)

    // If end time is earlier than start time, assume it's the next day
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60 // Add 24 hours in minutes
    }

    return endMinutes - startMinutes
  }

  const validateForm = () => {
    const newErrors = {
      name: null,
      departureTime: null,
      startTime: null,
      officeEndTime: null,
      endTime: null,
      selectedWeekdays: null,
    }

    // Validate name
    if (!name.trim()) {
      newErrors.name = t("nameRequired")
    } else if (name.length > 200) {
      newErrors.name = t("nameTooLong")
    } else {
      // Check for invalid characters using regex
      // Allow letters, numbers, spaces, and common punctuation from all languages
      const nameRegex = /^[\p{L}\p{N}\s\p{P}]+$/u
      if (!nameRegex.test(name)) {
        newErrors.name = t("nameInvalidChars")
      } else {
        // Check for uniqueness
        const normalizedName = name.trim().toLowerCase()
        const isDuplicate = existingShifts.some((shift) => shift.name.trim().toLowerCase() === normalizedName)
        if (isDuplicate) {
          newErrors.name = t("nameAlreadyExists")
        }
      }
    }

    // Helper function to calculate time difference in minutes, handling overnight shifts
    const getTimeDifferenceInMinutes = (startDate, endDate) => {
      const startMinutes = timeToMinutes(startDate)
      let endMinutes = timeToMinutes(endDate)

      // If end time is earlier than start time, assume it's the next day
      if (endMinutes < startMinutes) {
        endMinutes += 24 * 60 // Add 24 hours in minutes
      }

      return endMinutes - startMinutes
    }

    // Validate departure time vs start time
    const departureToStartDiff = getTimeDifferenceInMinutes(departureTime, startTime)
    if (departureToStartDiff < 5) {
      newErrors.departureTime = t("departureTimeBeforeStart")
    }

    // Validate start time vs office end time
    const startToOfficeEndDiff = getTimeDifferenceInMinutes(startTime, officeEndTime)
    if (startToOfficeEndDiff < 120) {
      // 2 hours = 120 minutes
      newErrors.officeEndTime = t("minWorkingHours")
    }

    // Validate office end time vs end time
    const officeEndToEndDiff = getTimeDifferenceInMinutes(officeEndTime, endTime)
    if (officeEndToEndDiff < 0) {
      newErrors.endTime = t("endTimeAfterOfficeEnd")
    } else if (officeEndToEndDiff > 0 && officeEndToEndDiff < 30) {
      newErrors.endTime = t("minOvertimeMinutes")
    }

    // Validate selected weekdays
    if (selectedWeekdays.length === 0) {
      newErrors.selectedWeekdays = t("selectAtLeastOneDay")
    }

    setErrors(newErrors)

    // Check if form is valid (no errors)
    const isValid = Object.values(newErrors).every((error) => error === null)
    setIsFormValid(isValid)

    return isValid
  }

  const handleSave = async () => {
    // Final validation before saving
    if (!validateForm()) {
      // Show first error in an alert
      const firstError = Object.values(errors).find((error) => error !== null)
      if (firstError) {
        Alert.alert(t("error"), firstError)
      }
      return
    }

    const formatTime = (date) => {
      return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
    }

    const shiftData = {
      name: name.trim(),
      departureTime: formatTime(departureTime),
      startTime: formatTime(startTime),
      endTime: formatTime(endTime),
      officeEndTime: formatTime(officeEndTime),
      remindBeforeStart,
      remindAfterEnd,
      showSignButton,
      days: selectedWeekdays,
    }

    try {
      if (editShift) {
        await updateShift({ ...shiftData, id: editShift.id })
      } else {
        await addShift(shiftData)
      }

      onClose(true)
    } catch (error) {
      console.error("Failed to save shift:", error)
      Alert.alert(t("error"), t("failedToSaveShift"))
    }
  }

  const toggleWeekday = (index) => {
    if (selectedWeekdays.includes(index)) {
      setSelectedWeekdays(selectedWeekdays.filter((day) => day !== index))
    } else {
      setSelectedWeekdays([...selectedWeekdays, index])
    }
  }

  const showTimePickerFor = (field) => {
    setCurrentTimeField(field)
    setShowTimePicker(true)
  }

  const onTimeChange = (event, selectedTime) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false)
    }

    if (selectedTime) {
      switch (currentTimeField) {
        case "departure":
          setDepartureTime(selectedTime)
          break
        case "start":
          setStartTime(selectedTime)
          break
        case "end":
          setEndTime(selectedTime)
          break
        case "officeEnd":
          setOfficeEndTime(selectedTime)
          break
      }
    }
  }

  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      width: "90%",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 20,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    inputContainer: {
      marginBottom: 16,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      borderWidth: errors.name ? 1 : 0,
      borderColor: theme.colors.danger,
    },
    label: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    timePickerButton: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: errors.departureTime || errors.startTime || errors.officeEndTime || errors.endTime ? 1 : 0,
      borderColor: theme.colors.danger,
    },
    timeText: {
      color: theme.colors.text,
    },
    reminderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    reminderLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    reminderValue: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 8,
      minWidth: 80,
      alignItems: "center",
    },
    reminderValueText: {
      color: theme.colors.text,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    switchLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    weekdaysContainer: {
      marginBottom: 16,
    },
    weekdaysLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    weekdaysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    weekdayButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderWidth: errors.selectedWeekdays ? 1 : 0,
      borderColor: theme.colors.danger,
    },
    weekdayButtonSelected: {
      backgroundColor: theme.colors.primary,
    },
    weekdayText: {
      color: theme.colors.text,
    },
    weekdayTextSelected: {
      color: "white",
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 16,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginLeft: 12,
    },
    cancelButton: {
      backgroundColor: theme.colors.card,
    },
    saveButton: {
      backgroundColor: isFormValid ? theme.colors.primary : theme.colors.border,
    },
    buttonText: {
      fontWeight: "bold",
    },
    cancelButtonText: {
      color: theme.colors.text,
    },
    saveButtonText: {
      color: "white",
    },
    disabledButtonText: {
      color: theme.colors.textSecondary,
    },
  })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editShift ? t("editShift") : t("addNewShift")}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => onClose(false)}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Tên ca làm việc */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("shiftName")}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("enterShiftName")}
                placeholderTextColor={theme.colors.textSecondary}
                value={name}
                onChangeText={setName}
                maxLength={200}
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            {/* Giờ xuất phát */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("departureTime")}</Text>
              <TouchableOpacity
                style={[styles.timePickerButton, errors.departureTime && { borderColor: theme.colors.danger }]}
                onPress={() => showTimePickerFor("departure")}
              >
                <Text style={styles.timeText}>
                  {departureTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="time-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              {errors.departureTime && <Text style={styles.errorText}>{errors.departureTime}</Text>}
            </View>

            {/* Giờ bắt đầu */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("startTime")}</Text>
              <TouchableOpacity
                style={[styles.timePickerButton, errors.startTime && { borderColor: theme.colors.danger }]}
                onPress={() => showTimePickerFor("start")}
              >
                <Text style={styles.timeText}>
                  {startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="time-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              {errors.startTime && <Text style={styles.errorText}>{errors.startTime}</Text>}
            </View>

            {/* Giờ kết thúc HC */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("officeEndTime")}</Text>
              <TouchableOpacity
                style={[styles.timePickerButton, errors.officeEndTime && { borderColor: theme.colors.danger }]}
                onPress={() => showTimePickerFor("officeEnd")}
              >
                <Text style={styles.timeText}>
                  {officeEndTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="time-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              {errors.officeEndTime && <Text style={styles.errorText}>{errors.officeEndTime}</Text>}
            </View>

            {/* Giờ kết thúc ca */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("endTime")}</Text>
              <TouchableOpacity
                style={[styles.timePickerButton, errors.endTime && { borderColor: theme.colors.danger }]}
                onPress={() => showTimePickerFor("end")}
              >
                <Text style={styles.timeText}>
                  {endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
                <Ionicons name="time-outline" size={20} color={theme.colors.text} />
              </TouchableOpacity>
              {errors.endTime && <Text style={styles.errorText}>{errors.endTime}</Text>}
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={
                  currentTimeField === "departure"
                    ? departureTime
                    : currentTimeField === "start"
                      ? startTime
                      : currentTimeField === "end"
                        ? endTime
                        : officeEndTime
                }
                mode="time"
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
                style={{ width: Platform.OS === "ios" ? "100%" : undefined }}
              />
            )}

            {/* Nhắc nhở trước giờ bắt đầu */}
            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>{t("remindBeforeStart")}</Text>
              <TouchableOpacity
                style={styles.reminderValue}
                onPress={() => {
                  // Toggle between common values
                  const values = [5, 10, 15, 30]
                  const currentIndex = values.indexOf(remindBeforeStart)
                  const nextIndex = (currentIndex + 1) % values.length
                  setRemindBeforeStart(values[nextIndex])
                }}
              >
                <Text style={styles.reminderValueText}>
                  {remindBeforeStart} {t("minutes")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nhắc nhở sau giờ kết thúc */}
            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>{t("remindAfterEnd")}</Text>
              <TouchableOpacity
                style={styles.reminderValue}
                onPress={() => {
                  // Toggle between common values
                  const values = [5, 10, 15, 30]
                  const currentIndex = values.indexOf(remindAfterEnd)
                  const nextIndex = (currentIndex + 1) % values.length
                  setRemindAfterEnd(values[nextIndex])
                }}
              >
                <Text style={styles.reminderValueText}>
                  {remindAfterEnd} {t("minutes")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Hiển thị nút ký công */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t("showSignButton")}</Text>
              <Switch
                value={showSignButton}
                onValueChange={setShowSignButton}
                trackColor={{ false: "#767577", true: theme.colors.primary }}
                thumbColor="#f4f3f4"
              />
            </View>

            {/* Ngày áp dụng */}
            <View style={styles.weekdaysContainer}>
              <Text style={styles.weekdaysLabel}>{t("applyToDays")}</Text>
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.weekdayButton,
                      selectedWeekdays.includes(index) && styles.weekdayButtonSelected,
                      errors.selectedWeekdays && { borderColor: theme.colors.danger },
                    ]}
                    onPress={() => toggleWeekday(index)}
                  >
                    <Text style={[styles.weekdayText, selectedWeekdays.includes(index) && styles.weekdayTextSelected]}>
                      {day.substring(0, 1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.selectedWeekdays && <Text style={styles.errorText}>{errors.selectedWeekdays}</Text>}
            </View>

            {/* Nút hủy và lưu */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => onClose(false)}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={!isFormValid}>
                <Text style={[styles.buttonText, isFormValid ? styles.saveButtonText : styles.disabledButtonText]}>
                  {t("save")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

