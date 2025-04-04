"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../contexts/ThemeContext"
import { useI18n } from "../contexts/I18nContext"
import { useShift } from "../contexts/ShiftContext"
import { getShifts, removeShift } from "../utils/database"
import AddShiftModal from "../components/AddShiftModal"

export default function SettingsScreen() {
  const navigation = useNavigation()
  const { theme, isDarkMode, toggleTheme } = useTheme()
  const { locale, changeLanguage, t } = useI18n()
  const { refreshShifts } = useShift()

  const [shifts, setShifts] = useState([])
  const [showAddShift, setShowAddShift] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [notificationSound, setNotificationSound] = useState(true)
  const [vibration, setVibration] = useState(true)
  const [multiActionButton, setMultiActionButton] = useState(true)

  useEffect(() => {
    loadShifts()
  }, [])

  const loadShifts = async () => {
    try {
      const savedShifts = await getShifts()
      setShifts(savedShifts)
    } catch (error) {
      console.error("Failed to load shifts:", error)
    }
  }

  const handleEditShift = (shift) => {
    setEditingShift(shift)
    setShowAddShift(true)
  }

  const handleDeleteShift = (shiftId) => {
    if (shifts.length <= 1) {
      Alert.alert(t("error"), t("cannotDeleteLastShift"))
      return
    }

    Alert.alert(t("confirm"), t("deleteShiftConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await removeShift(shiftId)
            await loadShifts()
            refreshShifts()
          } catch (error) {
            console.error("Failed to delete shift:", error)
          }
        },
      },
    ])
  }

  const handleCloseAddShift = async (saved) => {
    setShowAddShift(false)
    setEditingShift(null)

    if (saved) {
      await loadShifts()
      refreshShifts()
    }
  }

  const toggleNotificationSound = () => {
    setNotificationSound(!notificationSound)
  }

  const toggleVibration = () => {
    setVibration(!vibration)
  }

  const toggleMultiActionButton = () => {
    setMultiActionButton(!multiActionButton)
  }

  const handleLanguageChange = () => {
    const newLocale = locale === "en" ? "vi" : "en"
    changeLanguage(newLocale)
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    section: {
      marginTop: 24,
      marginHorizontal: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    addButtonText: {
      color: "white",
      marginLeft: 4,
    },
    shiftCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    shiftHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    shiftName: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    shiftActions: {
      flexDirection: "row",
    },
    actionButton: {
      marginLeft: 12,
    },
    shiftTime: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    shiftDays: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 8,
    },
    shiftDay: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 4,
    },
    shiftDayText: {
      fontSize: 12,
      color: theme.colors.primary,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    settingInfo: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 24,
      marginHorizontal: 16,
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("settings")}</Text>
      </View>

      <ScrollView>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("workShifts")}</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowAddShift(true)}>
              <Ionicons name="add" size={16} color="white" />
              <Text style={styles.addButtonText}>{t("addNewShift")}</Text>
            </TouchableOpacity>
          </View>

          {shifts.map((shift) => (
            <View key={shift.id} style={styles.shiftCard}>
              <View style={styles.shiftHeader}>
                <Text style={styles.shiftName}>{shift.name}</Text>
                <View style={styles.shiftActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleEditShift(shift)}>
                    <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteShift(shift.id)}>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.shiftTime}>
                {t("departureTime")}: {shift.departureTime}
              </Text>
              <Text style={styles.shiftTime}>
                {t("startTime")}: {shift.startTime}
              </Text>
              <Text style={styles.shiftTime}>
                {t("endTime")}: {shift.endTime}
              </Text>

              <View style={styles.shiftDays}>
                {shift.days &&
                  shift.days.map((day) => (
                    <View key={day} style={styles.shiftDay}>
                      <Text style={styles.shiftDayText}>{day}</Text>
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("generalSettings")}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t("darkMode")}</Text>
              <Text style={styles.settingDescription}>{t("darkModeDescription")}</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: theme.colors.primaryLight }}
              thumbColor={isDarkMode ? theme.colors.primary : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t("language")}</Text>
              <Text style={styles.settingDescription}>{locale === "en" ? "English" : "Tiếng Việt"}</Text>
            </View>
            <TouchableOpacity onPress={handleLanguageChange}>
              <Ionicons name="language" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t("notificationSound")}</Text>
              <Text style={styles.settingDescription}>{t("notificationSoundDescription")}</Text>
            </View>
            <Switch
              value={notificationSound}
              onValueChange={toggleNotificationSound}
              trackColor={{ false: "#767577", true: theme.colors.primaryLight }}
              thumbColor={notificationSound ? theme.colors.primary : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t("vibration")}</Text>
              <Text style={styles.settingDescription}>{t("vibrationDescription")}</Text>
            </View>
            <Switch
              value={vibration}
              onValueChange={toggleVibration}
              trackColor={{ false: "#767577", true: theme.colors.primaryLight }}
              thumbColor={vibration ? theme.colors.primary : "#f4f3f4"}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{t("multiActionButton")}</Text>
              <Text style={styles.settingDescription}>{t("multiActionButtonDescription")}</Text>
            </View>
            <Switch
              value={multiActionButton}
              onValueChange={toggleMultiActionButton}
              trackColor={{ false: "#767577", true: theme.colors.primaryLight }}
              thumbColor={multiActionButton ? theme.colors.primary : "#f4f3f4"}
            />
          </View>
        </View>
      </ScrollView>

      <AddShiftModal visible={showAddShift} onClose={handleCloseAddShift} editShift={editingShift} />
    </View>
  )
}

