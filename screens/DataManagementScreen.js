"use client"

import { useEffect } from "react"

import { useContext, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import { getLastBackupTime } from "../utils/database"
import { exportBackupToFile, importBackupFromFile } from "../utils/dataBackupUtils"

/**
 * DataManagementScreen Component
 *
 * This screen provides options for managing application data, including
 * backup, restore, export, and import functionality.
 *
 * @param {Object} navigation - React Navigation object for screen navigation
 */
export default function DataManagementScreen({ navigation }) {
  const { darkMode, t, createBackup, restoreBackup } = useContext(AppContext)
  const [loading, setLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState(null)

  // Load last backup time
  useEffect(() => {
    const loadLastBackupTime = async () => {
      const time = await getLastBackupTime()
      if (time) {
        setLastBackup(new Date(time))
      }
    }

    loadLastBackupTime()
  }, [])

  // Format date for display
  const formatDate = (date) => {
    if (!date) return "Never"

    return date.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Handle backup
  const handleBackup = async () => {
    try {
      setLoading(true)
      const success = await createBackup()
      setLoading(false)

      if (success) {
        const time = await getLastBackupTime()
        if (time) {
          setLastBackup(new Date(time))
        }
      }
    } catch (error) {
      console.error("Error creating backup:", error)
      setLoading(false)
      Alert.alert("Backup Error", "An error occurred while creating backup")
    }
  }

  // Handle restore
  const handleRestore = async () => {
    try {
      await restoreBackup()
    } catch (error) {
      console.error("Error restoring from backup:", error)
      Alert.alert("Restore Error", "An error occurred while restoring from backup")
    }
  }

  // Handle export
  const handleExport = async () => {
    try {
      setLoading(true)
      await exportBackupToFile()
      setLoading(false)
    } catch (error) {
      console.error("Error exporting backup:", error)
      setLoading(false)
      Alert.alert("Export Error", "An error occurred while exporting backup")
    }
  }

  // Handle import
  const handleImport = async () => {
    try {
      setLoading(true)
      await importBackupFromFile()
      setLoading(false)

      // Refresh last backup time
      const time = await getLastBackupTime()
      if (time) {
        setLastBackup(new Date(time))
      }
    } catch (error) {
      console.error("Error importing backup:", error)
      setLoading(false)
      Alert.alert("Import Error", "An error occurred while importing backup")
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>
          {t("data_management") || "Data Management"}
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6a5acd" />
            <Text style={[styles.loadingText, { color: darkMode ? "#fff" : "#000" }]}>
              {t("please_wait") || "Please wait..."}
            </Text>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>
            {t("backup_and_restore") || "Backup & Restore"}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: darkMode ? "#bbb" : "#777" }]}>
              {t("last_backup") || "Last Backup:"}
            </Text>
            <Text style={[styles.infoValue, { color: darkMode ? "#fff" : "#000" }]}>{formatDate(lastBackup)}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#6a5acd" }]}
              onPress={handleBackup}
              disabled={loading}
            >
              <Ionicons name="save-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{t("create_backup") || "Create Backup"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
              onPress={handleRestore}
              disabled={loading || !lastBackup}
            >
              <Ionicons name="refresh-outline" size={20} color={darkMode ? "#fff" : "#000"} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: darkMode ? "#fff" : "#000" }]}>
                {t("restore") || "Restore"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>
            {t("export_and_import") || "Export & Import"}
          </Text>

          <Text style={[styles.sectionDescription, { color: darkMode ? "#bbb" : "#777" }]}>
            {t("export_import_description") || "Export your data to a file or import from a previously exported file."}
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#6a5acd" }]}
              onPress={handleExport}
              disabled={loading}
            >
              <Ionicons name="download-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{t("export_to_file") || "Export to File"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
              onPress={handleImport}
              disabled={loading}
            >
              <Ionicons name="upload-outline" size={20} color={darkMode ? "#fff" : "#000"} style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: darkMode ? "#fff" : "#000" }]}>
                {t("import_from_file") || "Import from File"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>
            {t("data_security") || "Data Security"}
          </Text>

          <Text style={[styles.sectionDescription, { color: darkMode ? "#bbb" : "#777" }]}>
            {t("data_security_description") ||
              "Your data is stored securely on your device. Regular backups help protect against data loss."}
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: darkMode ? "#bbb" : "#777" }]}>
              {t("encryption") || "Encryption:"}
            </Text>
            <Text style={[styles.infoValue, { color: darkMode ? "#fff" : "#000" }]}>{t("enabled") || "Enabled"}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: darkMode ? "#bbb" : "#777" }]}>
              {t("auto_backup") || "Auto Backup:"}
            </Text>
            <Text style={[styles.infoValue, { color: darkMode ? "#fff" : "#000" }]}>{t("daily") || "Daily"}</Text>
          </View>
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 0.48,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
})

