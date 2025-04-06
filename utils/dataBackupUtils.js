/**
 * Data Backup and Recovery Utilities
 *
 * This module provides functions for backing up and recovering application data.
 * It ensures data can be restored in case of corruption or accidental deletion.
 */

import AsyncStorage from "@react-native-async-storage/async-storage"
import { STORAGE_KEYS, safeGetItem, safeSetItem } from "./database"
import { Alert, Share } from "react-native"
import * as FileSystem from "expo-file-system"
import * as DocumentPicker from "expo-document-picker"
import * as Sharing from "expo-sharing"

/**
 * Schedule automatic backup
 *
 * This function checks if a backup is needed based on the last backup time
 * and creates a new backup if necessary.
 *
 * @returns {Promise<boolean>} - True if backup was created, false otherwise
 */
export const scheduleAutomaticBackup = async () => {
  try {
    // Get last backup time
    const lastBackupTime = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BACKUP_TIME)

    if (!lastBackupTime) {
      // No previous backup, create one
      return await createDataBackup()
    }

    // Check if backup is older than 24 hours
    const lastBackup = new Date(lastBackupTime)
    const now = new Date()
    const diffHours = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60)

    if (diffHours >= 24) {
      return await createDataBackup()
    }

    return false
  } catch (error) {
    console.error("Error scheduling automatic backup:", error)
    return false
  }
}

