"use client"

import { useCallback } from "react"

import { useState, useContext, useEffect } from "react"
import { AppContext } from "../context/AppContext"
import {
  Alert,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"

/**
 * AddShiftScreen Component
 *
 * This screen allows users to add new work shifts or edit existing ones.
 * It includes form validation, time pickers, and confirmation dialogs.
 *
 * @param {Object} navigation - React Navigation object for screen navigation
 * @param {Object} route - Contains route parameters, including shift data when editing
 */
export default function AddShiftScreen({ navigation, route }) {
  // Get context values and check if we're editing an existing shift
  const { darkMode, shifts, addShift, updateShift, t } = useContext(AppContext)
  const editingShift = route.params?.shift
  const isEditing = !!editingShift

  const NAME_LIMIT = 50

  // Form state
  const [name, setName] = useState(editingShift?.name || "")
  const [departureTime, setDepartureTime] = useState(
    editingShift?.departureTime ? new Date(`2000-01-01T${editingShift.departureTime}`) : new Date(),
  )
  const [startTime, setStartTime] = useState(
    editingShift?.startTime ? new Date(`2000-01-01T${editingShift.startTime}`) : new Date(),
  )
  const [officeEndTime, setOfficeEndTime] = useState(
    editingShift?.officeEndTime ? new Date(`2000-01-01T${editingShift.officeEndTime}`) : new Date(),
  )
  const [endTime, setEndTime] = useState(
    editingShift?.endTime ? new Date(`2000-01-01T${editingShift.endTime}`) : new Date(),
  )
  const [daysApplied, setDaysApplied] = useState(
    editingShift?.daysApplied || [false, false, false, false, false, false, false],
  )

  // New states to handle additional shift properties
  const [remindBeforeStart, setRemindBeforeStart] = useState(editingShift?.remindBeforeStart || false)
  const [remindAfterEnd, setRemindAfterEnd] = useState(editingShift?.remindAfterEnd || false)
  const [showSignButton, setShowSignButton] = useState(editingShift?.showSignButton || false)

  // Function to generate a unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  // Thêm các hàm validation sau vào đầu component AddShiftScreen, sau các khai báo useState

  // Validate tên ca làm việc
  const validateShiftName = () => {
    // Kiểm tra trường trống
    if (!name.trim()) {
      return { isValid: false, error: t("name_required") || "Tên ca không được để trống" }
    }

    // Kiểm tra độ dài
    if (name.length > NAME_LIMIT) {
      return {
        isValid: false,
        error: t("name_too_long", { limit: NAME_LIMIT }) || `Tên ca không được vượt quá ${NAME_LIMIT} ký tự`,
      }
    }

    // Kiểm tra ký tự đặc biệt không được phép
    // Cho phép chữ cái (bao gồm Unicode cho tiếng Việt và các ngôn ngữ khác), chữ số, khoảng trắng
    // Không cho phép các ký tự đặc biệt như !@#$%^&*()=+[]{}\|;:'",.<>/?~
    const invalidCharsRegex = /[!@#$%^&*()=+[\]{}\\|;:'",.<>/?~]/
    if (invalidCharsRegex.test(name)) {
      return {
        isValid: false,
        error: t("name_special_chars") || "Tên ca không hợp lệ (chứa ký tự đặc biệt không được phép)",
      }
    }

    // Kiểm tra trùng tên (không phân biệt hoa thường)
    const duplicateName = shifts.find(
      (shift) => shift.name.toLowerCase() === name.trim().toLowerCase() && (!isEditing || shift.id !== editingShift.id),
    )
    if (duplicateName) {
      return { isValid: false, error: t("name_duplicate") || "Tên ca đã tồn tại" }
    }

    return { isValid: true, error: null }
  }

  // Validate thời gian xuất phát và bắt đầu
  const validateDepartureAndStartTime = () => {
    // Chuyển đổi thời gian thành phút trong ngày để dễ so sánh
    const departureMinutes = departureTime.getHours() * 60 + departureTime.getMinutes()
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()

    // Tính khoảng cách, xử lý ca qua đêm
    let timeDiff = startMinutes - departureMinutes
    if (timeDiff < 0) {
      // Nếu startTime có vẻ sớm hơn departureTime, giả định startTime là ngày hôm sau
      timeDiff += 24 * 60 // Thêm 24 giờ (tính bằng phút)
    }

    // Kiểm tra khoảng cách tối thiểu 5 phút
    if (timeDiff < 5) {
      return {
        isValid: false,
        error: t("departure_start_time_error") || "Giờ xuất phát phải trước giờ bắt đầu tối thiểu 5 phút",
      }
    }

    return { isValid: true, error: null }
  }

  // Validate thời gian bắt đầu và kết thúc hành chính
  const validateStartAndOfficeEndTime = () => {
    // Chuyển đổi thời gian thành phút trong ngày
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes()
    const officeEndMinutes = officeEndTime.getHours() * 60 + officeEndTime.getMinutes()

    // Tính khoảng cách, xử lý ca qua đêm
    let timeDiff = officeEndMinutes - startMinutes
    if (timeDiff < 0) {
      // Nếu officeEndTime có vẻ sớm hơn startTime, giả định officeEndTime là ngày hôm sau
      timeDiff += 24 * 60 // Thêm 24 giờ (tính bằng phút)
    }

    // Kiểm tra thứ tự thời gian
    if (timeDiff <= 0) {
      return {
        isValid: false,
        error: t("start_office_end_order_error") || "Giờ bắt đầu phải trước giờ kết thúc HC",
      }
    }

    // Kiểm tra khoảng cách tối thiểu 2 giờ (120 phút)
    if (timeDiff < 120) {
      return {
        isValid: false,
        error: t("start_office_end_duration_error") || "Giờ kết thúc HC phải sau giờ bắt đầu tối thiểu 2 giờ",
      }
    }

    return { isValid: true, error: null }
  }

  // Validate thời gian kết thúc hành chính và kết thúc ca
  const validateOfficeEndAndEndTime = () => {
    // Chuyển đổi thời gian thành phút trong ngày
    const officeEndMinutes = officeEndTime.getHours() * 60 + officeEndTime.getMinutes()
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes()

    // Tính khoảng cách, xử lý ca qua đêm
    let timeDiff = endMinutes - officeEndMinutes
    if (timeDiff < 0) {
      // Nếu endTime có vẻ sớm hơn officeEndTime, giả định endTime là ngày hôm sau
      timeDiff += 24 * 60 // Thêm 24 giờ (tính bằng phút)
    }

    // Kiểm tra thứ tự thời gian (endTime phải bằng hoặc sau officeEndTime)
    if (timeDiff < 0) {
      return {
        isValid: false,
        error: t("office_end_end_order_error") || "Giờ kết thúc ca phải sau hoặc bằng giờ kết thúc HC",
      }
    }

    // Nếu endTime khác officeEndTime, kiểm tra khoảng cách tối thiểu 30 phút cho OT
    if (timeDiff > 0 && timeDiff < 30) {
      return {
        isValid: false,
        error: t("office_end_end_ot_error") || "Nếu có OT, giờ kết thúc ca phải sau giờ kết thúc HC tối thiểu 30 phút",
      }
    }

    return { isValid: true, error: null }
  }

  // Validate ngày áp dụng
  const validateDaysApplied = () => {
    // Kiểm tra có ít nhất 1 ngày được chọn
    const hasSelectedDay = daysApplied.some((day) => day === true)

    if (!hasSelectedDay) {
      return { isValid: false, error: t("days_applied_error") || "Chọn ít nhất một ngày áp dụng" }
    }

    return { isValid: true, error: null }
  }

  // Thêm state để lưu trữ lỗi validation
  const [validationErrors, setValidationErrors] = useState({
    name: null,
    departureStartTime: null,
    startOfficeEndTime: null,
    officeEndEndTime: null,
    daysApplied: null,
  })

  // Thêm state để kiểm tra form có hợp lệ không
  const [isFormValid, setIsFormValid] = useState(false)

  const validateShiftNameMemoized = useCallback(validateShiftName, [shifts, isEditing, editingShift, t, name])
  const validateDepartureAndStartTimeMemoized = useCallback(validateDepartureAndStartTime, [
    departureTime,
    startTime,
    t,
  ])
  const validateStartAndOfficeEndTimeMemoized = useCallback(validateStartAndOfficeEndTime, [
    startTime,
    officeEndTime,
    t,
  ])
  const validateOfficeEndAndEndTimeMemoized = useCallback(validateOfficeEndAndEndTime, [officeEndTime, endTime, t])
  const validateDaysAppliedMemoized = useCallback(validateDaysApplied, [daysApplied, t])

  // Thêm useEffect để validate form khi các giá trị thay đổi
  useEffect(() => {
    // Validate tất cả các trường
    const nameValidation = validateShiftNameMemoized()
    const departureStartValidation = validateDepartureAndStartTimeMemoized()
    const startOfficeEndValidation = validateStartAndOfficeEndTimeMemoized()
    const officeEndEndValidation = validateOfficeEndAndEndTimeMemoized()
    const daysAppliedValidation = validateDaysAppliedMemoized()

    // Cập nhật state lỗi validation
    setValidationErrors({
      name: nameValidation.isValid ? null : nameValidation.error,
      departureStartTime: departureStartValidation.isValid ? null : departureStartValidation.error,
      startOfficeEndTime: startOfficeEndValidation.isValid ? null : startOfficeEndValidation.error,
      officeEndEndTime: officeEndEndValidation.isValid ? null : officeEndEndValidation.error,
      daysApplied: daysAppliedValidation.isValid ? null : daysAppliedValidation.error,
    })

    // Kiểm tra form có hợp lệ không
    setIsFormValid(
      nameValidation.isValid &&
        departureStartValidation.isValid &&
        startOfficeEndValidation.isValid &&
        officeEndEndValidation.isValid &&
        daysAppliedValidation.isValid,
    )
  }, [
    name,
    departureTime,
    startTime,
    officeEndTime,
    endTime,
    daysApplied,
    shifts,
    isEditing,
    editingShift,
    validateShiftNameMemoized,
    validateDepartureAndStartTimeMemoized,
    validateStartAndOfficeEndTimeMemoized,
    validateOfficeEndAndEndTimeMemoized,
    validateDaysAppliedMemoized,
  ])

  // Cập nhật hàm saveShift để kiểm tra validation trước khi lưu
  const saveShift = async () => {
    // Kiểm tra form có hợp lệ không
    if (!isFormValid) {
      return
    }

    try {
      // Format times as HH:MM
      const formatTimeString = (date) => {
        return date.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      }

      // Create new shift object
      const newShift = {
        id: editingShift?.id || generateId(),
        name: name.trim(),
        departureTime: formatTimeString(departureTime),
        startTime: formatTimeString(startTime),
        officeEndTime: formatTimeString(officeEndTime),
        endTime: formatTimeString(endTime),
        remindBeforeStart,
        remindAfterEnd,
        showSignButton,
        daysApplied,
        createdAt: editingShift?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update shifts array
      let success = false
      if (isEditing) {
        success = await updateShift(newShift)
      } else {
        const result = await addShift(newShift)
        success = !!result
      }

      if (success) {
        // Show success message
        Alert.alert(
          isEditing ? t("shift_updated") || "Shift Updated" : t("shift_saved") || "Shift Saved",
          isEditing
            ? t("shift_updated_message") || "Your work shift has been updated successfully."
            : t("shift_saved_message") || "Your work shift has been saved successfully.",
          [{ text: t("ok") || "OK", onPress: () => navigation.goBack() }],
        )
      } else {
        // Show error message
        Alert.alert(
          t("error") || "Error",
          isEditing
            ? t("error_updating_shift") || "There was an error updating your work shift. Please try again."
            : t("error_saving_shift") || "There was an error saving your work shift. Please try again.",
        )
      }
    } catch (error) {
      console.error("Error saving shift:", error)
      Alert.alert(t("error") || "Error", t("unexpected_error") || "An unexpected error occurred. Please try again.")
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const [activeTimePicker, setActiveTimePicker] = useState(null)

  const onTimeChange = (event, selectedDate) => {
    const currentDate =
      selectedDate ||
      (activeTimePicker === "departure"
        ? departureTime
        : activeTimePicker === "start"
          ? startTime
          : activeTimePicker === "officeEnd"
            ? officeEndTime
            : endTime)
    setActiveTimePicker(null)
    if (activeTimePicker === "departure") {
      setDepartureTime(currentDate)
    } else if (activeTimePicker === "start") {
      setStartTime(currentDate)
    } else if (activeTimePicker === "officeEnd") {
      setOfficeEndTime(currentDate)
    } else {
      setEndTime(currentDate)
    }
  }

  const reminderOptions = [5, 10, 15, 30]

  const dayNames = [t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")]

  const toggleDay = (index) => {
    const newDaysApplied = [...daysApplied]
    newDaysApplied[index] = !newDaysApplied[index]
    setDaysApplied(newDaysApplied)
  }

  const confirmReset = () => {
    Alert.alert(
      t("confirm_reset") || "Reset Form",
      t("reset_message") || "Are you sure you want to reset all fields?",
      [
        { text: t("cancel") || "Cancel", style: "cancel" },
        { text: t("reset") || "Reset", onPress: resetForm },
      ],
    )
  }

  const resetForm = () => {
    setName("")
    setDepartureTime(new Date())
    setStartTime(new Date())
    setOfficeEndTime(new Date())
    setEndTime(new Date())
    setRemindBeforeStart(false)
    setRemindAfterEnd(false)
    setShowSignButton(false)
    setDaysApplied([false, false, false, false, false, false, false])
  }

  const confirmSave = () => {
    Alert.alert(
      isEditing ? t("confirm_update") || "Update Shift" : t("confirm_save") || "Save Shift",
      isEditing
        ? t("update_message") || "Are you sure you want to update this shift?"
        : t("save_message") || "Are you sure you want to save this shift?",
      [
        { text: t("cancel") || "Cancel", style: "cancel" },
        { text: isEditing ? t("update") || "Update" : t("save") || "Save", onPress: saveShift },
      ],
    )
  }

  const handleBackPress = () => {
    navigation.goBack()
  }

  // Cập nhật phần render để hiển thị lỗi validation
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>
          {isEditing ? t("edit_shift") : t("add_shift")}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("shift_name")}</Text>
            <TextInput
              style={[
                styles.input,
                validationErrors.name && styles.inputError,
                {
                  color: darkMode ? "#fff" : "#000",
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  borderColor: validationErrors.name ? "#ff6b6b" : "transparent",
                  borderWidth: validationErrors.name ? 1 : 0,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t("enter_shift_name")}
              placeholderTextColor={darkMode ? "#999" : "#777"}
              maxLength={NAME_LIMIT}
            />
            <View style={styles.inputFooter}>
              <Text style={[styles.charCounter, { color: darkMode ? "#bbb" : "#777" }]}>
                {name.length}/{NAME_LIMIT}
              </Text>
              {validationErrors.name && <Text style={styles.errorText}>{validationErrors.name}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("departure_time")}</Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                validationErrors.departureStartTime && styles.inputError,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  borderColor: validationErrors.departureStartTime ? "#ff6b6b" : "transparent",
                  borderWidth: validationErrors.departureStartTime ? 1 : 0,
                },
              ]}
              onPress={() => setActiveTimePicker("departure")}
            >
              <Text style={[styles.timePickerText, { color: darkMode ? "#fff" : "#000" }]}>
                {formatTime(departureTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
            {validationErrors.departureStartTime && (
              <Text style={styles.errorText}>{validationErrors.departureStartTime}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("start_time")}</Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                (validationErrors.departureStartTime || validationErrors.startOfficeEndTime) && styles.inputError,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  borderColor:
                    validationErrors.departureStartTime || validationErrors.startOfficeEndTime
                      ? "#ff6b6b"
                      : "transparent",
                  borderWidth: validationErrors.departureStartTime || validationErrors.startOfficeEndTime ? 1 : 0,
                },
              ]}
              onPress={() => setActiveTimePicker("start")}
            >
              <Text style={[styles.timePickerText, { color: darkMode ? "#fff" : "#000" }]}>
                {formatTime(startTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
            {validationErrors.startOfficeEndTime && !validationErrors.departureStartTime && (
              <Text style={styles.errorText}>{validationErrors.startOfficeEndTime}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("office_end_time")}</Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                (validationErrors.startOfficeEndTime || validationErrors.officeEndEndTime) && styles.inputError,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  borderColor:
                    validationErrors.startOfficeEndTime || validationErrors.officeEndEndTime
                      ? "#ff6b6b"
                      : "transparent",
                  borderWidth: validationErrors.startOfficeEndTime || validationErrors.officeEndEndTime ? 1 : 0,
                },
              ]}
              onPress={() => setActiveTimePicker("officeEnd")}
            >
              <Text style={[styles.timePickerText, { color: darkMode ? "#fff" : "#000" }]}>
                {formatTime(officeEndTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
            {validationErrors.officeEndEndTime && !validationErrors.startOfficeEndTime && (
              <Text style={styles.errorText}>{validationErrors.officeEndEndTime}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("end_time")}</Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                validationErrors.officeEndEndTime && styles.inputError,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  borderColor: validationErrors.officeEndEndTime ? "#ff6b6b" : "transparent",
                  borderWidth: validationErrors.officeEndEndTime ? 1 : 0,
                },
              ]}
              onPress={() => setActiveTimePicker("end")}
            >
              <Text style={[styles.timePickerText, { color: darkMode ? "#fff" : "#000" }]}>{formatTime(endTime)}</Text>
              <Ionicons name="time-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
          </View>

          {activeTimePicker && (
            <DateTimePicker
              value={
                activeTimePicker === "departure"
                  ? departureTime
                  : activeTimePicker === "start"
                    ? startTime
                    : activeTimePicker === "officeEnd"
                      ? officeEndTime
                      : endTime
              }
              mode="time"
              is24Hour={true}
              display="default"
              onChange={onTimeChange}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("remind_before_start")}</Text>
            <View style={styles.reminderOptionsContainer}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={`before-${option}`}
                  style={[
                    styles.reminderOption,
                    remindBeforeStart === option && styles.selectedReminderOption,
                    {
                      backgroundColor: remindBeforeStart === option ? "#6a5acd" : darkMode ? "#2d2d2d" : "#f0f0f0",
                    },
                  ]}
                  onPress={() => setRemindBeforeStart(option)}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      {
                        color: remindBeforeStart === option ? "#fff" : darkMode ? "#fff" : "#000",
                      },
                    ]}
                  >
                    {option} {t("minutes")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("remind_after_end")}</Text>
            <View style={styles.reminderOptionsContainer}>
              {reminderOptions.map((option) => (
                <TouchableOpacity
                  key={`after-${option}`}
                  style={[
                    styles.reminderOption,
                    remindAfterEnd === option && styles.selectedReminderOption,
                    {
                      backgroundColor: remindAfterEnd === option ? "#6a5acd" : darkMode ? "#2d2d2d" : "#f0f0f0",
                    },
                  ]}
                  onPress={() => setRemindAfterEnd(option)}
                >
                  <Text
                    style={[
                      styles.reminderOptionText,
                      {
                        color: remindAfterEnd === option ? "#fff" : darkMode ? "#fff" : "#000",
                      },
                    ]}
                  >
                    {option} {t("minutes")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.switchContainer}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("show_sign_button")}</Text>
              <Switch
                value={showSignButton}
                onValueChange={setShowSignButton}
                trackColor={{ false: "#767577", true: "#6a5acd" }}
                thumbColor="#f4f3f4"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("days_applied")}</Text>
            <View
              style={[
                styles.daysContainer,
                validationErrors.daysApplied && {
                  borderColor: "#ff6b6b",
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 4,
                },
              ]}
            >
              {dayNames.map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    daysApplied[index] && styles.selectedDayButton,
                    {
                      backgroundColor: daysApplied[index] ? "#6a5acd" : darkMode ? "#2d2d2d" : "#f0f0f0",
                    },
                  ]}
                  onPress={() => toggleDay(index)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      {
                        color: daysApplied[index] ? "#fff" : darkMode ? "#fff" : "#000",
                      },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {validationErrors.daysApplied && <Text style={styles.errorText}>{validationErrors.daysApplied}</Text>}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.iconButton,
            {
              backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
            },
          ]}
          onPress={confirmReset}
          accessibilityLabel={t("reset") || "Reset"}
          accessibilityHint={t("reset_form_hint") || "Reset all form fields"}
        >
          <Ionicons name="refresh-outline" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: isFormValid ? "#6a5acd" : "#9d8fe0",
              opacity: isFormValid ? 1 : 0.7,
            },
          ]}
          onPress={confirmSave}
          disabled={!isFormValid}
          accessibilityLabel={isEditing ? t("update") : t("save")}
          accessibilityHint={isEditing ? t("update_shift_hint") : t("save_shift_hint") || "Save the shift"}
        >
          <Ionicons name={isEditing ? "checkmark-circle-outline" : "save-outline"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

// Thêm styles mới cho hiển thị lỗi validation
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
    position: "relative",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    right: 16,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  charCounter: {
    fontSize: 12,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 4,
  },
  timePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  timePickerText: {
    fontSize: 16,
  },
  reminderOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  reminderOption: {
    width: "48%",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  selectedReminderOption: {
    backgroundColor: "#6a5acd",
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  daysContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDayButton: {
    backgroundColor: "#6a5acd",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
})

