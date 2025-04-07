"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Alert } from "react-native"
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
  const [expanded, setExpanded] = useState(false)
  const [animation] = useState(new Animated.Value(0))
  const [isMultiAction, setIsMultiAction] = useState(true)
  const actionButtonRef = useRef(null)

  // Lấy cài đặt chế độ nút từ AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem("attendo_user_settings")
        if (settings) {
          const parsedSettings = JSON.parse(settings)
          setIsMultiAction(!parsedSettings.onlyGoWorkMode)
        }
      } catch (error) {
        console.error("Failed to load button mode settings:", error)
      }
    }

    loadSettings()
  }, [])

  const toggleExpand = () => {
    if (workStatus.status === "idle" || !isMultiAction) {
      // Nếu idle hoặc chế độ chỉ Đi Làm, thực hiện hành động Đi Làm ngay
      handleActionPress("go_work")
    } else {
      // Mở rộng hiển thị các tùy chọn
      setExpanded(!expanded)
      Animated.timing(animation, {
        toValue: expanded ? 0 : 1,
        duration: 300,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: false,
      }).start()
    }
  }

  // Trong hàm handleActionPress, thêm kiểm tra chế độ nút
  const handleActionPress = async (action) => {
    const timestamp = new Date()
    const today = format(timestamp, "yyyy-MM-dd")

    try {
      // Hủy thông báo tương ứng
      await cancelNotificationByType(action, today)

      // Kiểm tra xem có phải chế độ chỉ có nút "Đi làm" không
      if (!isMultiAction && action === "go_work") {
        // Nếu là chế độ chỉ có nút "Đi làm", thì cập nhật trạng thái thành "complete" luôn
        await updateWorkStatus("complete", timestamp)
      } else {
        // Cập nhật trạng thái bình thường
        await updateWorkStatus(action, timestamp)
      }

      // Thu gọn menu nếu đang mở rộng
      if (expanded) {
        setExpanded(false)
        animation.setValue(0)
      }

      // Hiệu ứng phản hồi
      if (actionButtonRef.current) {
        actionButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
          // Tạo hiệu ứng ripple hoặc flash
        })
      }
    } catch (error) {
      console.error("Failed to process action:", error)
      Alert.alert(t("error"), t("failedToSaveWorkLog"))
    }
  }

  const handleResetStatus = () => {
    Alert.alert(t("confirm"), t("resetStatusConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("reset"),
        onPress: async () => {
          await resetWorkStatus()
        },
      },
    ])
  }

  const getButtonColor = () => {
    switch (workStatus.status) {
      case "go_work":
        return theme.colors.warning
      case "check_in":
        return theme.colors.success
      case "check_out":
      case "punch":
        return theme.colors.info
      case "complete":
        return theme.colors.primary
      default:
        return theme.colors.primary
    }
  }

  const getButtonText = () => {
    switch (workStatus.status) {
      case "go_work":
        return t("clockIn")
      case "check_in":
        return t("clockOut")
      case "check_out":
      case "punch":
        return t("complete")
      case "complete":
        return t("completed")
      default:
        return t("goToWork")
    }
  }

  const getButtonIcon = () => {
    switch (workStatus.status) {
      case "go_work":
        return "enter-outline"
      case "check_in":
        return "exit-outline"
      case "check_out":
      case "punch":
        return "checkmark-circle-outline"
      case "complete":
        return "checkmark-done-outline"
      default:
        return "briefcase-outline"
    }
  }

  const getNextAction = () => {
    switch (workStatus.status) {
      case "go_work":
        return "check_in"
      case "check_in":
        return currentShift?.showPunch ? "punch" : "check_out"
      case "punch":
        return "check_out"
      case "check_out":
        return "complete"
      default:
        return "go_work"
    }
  }

  const isButtonDisabled = () => {
    return workStatus.status === "complete"
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
    optionsContainer: {
      position: "absolute",
      width: 240,
      height: 240,
      borderRadius: 120,
      justifyContent: "center",
      alignItems: "center",
    },
    optionButton: {
      position: "absolute",
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    optionText: {
      position: "absolute",
      backgroundColor: theme.colors.card,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      fontSize: 12,
      color: theme.colors.text,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
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
    punchButton: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.info,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    punchButtonText: {
      color: "white",
      fontWeight: "bold",
      marginLeft: 8,
    },
    statusText: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
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
  })

  // Tính toán vị trí cho các nút tùy chọn
  const goToWorkPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "10%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "50%"],
    }),
    transform: [
      { translateX: -30 },
      { translateY: -30 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  }

  const checkInPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "25%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "85%"],
    }),
    transform: [
      { translateX: -30 },
      { translateY: -30 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  }

  const checkOutPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "75%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "85%"],
    }),
    transform: [
      { translateX: -30 },
      { translateY: -30 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  }

  const punchPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "50%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "90%"],
    }),
    transform: [
      { translateX: -30 },
      { translateY: -30 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  }

  const resetPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "90%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "50%"],
    }),
    transform: [
      { translateX: -30 },
      { translateY: -30 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  }

  // Vị trí cho text
  const goToWorkTextPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "5%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "50%"],
    }),
    transform: [
      { translateX: -40 },
      { translateY: -50 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
    opacity: animation,
  }

  const checkInTextPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "25%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "85%"],
    }),
    transform: [
      { translateX: -40 },
      { translateY: -50 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
    opacity: animation,
  }

  const checkOutTextPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "75%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "85%"],
    }),
    transform: [
      { translateX: -40 },
      { translateY: -50 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
    opacity: animation,
  }

  const punchTextPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "50%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "90%"],
    }),
    transform: [
      { translateX: -40 },
      { translateY: -50 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
    opacity: animation,
  }

  const resetTextPosition = {
    top: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "90%"],
    }),
    left: animation.interpolate({
      inputRange: [0, 1],
      outputRange: ["50%", "50%"],
    }),
    transform: [
      { translateX: -40 },
      { translateY: -50 },
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
    opacity: animation,
  }

  return (
    <View style={styles.container}>
      {/* Nút tùy chọn khi mở rộng */}
      {isMultiAction && workStatus.status !== "idle" && (
        <Animated.View style={styles.optionsContainer}>
          {/* Nút Đi Làm */}
          <Animated.View style={[styles.optionButton, goToWorkPosition]}>
            <TouchableOpacity
              style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
              onPress={() => handleActionPress("go_work")}
            >
              <Ionicons name="briefcase-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.Text style={[styles.optionText, goToWorkTextPosition]}>{t("goToWork")}</Animated.Text>

          {/* Nút Chấm Công Vào */}
          <Animated.View style={[styles.optionButton, checkInPosition]}>
            <TouchableOpacity
              style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
              onPress={() => handleActionPress("check_in")}
            >
              <Ionicons name="enter-outline" size={24} color={theme.colors.warning} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.Text style={[styles.optionText, checkInTextPosition]}>{t("clockIn")}</Animated.Text>

          {/* Nút Chấm Công Ra */}
          <Animated.View style={[styles.optionButton, checkOutPosition]}>
            <TouchableOpacity
              style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
              onPress={() => handleActionPress("check_out")}
            >
              <Ionicons name="exit-outline" size={24} color={theme.colors.success} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.Text style={[styles.optionText, checkOutTextPosition]}>{t("clockOut")}</Animated.Text>

          {/* Nút Ký Công (nếu showPunch = true) */}
          {currentShift?.showPunch && (
            <>
              <Animated.View style={[styles.optionButton, punchPosition]}>
                <TouchableOpacity
                  style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
                  onPress={() => handleActionPress("punch")}
                >
                  <Ionicons name="create-outline" size={24} color={theme.colors.info} />
                </TouchableOpacity>
              </Animated.View>
              <Animated.Text style={[styles.optionText, punchTextPosition]}>{t("punch")}</Animated.Text>
            </>
          )}

          {/* Nút Reset */}
          <Animated.View style={[styles.optionButton, resetPosition]}>
            <TouchableOpacity
              style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}
              onPress={handleResetStatus}
            >
              <Ionicons name="refresh-outline" size={24} color={theme.colors.danger} />
            </TouchableOpacity>
          </Animated.View>
          <Animated.Text style={[styles.optionText, resetTextPosition]}>{t("reset")}</Animated.Text>
        </Animated.View>
      )}

      {/* Nút chính */}
      <View style={styles.mainButtonContainer}>
        <TouchableOpacity
          ref={actionButtonRef}
          style={[styles.mainButton, isButtonDisabled() && styles.disabledButton]}
          onPress={toggleExpand}
          disabled={isButtonDisabled()}
        >
          <Ionicons name={getButtonIcon()} size={32} color="white" />
          <Text style={styles.buttonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>

      {/* Nút Ký Công (hiển thị riêng khi ở trạng thái check_in và showPunch = true) */}
      {workStatus.status === "check_in" && currentShift?.showPunch && !expanded && (
        <TouchableOpacity style={styles.punchButton} onPress={() => handleActionPress("punch")}>
          <Ionicons name="create-outline" size={20} color="white" />
          <Text style={styles.punchButtonText}>{t("punch")}</Text>
        </TouchableOpacity>
      )}

      {/* Nút Reset (hiển thị khi không mở rộng và đã bấm ít nhất 1 lần) */}
      {workStatus.status !== "idle" && !expanded && (
        <TouchableOpacity style={styles.resetButton} onPress={handleResetStatus}>
          <Ionicons name="refresh-outline" size={16} color={theme.colors.text} />
          <Text style={styles.resetText}>{t("reset")}</Text>
        </TouchableOpacity>
      )}

      {/* Lịch sử bấm nút trong ngày */}
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

