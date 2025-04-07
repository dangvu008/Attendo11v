"use client";

import { createContext, useState, useEffect } from "react";
import { getTranslation } from "../utils/translations";
import {
  initializeDatabase,
  getUserSettings,
  updateUserSettings,
  getShiftList,
  getActiveShift,
  setActiveShift as setActiveShiftDB,
  addShift as addShiftDB,
  updateShift as updateShiftDB,
  deleteShift as deleteShiftDB,
  getAttendanceLogs,
  addAttendanceLog as addAttendanceLogDB,
  resetTodayAttendanceLogs,
  getDailyWorkStatus,
  updateDailyWorkStatus,
  getNotes,
  addNote as addNoteDB,
  updateNote as updateNoteDB,
  deleteNote as deleteNoteDB,
  getAttendanceLogByType,
  createDataBackup,
  restoreFromBackup,
  exportAllData,
} from "../utils/database";
import {
  configureNotifications,
  scheduleNotificationsForActiveShift,
  cancelNotificationsByType,
  cancelAllNotifications,
  setupNotificationListeners,
} from "../utils/notificationUtils";
import { initializeAlarmSystem } from "../utils/alarmUtils";
import { checkIfResetNeeded } from "../utils/workStatusUtils";
import { validateTimeInterval } from "../utils/timeRules";
import { updateWorkStatusForNewLog } from "../utils/workStatusUtils";
import { scheduleAutomaticBackup } from "../utils/dataBackupUtils";
import { Alert } from "react-native";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as KeepAwake from "expo-keep-awake";
import { cancelAlarm } from "../utils/alarmManager";
import { ALARM_TYPES } from "../utils/alarmManager";

/**
 * AlarmModal Component
 *
 * This component displays a modal alarm with title, message, and dismiss button.
 * It includes vibration feedback and keeps the screen awake while displayed.
 *
 * @param {boolean} visible - Whether the modal is visible
 * @param {string} title - Alarm title
 * @param {string} message - Alarm message
 * @param {function} onDismiss - Function to call when alarm is dismissed
 * @param {boolean} darkMode - Whether dark mode is enabled
 * @param {string} alarmType - Type of alarm (for cancellation)
 */
