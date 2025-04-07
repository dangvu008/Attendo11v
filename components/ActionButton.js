"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../contexts/ThemeContext"
import { useI18n } from "../contexts/I18nContext"
import { useWorkStatus } from "../contexts/WorkStatusContext"
import { useShift } from "../contexts/ShiftContext"
import { cancelNotificationByType } from "../utils/notificationService"
import { format } from "date-fns"
import AsyncStorage from "@react-native-async-storage/async-storage"

export default function ActionButton() {
  const { theme } = useTheme()
  const { t } = useI18n()
  const { workStatus, updateWorkStatus, resetWorkStatus } = useWorkStatus()
  const { currentShift } = useShift()
  const [showPunch, setShowPunch] = useState(false)
  const actionButtonRef = useRef(null)

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem("attendo_user_settings")
        if (settings) {
          const parsedSettings = JSON.parse(settings)
          setShowPunch(currentShift?.showPunch || false)
        }
      } catch (error) {
        console.error("Failed to load button settings:", error)
      }
    }

    loadSettings()
  }, [currentShift])

  // Get the next action based on current status
  const getNextAction = () => {
    switch (workStatus.status) {
      case "idle":
        return "go_work"
      case "go_work":
        return "check_in"
      case "check_in":
        return showPunch ? "punch" : "check_out"
      case "punch":
        return "check_out"
      case "check_out":
        return "complete"
      case "complete":
        return "complete" // No next action when complete
      default:
        return "go_work"
    }
  }

  // Handle button press
  const handleActionPress = async () => {
    if (workStatus.status === "complete") {
      return // Do nothing if already complete
    }

    const nextAction = getNextAction()
    const timestamp = new Date()

    try {
      // Cancel notification
      await cancelNotificationByType(nextAction, format(timestamp, "yyyy-MM-dd"))

      // Update work status
      await updateWorkStatus(nextAction, timestamp)
    } catch (error) {
      console.error("Failed to process action:", error)
      Alert.alert(t("error"), t("failedToSaveWorkLog"))
    }
  }

  // Get button properties based on current status
  const getButtonColor = () => {
    switch (workStatus.status) {
      case "idle":
        return theme.colors.primary
      case "go_work":
        return theme.colors.warning
      case "check_in":
        return theme.colors.success
      case "punch":
        return theme.colors.info
      case "check_out":
        return theme.colors.info
      case "complete":
        return theme.colors.primary
      default:
        return theme.colors.primary
    }
  }

  const getButtonText = () => {
    const nextAction = getNextAction()
    switch (nextAction) {
      case "go_work":
        return t("goToWork")
      case "check_in":
        return t("clockIn")
      case "punch":
        return t("punch")
      case "check_out":
        return t("clockOut")
      case "complete":
        return t("completed")
      default:
        return t("goToWork")
    }
  }

  const getButtonIcon = () => {
    const nextAction = getNextAction()
    switch (nextAction) {
      case "go_work":
        return "briefcase-outline"
      case "check_in":
        return "enter-outline"
      case "punch":
        return "create-outline"
      case "check_out":
        return "exit-outline"
      case "complete":
        return "checkmark-done-outline"
      default:
        return "briefcase-outline"
    }
  }

  const styles = StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 24,
    },
    mainButtonContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },
    mainButton: {
      width: "100%",
      height: "100%",
      borderRadius: 60,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: getButtonColor(),
    },
    disabledButton: {
      opacity: 0.7,
    },
    buttonText: {
      color: "white",
      fontWeight: "bold",
      marginTop: 8,
      fontSize: 16,
      textAlign: "center",
    },
    resetButton: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    resetText: {
      color: theme.colors.text,
      marginLeft: 4,
    },
    statusHistory: {
      marginTop: 16,
      alignItems: "center",
    },
    historyItem: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    // Add tooltip styles for action labels
    tooltip: {
      position: "absolute",
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    tooltipText: {
      color: theme.colors.text,
      fontSize: 14,
    },
    // Position tooltips around the main button
    goToWorkTooltip: {
      top: -40,
      left: "50%",
      transform: [{ translateX: -40 }],
    },
    clockInTooltip: {
      top: "50%",
      right: -110,
      transform: [{ translateY: -15 }],
    },
    clockOutTooltip: {
      bottom: -40,
      left: "50%",
      transform: [{ translateX: -45 }],
    },
    punchTooltip: {
      top: "50%",
      left: -100,
      transform: [{ translateY: -15 }],
    },
  })

  // Determine if button should be disabled
  const isButtonDisabled = workStatus.status === "complete"

  // Render tooltips based on current status
  const renderTooltips = () => {
    // Only show tooltips if not in idle or complete state
    if (workStatus.status === "idle" || workStatus.status === "complete") {
      return null
    }

    return (
      <>
        {workStatus.status === "go_work" && (
          <View style={[styles.tooltip, styles.goToWorkTooltip]}>
            <Text style={styles.tooltipText}>{t("goToWork")}</Text>
          </View>
        )}
        {workStatus.status === "check_in" && (
          <View style={[styles.tooltip, styles.clockInTooltip]}>
            <Text style={styles.tooltipText}>{t("clockIn")}</Text>
          </View>
        )}
        {workStatus.status === "check_out" && (
          <View style={[styles.tooltip, styles.clockOutTooltip]}>
            <Text style={styles.tooltipText}>{t("clockOut")}</Text>
          </View>
        )}
        {workStatus.status === "punch" && showPunch && (
          <View style={[styles.tooltip, styles.punchTooltip]}>
            <Text style={styles.tooltipText}>{t("punch")}</Text>
          </View>
        )}
      </>
    )
  }

  return (
    <View style={styles.container}>
      {/* Main action button */}
      <View style={styles.mainButtonContainer}>
        <TouchableOpacity
          ref={actionButtonRef}
          style={[styles.mainButton, isButtonDisabled && styles.disabledButton]}
          onPress={handleActionPress}
          disabled={isButtonDisabled}
        >
          <Ionicons name={getButtonIcon()} size={32} color="white" />
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>

      {/* Tooltips to show available actions */}
      {renderTooltips()}

      {/* Reset button (only show if not in idle state) */}
      {workStatus.status !== "idle" && (
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            Alert.alert(t("confirm"), t("resetStatusConfirmation"), [
              {
                text: t("cancel"),
                style: "cancel",
              },
              {
                text: t("reset"),
                onPress: resetWorkStatus,
              },
            ])
          }}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.colors.text} />
          <Text style={styles.resetText}>{t("reset")}</Text>
        </TouchableOpacity>
      )}

      {/* Status history */}
      {workStatus.status !== "idle" && (
        <View style={styles.statusHistory}>
          {workStatus.goToWorkTime && (
            <Text style={styles.historyItem}>
              {t("goneToWork")} {format(new Date(workStatus.goToWorkTime), "HH:mm")}
            </Text>
          )}
          {workStatus.checkInTime && (
            <Text style={styles.historyItem}>
              {t("clockedIn")} {format(new Date(workStatus.checkInTime), "HH:mm")}
            </Text>
          )}
          {workStatus.punchTime && (
            <Text style={styles.historyItem}>
              {t("punched")} {format(new Date(workStatus.punchTime), "HH:mm")}
            </Text>
          )}
          {workStatus.checkOutTime && (
            <Text style={styles.historyItem}>
              {t("clockedOut")} {format(new Date(workStatus.checkOutTime), "HH:mm")}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

