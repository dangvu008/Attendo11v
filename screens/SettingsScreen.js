"use client"

import { useContext } from "react"
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppContext } from "../context/AppContext"
import LanguageSelector from "../components/LanguageSelector"

export default function SettingsScreen({ navigation }) {
  const {
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
    t,
  } = useContext(AppContext)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: darkMode ? "#121212" : "#f5f5f5" }]}>
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("settings")}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("general_settings")}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("dark_mode")}</Text>
              <Text style={[styles.settingDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("dark_mode_description")}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#767577", true: "#6a5acd" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("language")}</Text>
            </View>
            <LanguageSelector language={language} setLanguage={setLanguage} darkMode={darkMode} />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: darkMode ? "#fff" : "#000" }]}>
                {t("notification_sound")}
              </Text>
              <Text style={[styles.settingDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("play_sound_on_notification")}
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ false: "#767577", true: "#6a5acd" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: darkMode ? "#fff" : "#000" }]}>
                {t("notification_vibration")}
              </Text>
              <Text style={[styles.settingDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("vibrate_on_notification")}
              </Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
              trackColor={{ false: "#767577", true: "#6a5acd" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: darkMode ? "#fff" : "#000" }]}>
                {t("alarm_mode") || "Chế độ báo thức"}
              </Text>
              <Text style={[styles.settingDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("alarm_mode_description") || "Sử dụng báo thức thay vì thông báo thông thường"}
              </Text>
            </View>
            <Switch
              value={alarmEnabled}
              onValueChange={setAlarmEnabled}
              trackColor={{ false: "#767577", true: "#6a5acd" }}
              thumbColor="#f4f3f4"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("multi_button_mode")}</Text>
              <Text style={[styles.settingDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                {t("multi_button_mode_description")}
              </Text>
            </View>
            <Switch
              value={multiButtonMode}
              onValueChange={setMultiButtonMode}
              trackColor={{ false: "#767577", true: "#6a5acd" }}
              thumbColor="#f4f3f4"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>
            {t("data_management") || "Data Management"}
          </Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate("DataManagement")}>
            <View style={styles.menuItemContent}>
              <Ionicons
                name="save-outline"
                size={24}
                color={darkMode ? "#6a5acd" : "#6a5acd"}
                style={styles.menuIcon}
              />
              <View style={styles.menuTextContainer}>
                <Text style={[styles.menuTitle, { color: darkMode ? "#fff" : "#000" }]}>
                  {t("data_backup_restore") || "Backup & Restore"}
                </Text>
                <Text style={[styles.menuDescription, { color: darkMode ? "#bbb" : "#777" }]}>
                  {t("manage_app_data") || "Manage your application data"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={darkMode ? "#bbb" : "#777"} />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: darkMode ? "#fff" : "#000" }]}>{t("about")}</Text>
          <View style={styles.aboutContainer}>
            <Text style={[styles.appName, { color: darkMode ? "#fff" : "#000" }]}>Attendo11</Text>
            <Text style={[styles.appVersion, { color: darkMode ? "#bbb" : "#777" }]}>Version 1.0.0</Text>
            <Text style={[styles.appDescription, { color: darkMode ? "#bbb" : "#777" }]}>{t("app_description")}</Text>
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  aboutContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "bold",
  },
  appVersion: {
    fontSize: 16,
    marginTop: 4,
  },
  appDescription: {
    fontSize: 14,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuDescription: {
    fontSize: 14,
    marginTop: 2,
  },
})

