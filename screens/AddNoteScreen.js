"use client"

import { useState, useContext, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ToastAndroid,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { AppContext } from "../context/AppContext"
import { generateId } from "../utils/idGenerator"

/**
 * AddNoteScreen Component
 *
 * This screen allows users to add new notes or edit existing ones.
 * It includes form validation, character limits, and confirmation dialogs.
 *
 * @param {Object} navigation - React Navigation object for screen navigation
 * @param {Object} route - Contains route parameters, including note data when editing
 */
export default function AddNoteScreen({ navigation, route }) {
  // Get context values and check if we're editing an existing note
  const { darkMode, notes, addNote, updateNote, t, shifts } = useContext(AppContext)
  const editingNote = route.params?.note
  const isEditing = !!editingNote

  // Form state
  const [title, setTitle] = useState(editingNote?.title || "")
  const [content, setContent] = useState(editingNote?.content || "")
  const [reminderTime, setReminderTime] = useState(
    editingNote?.reminderTime ? new Date(editingNote.reminderTime) : new Date(),
  )
  const [showTimePicker, setShowTimePicker] = useState(false)

  // New state for associated shifts and explicit reminder days
  const [associatedShiftIds, setAssociatedShiftIds] = useState(editingNote?.associatedShiftIds || [])
  const [explicitReminderDays, setExplicitReminderDays] = useState(editingNote?.explicitReminderDays || [])

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [duplicateError, setDuplicateError] = useState(null)

  // Cập nhật giới hạn ký tự và validation
  const TITLE_LIMIT = 100
  const CONTENT_LIMIT = 300

  // Thêm state để lưu trữ lỗi validation
  const [validationErrors, setValidationErrors] = useState({})

  // Day names mapping
  const dayNamesMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  // Day names for display
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
  const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Thay đổi định nghĩa hàm checkDuplicateNote để sử dụng useCallback
  const checkDuplicateNote = useCallback(() => {
    // Loại bỏ khoảng trắng thừa ở đầu/cuối
    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    // Kiểm tra trong danh sách notes
    const duplicate = notes.find((note) => {
      // Nếu đang sửa ghi chú, bỏ qua chính ghi chú đó
      if (isEditing && note.id === editingNote.id) {
        return false
      }

      // So sánh tiêu đề và nội dung (đã trim)
      return note.title.trim() === trimmedTitle && note.content.trim() === trimmedContent
    })

    // Trả về kết quả kiểm tra
    return {
      isDuplicate: !!duplicate,
      errorMessage: duplicate ? t("note_duplicate") || "Ghi chú có tiêu đề và nội dung này đã tồn tại." : null,
    }
  }, [title, content, notes, isEditing, editingNote, t])

  // Track unsaved changes
  useEffect(() => {
    // Chỉ kiểm tra khi cả title và content đều không rỗng
    if (title.trim() && content.trim()) {
      const { isDuplicate, errorMessage } = checkDuplicateNote()
      setDuplicateError(isDuplicate ? errorMessage : null)
    } else {
      setDuplicateError(null)
    }
  }, [title, content, notes, isEditing, editingNote, checkDuplicateNote])

  useEffect(() => {
    // Only set unsaved changes if form has been modified
    if (
      title !== (editingNote?.title || "") ||
      content !== (editingNote?.content || "") ||
      reminderTime.toTimeString() !==
        (editingNote?.reminderTime ? new Date(editingNote.reminderTime).toTimeString() : new Date().toTimeString()) ||
      JSON.stringify(associatedShiftIds) !== JSON.stringify(editingNote?.associatedShiftIds || []) ||
      JSON.stringify(explicitReminderDays) !== JSON.stringify(editingNote?.explicitReminderDays || [])
    ) {
      setHasUnsavedChanges(true)
    }
  }, [
    title,
    content,
    reminderTime,
    associatedShiftIds,
    explicitReminderDays,
    editingNote?.title,
    editingNote?.content,
    editingNote?.reminderTime,
    editingNote?.associatedShiftIds,
    editingNote?.explicitReminderDays,
  ])

  // Handle time change
  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false)
    if (selectedTime) {
      setReminderTime(selectedTime)
    }
  }

  // Toggle explicit reminder day
  const toggleExplicitDay = (dayIndex) => {
    const dayCode = dayNamesEn[dayIndex]
    const newExplicitDays = [...explicitReminderDays]

    if (newExplicitDays.includes(dayCode)) {
      // Remove day if already selected
      setExplicitReminderDays(newExplicitDays.filter((day) => day !== dayCode))
    } else {
      // Add day if not selected
      newExplicitDays.push(dayCode)
      setExplicitReminderDays(newExplicitDays)
    }
  }

  // Toggle associated shift
  const toggleShift = (shiftId) => {
    const newAssociatedShiftIds = [...associatedShiftIds]

    if (newAssociatedShiftIds.includes(shiftId)) {
      // Remove shift if already selected
      setAssociatedShiftIds(newAssociatedShiftIds.filter((id) => id !== shiftId))
    } else {
      // Add shift if not selected
      newAssociatedShiftIds.push(shiftId)
      setAssociatedShiftIds(newAssociatedShiftIds)
    }
  }

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // Reset form to initial values
  const resetForm = () => {
    if (isEditing) {
      setTitle(editingNote.title || "")
      setContent(editingNote.content || "")
      setReminderTime(editingNote.reminderTime ? new Date(editingNote.reminderTime) : new Date())
      setAssociatedShiftIds(editingNote.associatedShiftIds || [])
      setExplicitReminderDays(editingNote.explicitReminderDays || [])
    } else {
      setTitle("")
      setContent("")
      setReminderTime(new Date())
      setAssociatedShiftIds([])
      setExplicitReminderDays([])
    }
    setHasUnsavedChanges(false)

    // Show toast notification
    if (Platform.OS === "android") {
      ToastAndroid.show(t("form_reset") || "Form reset", ToastAndroid.SHORT)
    }
  }

  // Confirm reset
  const confirmReset = () => {
    if (!hasUnsavedChanges) {
      resetForm()
      return
    }

    Alert.alert(
      t("reset_form") || "Reset Form",
      t("reset_form_confirmation") || "Are you sure you want to reset the form? All unsaved changes will be lost.",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("reset") || "Reset",
          onPress: resetForm,
          style: "destructive",
        },
      ],
    )
  }

  // Cập nhật validation
  const validateForm = () => {
    let isValid = true
    const errors = {}

    // Validate title
    if (!title.trim()) {
      errors.title = t("title_required") || "Please enter a title"
      isValid = false
    } else if (title.length > TITLE_LIMIT) {
      errors.title = t("title_too_long", { limit: TITLE_LIMIT }) || `Title cannot exceed ${TITLE_LIMIT} characters`
      isValid = false
    }

    // Validate content
    if (!content.trim()) {
      errors.content = t("content_required") || "Please enter content"
      isValid = false
    } else if (content.length > CONTENT_LIMIT) {
      errors.content =
        t("content_too_long", { limit: CONTENT_LIMIT }) || `Content cannot exceed ${CONTENT_LIMIT} characters`
      isValid = false
    }

    // Validate reminder days if no shifts are selected
    if (associatedShiftIds.length === 0 && explicitReminderDays.length === 0) {
      errors.days = t("days_required") || "Please select at least one day"
      isValid = false
    }

    // Check for duplicate note
    if (title.trim() && content.trim()) {
      const { isDuplicate, errorMessage } = checkDuplicateNote()
      if (isDuplicate) {
        errors.duplicate = errorMessage
        isValid = false
      }
    }

    setValidationErrors(errors)
    return isValid
  }

  // Cập nhật hàm saveNote để sử dụng validation mới
  const saveNote = async () => {
    // Validate form
    if (!validateForm()) {
      return
    }

    try {
      // Format reminder time as ISO string
      const formattedReminderTime = reminderTime.toISOString()

      // Create new note object with updated structure
      const newNote = {
        id: editingNote?.id || generateId(),
        title: title.trim(),
        content: content.trim(),
        reminderTime: formattedReminderTime,
        associatedShiftIds: associatedShiftIds,
        explicitReminderDays: associatedShiftIds.length > 0 ? [] : explicitReminderDays,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update notes array
      let success = false
      if (isEditing) {
        success = await updateNote(newNote)
      } else {
        const result = await addNote(newNote)
        success = !!result
      }

      if (success) {
        // Show success message
        Alert.alert(
          isEditing ? t("note_updated") || "Note Updated" : t("note_saved") || "Note Saved",
          isEditing
            ? t("note_updated_message") || "Your note has been updated successfully."
            : t("note_saved_message") || "Your note has been saved successfully.",
          [{ text: t("ok") || "OK", onPress: () => navigation.goBack() }],
        )
      } else {
        // Show error message
        Alert.alert(
          t("error") || "Error",
          isEditing
            ? t("error_updating_note") || "There was an error updating your note. Please try again."
            : t("error_saving_note") || "There was an error saving your note. Please try again.",
        )
      }
    } catch (error) {
      console.error("Error saving note:", error)
      Alert.alert(t("error") || "Error", t("unexpected_error") || "An unexpected error occurred. Please try again.")
    }
  }

  // Cập nhật hàm confirmSave để sử dụng validation mới
  const confirmSave = () => {
    // Validate form
    if (!validateForm()) {
      return
    }

    // Nếu không có lỗi, hiển thị xác nhận
    Alert.alert(
      isEditing ? t("update_note") : t("save_note"),
      isEditing ? t("update_note_confirmation") : t("save_note_confirmation"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: isEditing ? t("update") : t("save"),
          onPress: saveNote,
        },
      ],
    )
  }

  // Save note
  /*const saveNote = async () => {
    // Validate inputs
    if (!title.trim()) {
      Alert.alert(t("error"), t("title_required"))
      return
    }

    if (!content.trim()) {
      Alert.alert(t("error"), t("content_required"))
      return
    }

    if (title.length > TITLE_LIMIT) {
      Alert.alert(t("error"), t("title_too_long", { limit: TITLE_LIMIT }))
      return
    }

    if (content.length > CONTENT_LIMIT) {
      Alert.alert(t("error"), t("content_too_long", { limit: CONTENT_LIMIT }))
      return
    }

    // Kiểm tra trùng lặp
    const { isDuplicate, errorMessage } = checkDuplicateNote()
    if (isDuplicate) {
      Alert.alert(t("error") || "Error", errorMessage)
      return
    }

    try {
      // Format reminder time as ISO string
      const formattedReminderTime = reminderTime.toISOString()

      // Create new note object with updated structure
      const newNote = {
        id: editingNote?.id || generateId(),
        title: title.trim(),
        content: content.trim(),
        reminderTime: formattedReminderTime,
        associatedShiftIds: associatedShiftIds,
        explicitReminderDays: associatedShiftIds.length > 0 ? [] : explicitReminderDays,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Update notes array
      let success = false
      if (isEditing) {
        success = await updateNote(newNote)
      } else {
        const result = await addNote(newNote)
        success = !!result
      }

      if (success) {
        // Show success message
        Alert.alert(
          isEditing ? t("note_updated") || "Note Updated" : t("note_saved") || "Note Saved",
          isEditing
            ? t("note_updated_message") || "Your note has been updated successfully."
            : t("note_saved_message") || "Your note has been saved successfully.",
          [{ text: t("ok") || "OK", onPress: () => navigation.goBack() }],
        )
      } else {
        // Show error message
        Alert.alert(
          t("error") || "Error",
          isEditing
            ? t("error_updating_note") || "There was an error updating your note. Please try again."
            : t("error_saving_note") || "There was an error saving your note. Please try again.",
        )
      }
    } catch (error) {
      console.error("Error saving note:", error)
      Alert.alert(t("error") || "Error", t("unexpected_error") || "An unexpected error occurred. Please try again.")
    }
  }

  // Confirm save
  const confirmSave = () => {
    // Kiểm tra các lỗi validation cơ bản
    if (!title.trim()) {
      Alert.alert(t("error"), t("title_required"))
      return
    }

    if (!content.trim()) {
      Alert.alert(t("error"), t("content_required"))
      return
    }

    if (title.length > TITLE_LIMIT) {
      Alert.alert(t("error"), t("title_too_long", { limit: TITLE_LIMIT }))
      return
    }

    if (content.length > CONTENT_LIMIT) {
      Alert.alert(t("error"), t("content_too_long", { limit: CONTENT_LIMIT }))
      return
    }

    // Kiểm tra trùng lặp
    const { isDuplicate, errorMessage } = checkDuplicateNote()
    if (isDuplicate) {
      Alert.alert(t("error") || "Error", errorMessage)
      return
    }

    // Nếu không có lỗi, hiển thị xác nhận
    Alert.alert(
      isEditing ? t("update_note") : t("save_note"),
      isEditing ? t("update_note_confirmation") : t("save_note_confirmation"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: isEditing ? t("update") : t("save"),
          onPress: saveNote,
        },
      ],
    )
  }*/

  // Confirm navigation back if there are unsaved changes
  const handleBackPress = () => {
    if (!hasUnsavedChanges) {
      navigation.goBack()
      return
    }

    Alert.alert(
      t("unsaved_changes") || "Unsaved Changes",
      t("unsaved_changes_message") || "You have unsaved changes. Are you sure you want to go back?",
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("discard") || "Discard",
          onPress: () => navigation.goBack(),
          style: "destructive",
        },
      ],
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>
          {isEditing ? t("edit_note") : t("add_note")}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Cập nhật phần render để hiển thị lỗi validation và giới hạn ký tự */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("title")}</Text>
            <View style={styles.inputWithCounter}>
              <TextInput
                style={[
                  styles.input,
                  validationErrors.title && styles.inputError,
                  {
                    color: darkMode ? "#fff" : "#000",
                    backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder={t("enter_title")}
                placeholderTextColor={darkMode ? "#999" : "#777"}
                maxLength={TITLE_LIMIT}
              />
              <Text style={[styles.charCounter, { color: darkMode ? "#bbb" : "#777" }]}>
                {title.length}/{TITLE_LIMIT}
              </Text>
            </View>
            {validationErrors.title && <Text style={styles.errorText}>{validationErrors.title}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("content")}</Text>
            <View style={styles.inputWithCounter}>
              <TextInput
                style={[
                  styles.input,
                  styles.contentInput,
                  validationErrors.content && styles.inputError,
                  {
                    color: darkMode ? "#fff" : "#000",
                    backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                  },
                ]}
                value={content}
                onChangeText={setContent}
                placeholder={t("enter_content")}
                placeholderTextColor={darkMode ? "#999" : "#777"}
                multiline
                maxLength={CONTENT_LIMIT}
              />
              <Text style={[styles.charCounter, { color: darkMode ? "#bbb" : "#777" }]}>
                {content.length}/{CONTENT_LIMIT}
              </Text>
            </View>
            {validationErrors.content && <Text style={styles.errorText}>{validationErrors.content}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>{t("reminder_time")}</Text>
            <TouchableOpacity
              style={[
                styles.timePickerButton,
                {
                  backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
                },
              ]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.timePickerText, { color: darkMode ? "#fff" : "#000" }]}>
                {formatTime(reminderTime)}
              </Text>
              <Ionicons name="time-outline" size={20} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={onTimeChange}
              />
            )}
          </View>

          {/* New section for associated shifts */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>
              {t("link_to_shifts") || "Link to Work Shifts (Optional)"}
            </Text>
            <Text style={[styles.inputDescription, { color: darkMode ? "#bbb" : "#777" }]}>
              {t("link_to_shifts_description") ||
                "Select shifts to associate this note with. If none selected, you must specify days below."}
            </Text>

            <View style={styles.shiftsContainer}>
              {shifts.map((shift) => (
                <TouchableOpacity
                  key={shift.id}
                  style={[
                    styles.shiftItem,
                    {
                      backgroundColor: associatedShiftIds.includes(shift.id)
                        ? "#6a5acd"
                        : darkMode
                          ? "#2d2d2d"
                          : "#f0f0f0",
                    },
                  ]}
                  onPress={() => toggleShift(shift.id)}
                >
                  <Text
                    style={[
                      styles.shiftName,
                      {
                        color: associatedShiftIds.includes(shift.id) ? "#fff" : darkMode ? "#fff" : "#000",
                      },
                    ]}
                  >
                    {shift.name}
                  </Text>
                  {associatedShiftIds.includes(shift.id) && <Ionicons name="checkmark" size={18} color="#fff" />}
                </TouchableOpacity>
              ))}

              {shifts.length === 0 && (
                <Text style={[styles.noShiftsText, { color: darkMode ? "#bbb" : "#777" }]}>
                  {t("no_shifts_available") || "No work shifts available. Create shifts first."}
                </Text>
              )}
            </View>
          </View>

          {/* Show explicit reminder days only if no shifts are selected */}
          {associatedShiftIds.length === 0 && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: darkMode ? "#fff" : "#000" }]}>
                {t("days_to_show") || "Reminder Days (Required if no shifts selected)"}
              </Text>
              <Text style={[styles.inputDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("days_to_show_description") || "Select days when this note should appear."}
              </Text>

              <View style={[styles.daysContainer, validationErrors.days && styles.inputError]}>
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayButton,
                      explicitReminderDays.includes(dayNamesEn[index]) && styles.selectedDayButton,
                      {
                        backgroundColor: explicitReminderDays.includes(dayNamesEn[index])
                          ? "#6a5acd"
                          : darkMode
                            ? "#2d2d2d"
                            : "#f0f0f0",
                      },
                    ]}
                    onPress={() => toggleExplicitDay(index)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        {
                          color: explicitReminderDays.includes(dayNamesEn[index]) ? "#fff" : darkMode ? "#fff" : "#000",
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {validationErrors.days && <Text style={styles.errorText}>{validationErrors.days}</Text>}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cập nhật phần footer để hiển thị lỗi trùng lặp và nút lưu/hủy */}
      <View style={styles.footer}>
        {validationErrors.duplicate && (
          <View style={styles.errorContainer}>
            <Text style={styles.duplicateError}>{validationErrors.duplicate}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
          onPress={confirmReset}
          accessibilityLabel={t("reset") || "Reset"}
          accessibilityHint={t("reset_form_hint") || "Reset all form fields"}
        >
          <Ionicons name="refresh-outline" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            { backgroundColor: "#6a5acd" },
            (Object.keys(validationErrors).length > 0 || !title.trim() || !content.trim()) && styles.disabledButton,
          ]}
          onPress={confirmSave}
          disabled={Object.keys(validationErrors).length > 0 || !title.trim() || !content.trim()}
          accessibilityLabel={isEditing ? t("update") : t("save")}
          accessibilityHint={isEditing ? t("update_note_hint") : t("save_note_hint") || "Save the note"}
        >
          <Ionicons name={isEditing ? "checkmark-circle-outline" : "save-outline"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>
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
  inputDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  inputWithCounter: {
    position: "relative",
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  contentInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  charCounter: {
    position: "absolute",
    right: 12,
    bottom: 10,
    fontSize: 12,
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
  shiftsContainer: {
    marginTop: 8,
  },
  shiftItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: "500",
  },
  noShiftsText: {
    textAlign: "center",
    fontStyle: "italic",
    padding: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    flexDirection: "row",
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
  errorContainer: {
    marginBottom: 8,
    width: "100%",
  },
  duplicateError: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 12,
    marginTop: 4,
  },
  inputError: {
    borderColor: "#ff6b6b",
    borderWidth: 1,
  },
})

