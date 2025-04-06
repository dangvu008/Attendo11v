import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as DocumentPicker from "expo-document-picker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

// Danh sách các key cần sao lưu
const BACKUP_KEYS = [
  "attendo_user_settings",
  "attendo_shifts",
  "attendo_active_shift",
  "attendo_work_logs",
  "attendo_daily_work_status",
  "attendo_notes",
  "attendo_weather_settings",
]

/**
 * Tạo bản sao lưu dữ liệu
 * @returns {Promise<string>} Đường dẫn đến file sao lưu
 */
export const createBackup = async () => {
  try {
    // Lấy tất cả dữ liệu cần sao lưu
    const backupData = {}

    for (const key of BACKUP_KEYS) {
      const value = await AsyncStorage.getItem(key)
      if (value !== null) {
        backupData[key] = value
      }
    }

    // Thêm metadata
    backupData.metadata = {
      appVersion: "1.0.0",
      createdAt: new Date().toISOString(),
      platform: Platform.OS,
    }

    // Chuyển đổi thành chuỗi JSON
    const jsonData = JSON.stringify(backupData)

    // Tạo tên file với timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const fileName = `attendo_backup_${timestamp}.json`

    // Đường dẫn đến file sao lưu
    const fileUri = `${FileSystem.documentDirectory}${fileName}`

    // Ghi dữ liệu vào file
    await FileSystem.writeAsStringAsync(fileUri, jsonData)

    return fileUri
  } catch (error) {
    console.error("Failed to create backup:", error)
    throw error
  }
}

/**
 * Chia sẻ file sao lưu
 * @param {string} fileUri - Đường dẫn đến file sao lưu
 */
export const shareBackup = async (fileUri) => {
  try {
    // Kiểm tra xem thiết bị có hỗ trợ chia sẻ không
    const isAvailable = await Sharing.isAvailableAsync()

    if (!isAvailable) {
      throw new Error("Sharing is not available on this device")
    }

    // Chia sẻ file
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      dialogTitle: "Share Attendo Backup",
      UTI: "public.json",
    })
  } catch (error) {
    console.error("Failed to share backup:", error)
    throw error
  }
}

/**
 * Phục hồi từ file sao lưu
 * @returns {Promise<boolean>} Kết quả phục hồi
 */
export const restoreFromBackup = async () => {
  try {
    // Mở document picker để chọn file
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/json",
      copyToCacheDirectory: true,
    })

    // Kiểm tra nếu người dùng hủy
    if (result.type === "cancel") {
      return false
    }

    // Đọc nội dung file
    const fileContent = await FileSystem.readAsStringAsync(result.uri)

    // Parse JSON
    let backupData
    try {
      backupData = JSON.parse(fileContent)
    } catch (parseError) {
      throw new Error("Invalid backup file format. The file is not valid JSON.")
    }

    // Kiểm tra tính hợp lệ của file sao lưu
    if (!backupData.metadata) {
      throw new Error("Invalid backup file. Missing metadata.")
    }

    // Validate app version compatibility
    if (backupData.metadata.appVersion && !isVersionCompatible(backupData.metadata.appVersion, "1.0.0")) {
      throw new Error(`Backup from incompatible app version: ${backupData.metadata.appVersion}`)
    }

    // Phục hồi từng key
    for (const key of BACKUP_KEYS) {
      if (backupData[key]) {
        await AsyncStorage.setItem(key, backupData[key])
      }
    }

    return true
  } catch (error) {
    console.error("Failed to restore from backup:", error)
    throw error
  }
}

// Helper function to check version compatibility
function isVersionCompatible(backupVersion, currentVersion) {
  // For now, just check major version
  const backupMajor = backupVersion.split(".")[0]
  const currentMajor = currentVersion.split(".")[0]
  return backupMajor === currentMajor
}