const AlarmModal = ({
  visible,
  title,
  message,
  onDismiss,
  darkMode = true,
  alarmType = null,
}) => {
  const [isVibrating, setIsVibrating] = useState(false);

  // Start vibration when modal becomes visible
  useEffect(() => {
    if (visible) {
      // Keep screen awake
      KeepAwake.activateKeepAwake();

      // Start vibration pattern
      startVibration();

      return () => {
        // Clean up when component unmounts or modal hides
        stopVibration();
        KeepAwake.deactivateKeepAwake();
      };
    }
  }, [visible]);

  // Start vibration pattern
  const startVibration = () => {
    setIsVibrating(true);
    Vibration.vibrate([0, 500, 500], true);
  };

  // Stop vibration
  const stopVibration = () => {
    setIsVibrating(false);
    Vibration.cancel();
  };

  // Handle dismiss button press
  const handleDismiss = async () => {
    stopVibration();
    KeepAwake.deactivateKeepAwake();

    // Cancel the alarm in the system if alarmType is provided
    if (alarmType) {
      try {
        await cancelAlarm(alarmType);
        console.log(`Successfully canceled alarm of type: ${alarmType}`);
      } catch (error) {
        console.error(`Error canceling alarm of type ${alarmType}:`, error);
      }
    }

    onDismiss();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: darkMode ? "#1e1e1e" : "#fff" },
          ]}
        >
          <View style={styles.alarmIconContainer}>
            <Ionicons name="alarm" size={48} color="#6a5acd" />
          </View>

          <Text
            style={[styles.alarmTitle, { color: darkMode ? "#fff" : "#000" }]}
          >
            {title || "Alarm"}
          </Text>

          <Text
            style={[styles.alarmMessage, { color: darkMode ? "#bbb" : "#555" }]}
          >
            {message || "Time to take action!"}
          </Text>

          <TouchableOpacity
            style={[styles.dismissButton, { backgroundColor: "#6a5acd" }]}
            onPress={handleDismiss}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  modalContent: {
    width: "80%",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  alarmIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(106, 90, 205, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  alarmTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: "center",
  },
  alarmMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  dismissButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  dismissButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default AlarmModal;

// Create context
export const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  // State
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("vi");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [multiButtonMode, setMultiButtonMode] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true); // New state for alarm mode
  const [shifts, setShifts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [workStatus, setWorkStatus] = useState({
    status: "Chưa cập nhật",
    totalWorkTime: 0,
    overtime: 0,
    remarks: "",
  });
  const [notes, setNotes] = useState([]);
  const [weeklyStatus, setWeeklyStatus] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [showAlarmModal, setShowAlarmModal] = useState(false); // State for alarm modal
  const [alarmData, setAlarmData] = useState(null); // State for alarm data

  // Translation function
  const t = (key) => getTranslation(key, language);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);

        // Initialize database
        await initializeDatabase();

        // Configure notifications
        await configureNotifications();

        // Initialize alarm system
        await initializeAlarmSystem();

        // Setup notification listeners
        const { removeNotificationListeners } = setupNotificationListeners();
        const cleanupListeners = removeNotificationListeners;
        // Check if reset is needed
        const resetNeeded = await checkIfResetNeeded();
        if (resetNeeded) {
          await resetTodayAttendanceLogs();
        }

        // Load user settings
        const settings = await getUserSettings();
        if (settings) {
          setDarkMode(settings.darkMode);
          setLanguage(settings.language);
          setSoundEnabled(settings.soundEnabled);
          setVibrationEnabled(settings.vibrationEnabled);
          setMultiButtonMode(settings.multiButtonMode);
          setAlarmEnabled(
            settings.alarmEnabled !== undefined ? settings.alarmEnabled : true
          );
        }

        // Load shifts
        const shiftList = await getShiftList();
        setShifts(shiftList);

        // Load active shift
        const activeShift = await getActiveShift();
        setCurrentShift(activeShift);

        // Schedule notifications for active shift
        if (activeShift) {
          await scheduleNotificationsForActiveShift();
        }

        // Load today's attendance logs
        const today = new Date().toISOString().split("T")[0];
        const logs = await getAttendanceLogs(today);
        setTodayLogs(logs);

        // Load today's work status
        const status = await getDailyWorkStatus(today);
        if (status) {
          setWorkStatus(status);
        }

        // Load notes
        const notesList = await getNotes();
        setNotes(notesList);

        // Schedule automatic backup
        await scheduleAutomaticBackup();

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        setDataError(
          "Failed to load application data. Please restart the app."
        );
        setIsLoading(false);
      }
    };

    loadData();

    // Cleanup function
    return () => {
      // Cleanup notification listeners if needed
      if (typeof cleanupListeners === "function") {
        cleanupListeners();
      }
    };
  }, []);

  // Update user settings
  const handleUpdateSettings = async (newSettings) => {
    try {
      const success = await updateUserSettings(newSettings);
      if (success) {
        // Update state
        if (newSettings.darkMode !== undefined)
          setDarkMode(newSettings.darkMode);
        if (newSettings.language !== undefined)
          setLanguage(newSettings.language);
        if (newSettings.soundEnabled !== undefined)
          setSoundEnabled(newSettings.soundEnabled);
        if (newSettings.vibrationEnabled !== undefined)
          setVibrationEnabled(newSettings.vibrationEnabled);
        if (newSettings.multiButtonMode !== undefined)
          setMultiButtonMode(newSettings.multiButtonMode);
        if (newSettings.alarmEnabled !== undefined)
          setAlarmEnabled(newSettings.alarmEnabled);

        // Create backup after updating settings
        await createDataBackup();

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating settings:", error);
      return false;
    }
  };

  // Add a new shift
  const handleAddShift = async (shift) => {
    try {
      const newShift = await addShiftDB(shift);
      if (newShift) {
        setShifts([...shifts, newShift]);
        return newShift;
      }
      return null;
    } catch (error) {
      console.error("Error adding shift:", error);
      return null;
    }
  };

  // Update an existing shift
  const handleUpdateShift = async (updatedShift) => {
    //  => {
    try {
      const success = await updateShiftDB(updatedShift);
      if (success) {
        // Update shifts array
        setShifts(
          shifts.map((shift) =>
            shift.id === updatedShift.id ? updatedShift : shift
          )
        );

        // Update current shift if it's the one being updated
        if (currentShift && currentShift.id === updatedShift.id) {
          setCurrentShift({
            ...updatedShift,
            appliedDate: currentShift.appliedDate,
          });

          // Reschedule notifications if current shift was updated
          await scheduleNotificationsForActiveShift();
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating shift:", error);
      return false;
    }
  };

  // Delete a shift
  const handleDeleteShift = async (shiftId) => {
    try {
      const success = await deleteShiftDB(shiftId);
      if (success) {
        // Update shifts array
        setShifts(shifts.filter((shift) => shift.id !== shiftId));

        // Clear current shift if it's the one being deleted
        if (currentShift && currentShift.id === shiftId) {
          setCurrentShift(null);

          // Cancel notifications if current shift was deleted
          await cancelAllNotifications();
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting shift:", error);
      return false;
    }
  };

  // Set active shift
  const handleSetActiveShift = async (shiftId) => {
    try {
      const success = await setActiveShiftDB(shiftId);
      if (success) {
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift) {
          const today = new Date().toISOString().split("T")[0];
          setCurrentShift({
            ...shift,
            appliedDate: today,
          });

          // Reset today's logs when changing shifts
          await resetTodayAttendanceLogs();
          setTodayLogs([]);

          // Cancel all notifications
          await cancelAllNotifications();

          // Schedule notifications for new shift
          await scheduleNotificationsForActiveShift();

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error setting active shift:", error);
      return false;
    }
  };

  // Add attendance log
  const handleAddAttendanceLog = async (logType, force = false) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // If not forcing the action, validate time rules
      if (!force) {
        let previousActionType = null;
        let previousActionTime = null;

        if (logType === "check_in") {
          const goWorkLog = await getAttendanceLogByType(today, "go_work");
          if (goWorkLog) {
            previousActionType = "go_work";
            previousActionTime = goWorkLog.timestamp;
          }
        } else if (logType === "check_out") {
          const checkInLog = await getAttendanceLogByType(today, "check_in");
          if (checkInLog) {
            previousActionType = "check_in";
            previousActionTime = checkInLog.timestamp;
          }
        }

        // Validate time interval
        const validation = validateTimeInterval(
          previousActionType,
          previousActionTime,
          logType
        );
        if (!validation.isValid && !force) {
          return {
            success: false,
            message: validation.message,
            needsConfirmation: true,
          };
        }
      }

      // Add the attendance log
      const newLog = await addAttendanceLogDB(today, logType);
      if (newLog) {
        // Update local state
        setTodayLogs([...todayLogs, newLog]);

        // Update work status based on the new log
        const updatedStatus = await updateWorkStatusForNewLog(today, logType);
        if (updatedStatus) {
          setWorkStatus(updatedStatus);
        }

        // Cancel corresponding notification
        if (logType === "go_work") {
          await cancelNotificationsByType("departure");
        } else if (logType === "check_in") {
          await cancelNotificationsByType("check-in");
        } else if (logType === "check_out") {
          await cancelNotificationsByType("check-out");
        } else if (logType === "complete") {
          // Cancel all notifications when complete
          await cancelAllNotifications();

          // Reschedule notifications for next day
          if (currentShift) {
            await scheduleNotificationsForActiveShift();
          }
        }

        return { success: true, log: newLog };
      }

      return { success: false, message: "Failed to add attendance log" };
    } catch (error) {
      console.error("Error adding attendance log:", error);
      return { success: false, message: error.message };
    }
  };

  // Reset today's logs
  const handleResetTodayLogs = async () => {
    try {
      const success = await resetTodayAttendanceLogs();
      if (success) {
        setTodayLogs([]);

        // Reset work status
        const today = new Date().toISOString().split("T")[0];
        const resetStatus = {
          status: "Chưa cập nhật",
          totalWorkTime: 0,
          overtime: 0,
          remarks: "",
        };
        await updateDailyWorkStatus(today, resetStatus);
        setWorkStatus(resetStatus);

        // Cancel all notifications
        await cancelAllNotifications();

        // Reschedule notifications
        if (currentShift) {
          await scheduleNotificationsForActiveShift();
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error resetting today's logs:", error);
      return false;
    }
  };

  // Add a new note
  const handleAddNote = async (note) => {
    try {
      const newNote = await addNoteDB(note);
      if (newNote) {
        setNotes([...notes, newNote]);
        return newNote;
      }
      return null;
    } catch (error) {
      console.error("Error adding note:", error);
      return null;
    }
  };

  // Update an existing note
  const handleUpdateNote = async (updatedNote) => {
    try {
      const success = await updateNoteDB(updatedNote);
      if (success) {
        setNotes(
          notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating note:", error);
      return false;
    }
  };

  // Delete a note
  const handleDeleteNote = async (noteId) => {
    try {
      const success = await deleteNoteDB(noteId);
      if (success) {
        setNotes(notes.filter((note) => note.id !== noteId));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting note:", error);
      return false;
    }
  };

  // Show alarm modal
  const handleShowAlarm = (title, message) => {
    setAlarmData({ title, message });
    setShowAlarmModal(true);
  };

  // Hide alarm modal
  const handleDismissAlarm = () => {
    setShowAlarmModal(false);
    setAlarmData(null);
  };

  // Create data backup
  const handleCreateBackup = async () => {
    try {
      const success = await createDataBackup();
      if (success) {
        Alert.alert("Backup Success", "Data backup created successfully");
        return true;
      } else {
        Alert.alert("Backup Error", "Failed to create data backup");
        return false;
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      Alert.alert(
        "Backup Error",
        "An error occurred while creating backup: " + error.message
      );
      return false;
    }
  };

  // Restore from backup
  const handleRestoreBackup = async () => {
    try {
      Alert.alert(
        "Restore Backup",
        "Are you sure you want to restore from backup? This will replace all current data.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            onPress: async () => {
              setIsLoading(true);

              const success = await restoreFromBackup();

              if (success) {
                // Reload all data after restore
                const settings = await getUserSettings();
                if (settings) {
                  setDarkMode(settings.darkMode);
                  setLanguage(settings.language);
                  setSoundEnabled(settings.soundEnabled);
                  setVibrationEnabled(settings.vibrationEnabled);
                  setMultiButtonMode(settings.multiButtonMode);
                  setAlarmEnabled(
                    settings.alarmEnabled !== undefined
                      ? settings.alarmEnabled
                      : true
                  );
                }

                const shiftList = await getShiftList();
                setShifts(shiftList);

                const activeShift = await getActiveShift();
                setCurrentShift(activeShift);

                const today = new Date().toISOString().split("T")[0];
                const logs = await getAttendanceLogs(today);
                setTodayLogs(logs);

                const status = await getDailyWorkStatus(today);
                if (status) {
                  setWorkStatus(status);
                }

                const notesList = await getNotes();
                setNotes(notesList);

                // Reschedule notifications
                await cancelAllNotifications();
                if (activeShift) {
                  await scheduleNotificationsForActiveShift();
                }

                setIsLoading(false);
                Alert.alert(
                  "Restore Success",
                  "Data has been successfully restored from backup"
                );
                return true;
              } else {
                setIsLoading(false);
                Alert.alert(
                  "Restore Error",
                  "Failed to restore data from backup"
                );
                return false;
              }
            },
          },
        ]
      );
      return true;
    } catch (error) {
      console.error("Error restoring from backup:", error);
      Alert.alert(
        "Restore Error",
        "An error occurred while restoring from backup: " + error.message
      );
      return false;
    }
  };

  // Export data
  const handleExportData = async () => {
    try {
      const jsonData = await exportAllData();
      if (jsonData) {
        // Share data
        // Note: In a real app, you would use Share API or save to a file
        Alert.alert(
          "Data Export",
          "Data exported successfully. Check your device's storage."
        );
      } else {
        Alert.alert("Export Error", "Failed to export data");
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      Alert.alert(
        "Export Error",
        "An error occurred while exporting data: " + error.message
      );
    }
  };

  return (
    <AppContext.Provider
      value={{
        darkMode,
        setDarkMode,
        language,
        setLanguage,
        soundEnabled,
        setSoundEnabled,
        vibrationEnabled,
        setVibrationEnabled,
        multiButtonMode,
        setMultiButtonMode,
        alarmEnabled,
        setAlarmEnabled,
        shifts,
        setShifts,
        currentShift,
        setCurrentShift,
        todayLogs,
        setTodayLogs,
        workStatus,
        setWorkStatus,
        notes,
        setNotes,
        weeklyStatus,
        setWeeklyStatus,
        isLoading,
        setIsLoading,
        dataError,
        setDataError,
        t,
        handleUpdateSettings,
        handleAddShift,
        handleUpdateShift,
        handleDeleteShift,
        handleSetActiveShift,
        handleAddAttendanceLog,
        handleResetTodayLogs,
        handleAddNote,
        handleUpdateNote,
        handleDeleteNote,
        handleShowAlarm,
        handleDismissAlarm,
        showAlarmModal,
        alarmData,
        handleCreateBackup,
        handleRestoreBackup,
        handleExportData,
      }}
    >
      {/* Alarm Modal */}
      <AlarmModal
        visible={showAlarmModal}
        title={alarmData?.title}
        message={alarmData?.message}
        onDismiss={handleDismissAlarm}
        darkMode={darkMode}
        alarmType={alarmData?.alarmType}
      />
      {children}
    </AppContext.Provider>
  );
};
