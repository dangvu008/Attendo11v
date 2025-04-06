"use client";

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { saveNote, getShifts, getNotes, updateNote } from "../utils/database";
import { v4 as uuidv4 } from "uuid";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AddNoteModal({ visible, onClose, editNote }) {
  const { theme } = useTheme();
  const { t } = useI18n();

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [explicitReminderDays, setExplicitReminderDays] = useState([]);
  const [datePickerMode, setDatePickerMode] = useState("date");
  const [shifts, setShifts] = useState([]);
  const [associatedShiftIds, setAssociatedShiftIds] = useState([]);
  const [existingNotes, setExistingNotes] = useState([]);

  // Validation states
  const [errors, setErrors] = useState({
    title: null,
    content: null,
    reminderTime: null,
    explicitReminderDays: null,
    uniqueness: null,
  });

  // Load existing notes and shifts
  useEffect(() => {
    if (visible) {
      const loadData = async () => {
        try {
          // Load shifts
          const availableShifts = await getShifts();
          setShifts(availableShifts);

          // Load existing notes
          const notes = await getNotes();
          if (editNote) {
            // Filter out the current note if in edit mode
            setExistingNotes(notes.filter((note) => note.id !== editNote.id));
          } else {
            setExistingNotes(notes);
          }
        } catch (error) {
          console.error("Failed to load data:", error);
        }
      };

      loadData();
    }
  }, [visible, editNote]);

  // Set form values when editing a note
  useEffect(() => {
    if (editNote && visible) {
      setId(editNote.id);
      setTitle(editNote.title);
      setContent(editNote.content);

      // Set reminder time
      if (editNote.reminderTime) {
        setReminderDate(new Date(editNote.reminderTime));
      }

      // Set associated shifts
      setAssociatedShiftIds(editNote.associatedShiftIds || []);

      // Set explicit reminder days
      setExplicitReminderDays(editNote.explicitReminderDays || []);
    } else if (visible) {
      // Reset form for new note
      resetForm();
    }
  }, [editNote, visible]);

  // Validate form whenever values change
  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const validateForm = useCallback(() => {
    const newErrors = {
      title: null,
      content: null,
      reminderTime: null,
      explicitReminderDays: null,
      uniqueness: null,
    };

    // Validate title
    if (!title.trim()) {
      newErrors.title = t("titleRequired");
    } else if (title.length > 100) {
      newErrors.title = t("titleTooLong");
    }

    // Validate content
    if (!content.trim()) {
      newErrors.content = t("contentRequired");
    } else if (content.length > 300) {
      newErrors.content = t("contentTooLong");
    }

    // Validate reminder days if no shifts selected
    if (associatedShiftIds.length === 0 && explicitReminderDays.length === 0) {
      newErrors.explicitReminderDays = t("selectAtLeastOneDay");
    }

    // Check uniqueness (title + content)
    const normalizedTitle = title.trim();
    const normalizedContent = content.trim();

    const isDuplicate = existingNotes.some(
      (note) =>
        note.title.trim() === normalizedTitle &&
        note.content.trim() === normalizedContent
    );

    if (isDuplicate) {
      newErrors.uniqueness = t("noteAlreadyExists");
    }

    setErrors(newErrors);

    // Return true if no errors
    return !Object.values(newErrors).some((error) => error !== null);
  }, [
    title,
    content,
    explicitReminderDays,
    associatedShiftIds,
    existingNotes,
    t,
  ]);

  const resetForm = () => {
    setId("");
    setTitle("");
    setContent("");
    setReminderDate(new Date());
    setExplicitReminderDays([]);
    setAssociatedShiftIds([]);
    setErrors({
      title: null,
      content: null,
      reminderTime: null,
      explicitReminderDays: null,
      uniqueness: null,
    });
  };

  const handleSave = async () => {
    // Validate form before saving
    if (!validateForm()) {
      // Show first error in an alert
      const firstError = Object.values(errors).find((error) => error !== null);
      if (firstError) {
        Alert.alert(t("error"), firstError);
      }
      return;
    }

    // Confirm save
    Alert.alert(
      t("confirm"),
      editNote ? t("updateNoteConfirmation") : t("saveNoteConfirmation"),
      [
        {
          text: t("cancel"),
          style: "cancel",
        },
        {
          text: t("save"),
          onPress: async () => {
            try {
              const noteData = {
                title: title.trim(),
                content: content.trim(),
                reminderTime: reminderDate.toISOString(),
                associatedShiftIds: associatedShiftIds,
                explicitReminderDays:
                  associatedShiftIds.length > 0 ? [] : explicitReminderDays,
                updatedAt: new Date().toISOString(),
              };

              if (editNote) {
                // Update existing note
                await updateNote(editNote.id, noteData);
              } else {
                // Create new note with UUID
                await saveNote({
                  ...noteData,
                  id: uuidv4(),
                  createdAt: new Date().toISOString(),
                });
              }

              resetForm();
              onClose(true);
            } catch (error) {
              console.error("Failed to save note:", error);
              Alert.alert(t("error"), t("failedToSaveNote"));
            }
          },
        },
      ]
    );
  };

  const toggleWeekday = (index) => {
    if (explicitReminderDays.includes(index)) {
      setExplicitReminderDays(
        explicitReminderDays.filter((day) => day !== index)
      );
    } else {
      setExplicitReminderDays([...explicitReminderDays, index]);
    }
  };

  const toggleShift = (shiftId) => {
    if (associatedShiftIds.includes(shiftId)) {
      setAssociatedShiftIds(associatedShiftIds.filter((id) => id !== shiftId));
    } else {
      setAssociatedShiftIds([...associatedShiftIds, shiftId]);
    }
  };

  const showDateTimePicker = (mode) => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const onDateTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate || reminderDate;

    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    setReminderDate(currentDate);

    if (Platform.OS === "android" && datePickerMode === "date") {
      // After selecting date on Android, show time picker
      setTimeout(() => {
        showDateTimePicker("time");
      }, 500);
    }
  };

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
      maxHeight: "80%",
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
    label: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inputError: {
      borderColor: theme.colors.danger,
    },
    contentInput: {
      height: 120,
      textAlignVertical: "top",
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
    },
    characterCount: {
      alignSelf: "flex-end",
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    datePickerButton: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dateText: {
      color: theme.colors.text,
    },
    shiftsContainer: {
      marginBottom: 16,
    },
    shiftsLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    shiftsList: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 8,
      maxHeight: 200,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    shiftItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    shiftItemText: {
      color: theme.colors.text,
      flex: 1,
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
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    weekdayButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
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
      backgroundColor: theme.colors.primary,
    },
    disabledButton: {
      backgroundColor: theme.colors.border,
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
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    checkbox: {
      marginRight: 8,
    },
  });

  // Check if form has any validation errors
  const hasErrors = Object.values(errors).some((error) => error !== null);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => onClose(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editNote ? t("editNote") : t("addNewNote")}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => onClose(false)}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Tiêu đề */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("title")}</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder={t("enterTitle")}
                placeholderTextColor={theme.colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              <Text style={styles.characterCount}>{title.length}/100</Text>
              {errors.title && (
                <Text style={styles.errorText}>{errors.title}</Text>
              )}
            </View>

            {/* Nội dung */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("content")}</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.contentInput,
                  errors.content && styles.inputError,
                ]}
                placeholder={t("enterContent")}
                placeholderTextColor={theme.colors.textSecondary}
                value={content}
                onChangeText={setContent}
                multiline
                maxLength={300}
              />
              <Text style={styles.characterCount}>{content.length}/300</Text>
              {errors.content && (
                <Text style={styles.errorText}>{errors.content}</Text>
              )}
            </View>

            {/* Thời gian nhắc nhở */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t("reminderTime")}</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerButton,
                  errors.reminderTime && styles.inputError,
                ]}
                onPress={() => showDateTimePicker("time")}
              >
                <Text style={styles.dateText}>
                  {reminderDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
              {errors.reminderTime && (
                <Text style={styles.errorText}>{errors.reminderTime}</Text>
              )}
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={reminderDate}
                mode={datePickerMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateTimeChange}
                style={{ width: Platform.OS === "ios" ? "100%" : undefined }}
              />
            )}

            {/* Phần chọn ca làm việc */}
            <View style={styles.shiftsContainer}>
              <Text style={styles.shiftsLabel}>{t("associatedShifts")}</Text>

              {/* Danh sách ca làm việc */}
              <View style={styles.shiftsList}>
                {shifts.length === 0 ? (
                  <Text style={styles.shiftItemText}>
                    {t("noShiftsAvailable")}
                  </Text>
                ) : (
                  shifts.map((shift) => (
                    <TouchableOpacity
                      key={shift.id}
                      style={styles.shiftItem}
                      onPress={() => toggleShift(shift.id)}
                    >
                      <View style={styles.checkboxContainer}>
                        <Ionicons
                          name={
                            associatedShiftIds.includes(shift.id)
                              ? "checkbox"
                              : "square-outline"
                          }
                          size={24}
                          color={theme.colors.primary}
                          style={styles.checkbox}
                        />
                        <Text style={styles.shiftItemText}>{shift.name}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Phần chọn ngày trong tuần - chỉ hiển thị khi không chọn ca */}
            {associatedShiftIds.length === 0 && (
              <View style={styles.weekdaysContainer}>
                <Text style={styles.weekdaysLabel}>
                  {t("explicitReminderDays")}
                </Text>
                <View style={styles.weekdaysRow}>
                  {WEEKDAYS.map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.weekdayButton,
                        explicitReminderDays.includes(index) &&
                          styles.weekdayButtonSelected,
                        errors.explicitReminderDays &&
                          associatedShiftIds.length === 0 && {
                            borderColor: theme.colors.danger,
                          },
                      ]}
                      onPress={() => toggleWeekday(index)}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          explicitReminderDays.includes(index) &&
                            styles.weekdayTextSelected,
                        ]}
                      >
                        {day.substring(0, 1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.explicitReminderDays &&
                  associatedShiftIds.length === 0 && (
                    <Text style={styles.errorText}>
                      {errors.explicitReminderDays}
                    </Text>
                  )}
              </View>
            )}

            {/* Hiển thị lỗi trùng lặp nếu có */}
            {errors.uniqueness && (
              <Text style={[styles.errorText, { marginBottom: 16 }]}>
                {errors.uniqueness}
              </Text>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  resetForm();
                  onClose(false);
                }}
              >
                <Text style={[styles.buttonText, styles.cancelButtonText]}>
                  {t("cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  hasErrors ? styles.disabledButton : styles.saveButton,
                ]}
                onPress={handleSave}
                disabled={hasErrors}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>
                  {t("save")}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