/**
 * Create a backup of all application data
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const createDataBackup = async () => {
  try {
    // Get all data
    const userSettings = await safeGetItem(STORAGE_KEYS.USER_SETTINGS, {})
    const shiftList = await safeGetItem(STORAGE_KEYS.SHIFT_LIST, [])
    const activeShift = await safeGetItem(STORAGE_KEYS.ACTIVE_SHIFT, null)
    const attendanceLogs = await safeGetItem(STORAGE_KEYS.ATTENDANCE_LOGS, {})
    const dailyWorkStatus = await safeGetItem(STORAGE_KEYS.DAILY_WORK_STATUS, {})
    const notes = await safeGetItem(STORAGE_KEYS.NOTES, [])
    const lastResetTime = await safeGetItem(STORAGE_KEYS.LAST_RESET_TIME, {})
    const manualStatusUpdates = await safeGetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, {})

    // Create backup object
    const backup = {
      userSettings,
      shiftList,
      activeShift,
      attendanceLogs,
      dailyWorkStatus,
      notes,
      lastResetTime,
      manualStatusUpdates,
      backupTime: new Date().toISOString(),
      appVersion: "1.0.0", // Add app version for compatibility checks
    }

    // Save backup
    const success = await safeSetItem(STORAGE_KEYS.DATA_BACKUP, backup)
    if (success) {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_BACKUP_TIME, new Date().toISOString())
      console.log("Data backup created successfully")
      return true
    }
    return false
  } catch (error) {
    console.error("Error creating data backup:", error)
    return false
  }
}

/**
 * Restore data from backup
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const restoreFromBackup = async () => {
  try {
    // Get backup data
    const backup = await safeGetItem(STORAGE_KEYS.DATA_BACKUP)
    if (!backup) {
      console.error("No backup found")
      return false
    }

    // Restore each data type
    let success = true

    if (backup.userSettings) {
      success = success && (await safeSetItem(STORAGE_KEYS.USER_SETTINGS, backup.userSettings))
    }

    if (backup.shiftList) {
      success = success && (await safeSetItem(STORAGE_KEYS.SHIFT_LIST, backup.shiftList))
    }

    if (backup.activeShift) {
      success = success && (await safeSetItem(STORAGE_KEYS.ACTIVE_SHIFT, backup.activeShift))
    }

    if (backup.attendanceLogs) {
      success = success && (await safeSetItem(STORAGE_KEYS.ATTENDANCE_LOGS, backup.attendanceLogs))
    }

    if (backup.dailyWorkStatus) {
      success = success && (await safeSetItem(STORAGE_KEYS.DAILY_WORK_STATUS, backup.dailyWorkStatus))
    }

    if (backup.notes) {
      success = success && (await safeSetItem(STORAGE_KEYS.NOTES, backup.notes))
    }

    if (backup.lastResetTime) {
      success = success && (await safeSetItem(STORAGE_KEYS.LAST_RESET_TIME, backup.lastResetTime))
    }

    if (backup.manualStatusUpdates) {
      success = success && (await safeSetItem(STORAGE_KEYS.MANUAL_STATUS_UPDATES, backup.manualStatusUpdates))
    }

    if (success) {
      console.log("Data restored successfully from backup")
      return true
    }
    return false
  } catch (error) {
    console.error("Error restoring from backup:", error)
    return false
  }
}

/**
 * Export backup to a file
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const exportBackupToFile = async () => {
  try {
    // Create a fresh backup
    const backupSuccess = await createDataBackup()
    if (!backupSuccess) {
      Alert.alert("Backup Error", "Failed to create backup for export")
      return false
    }

    // Get the backup
    const backup = await safeGetItem(STORAGE_KEYS.DATA_BACKUP)
    if (!backup) {
      Alert.alert("Backup Error", "No backup found for export")
      return false
    }

    // Convert to JSON string
    const jsonData = JSON.stringify(backup)

    // Create a temporary file
    const fileName = `attendo_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    const filePath = `${FileSystem.documentDirectory}${fileName}`

    await FileSystem.writeAsStringAsync(filePath, jsonData)

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: "application/json",
        dialogTitle: "Export Attendo Backup",
        UTI: "public.json",
      })
      return true
    } else {
      // Fallback to Share API if Sharing is not available
      await Share.share({
        title: "Attendo Backup",
        message: jsonData,
      })
      return true
    }
  } catch (error) {
    console.error("Error exporting backup to file:", error)
    Alert.alert("Export Error", "Failed to export backup: " + error.message)
    return false
  }
}

/**
 * Import backup from a file
 *
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const importBackupFromFile = async () => {
  try {
    // Pick a document
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    })

    if (result.type === "cancel") {
      return false
    }

    // Read the file
    const fileContent = await FileSystem.readAsStringAsync(result.uri)

    // Parse JSON data
    const data = JSON.parse(fileContent)

    // Validate data structure
    if (!data.userSettings || !data.shiftList || !data.attendanceLogs) {
      Alert.alert("Import Error", "Invalid backup file format")
      return false
    }

    // Check app version compatibility
    if (data.appVersion && data.appVersion !== "1.0.0") {
      Alert.alert(
        "Version Warning",
        "The backup was created with a different app version. Some data may not be compatible.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Import Anyway",
            onPress: async () => {
              // Save as backup
              const success = await safeSetItem(STORAGE_KEYS.DATA_BACKUP, data)
              if (!success) {
                Alert.alert("Import Error", "Failed to save imported data")
                return false
              }

              // Restore from the new backup
              const restoreSuccess = await restoreFromBackup()
              if (restoreSuccess) {
                Alert.alert("Import Success", "Data has been successfully imported and restored")
                return true
              } else {
                Alert.alert("Import Error", "Failed to restore data from imported backup")
                return false
              }
            },
          },
        ],
      )
      return false
    }

    // Save as backup
    const success = await safeSetItem(STORAGE_KEYS.DATA_BACKUP, data)
    if (!success) {
      Alert.alert("Import Error", "Failed to save imported data")
      return false
    }

    // Restore from the new backup
    const restoreSuccess = await restoreFromBackup()
    if (restoreSuccess) {
      Alert.alert("Import Success", "Data has been successfully imported and restored")
      return true
    } else {
      Alert.alert("Import Error", "Failed to restore data from imported backup")
      return false
    }
  } catch (error) {
    console.error("Error importing backup from file:", error)
    Alert.alert("Import Error", "Failed to import backup: " + error.message)
    return false
  }
}

