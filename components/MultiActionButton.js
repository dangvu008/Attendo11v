/**
 * MultiActionButton - Nút Đa Năng
 *
 * Component này triển khai Nút Đa Năng với hai chế độ:
 * 1. Full: Cho phép thực hiện đầy đủ các bước: Đi Làm -> Chấm Công Vào -> (Ký Công) -> Chấm Công Ra -> Hoàn Tất
 * 2. Chỉ Đi Làm: Chỉ hiển thị và cho phép bấm nút "Đi Làm"
 */

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useWorkStatus } from "../contexts/WorkStatusContext";
import { useShift } from "../contexts/ShiftContext";
import { cancelNotificationByType } from "../utils/notificationService";
import { format } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../utils/STORAGE_KEYS";

export default function MultiActionButton() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { workStatus, updateWorkStatus, resetWorkStatus } = useWorkStatus();
  const { currentShift } = useShift();

  // Cấu hình nút
  const [showPunch, setShowPunch] = useState(false);
  const [onlyGoWorkMode, setOnlyGoWorkMode] = useState(false);
  const [actionHistory, setActionHistory] = useState([]);

  // Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const buttonRef = useRef(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          setShowPunch(currentShift?.showPunch || false);
          setOnlyGoWorkMode(parsedSettings.onlyGoWorkMode || false);
        }
      } catch (error) {
        console.error("Failed to load button settings:", error);
      }
    };

    loadSettings();
  }, [currentShift]);

  // Load action history
  useEffect(() => {
    const loadActionHistory = async () => {
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const logsKey = `${STORAGE_KEYS.WORK_LOGS_BY_DATE_PREFIX}${today}`;
        const logsJson = await AsyncStorage.getItem(logsKey);

        if (logsJson) {
          const logs = JSON.parse(logsJson);
          setActionHistory(
            logs.map((log) => ({
              action: log.type,
              timestamp: log.timestamp,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to load action history:", error);
      }
    };

    loadActionHistory();
  }, [workStatus]);

  // Animate button on press
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Get the next action based on current status
  const getNextAction = () => {
    // Nếu ở chế độ chỉ đi làm, luôn trả về go_work
    if (onlyGoWorkMode && workStatus.status !== "go_work") {
      return "go_work";
    }

    switch (workStatus.status) {
      case "idle":
        return "go_work";
      case "go_work":
        return "check_in";
      case "check_in":
        return showPunch ? "punch" : "check_out";
      case "punch":
        return "check_out";
      case "check_out":
        return "complete";
      case "complete":
        return "complete"; // No next action when complete
      default:
        return "go_work";
    }
  };

  // Handle button press
  const handleActionPress = async () => {
    if (workStatus.status === "complete") {
      return; // Do nothing if already complete
    }

    const nextAction = getNextAction();
    const timestamp = new Date();

    try {
      // Animate button
      animateButton();

      // Vibrate
      Vibration.vibrate(50);

      // Cancel notification
      await cancelNotificationByType(
        nextAction,
        format(timestamp, "yyyy-MM-dd")
      );

      // Update work status
      await updateWorkStatus(nextAction, timestamp);

      // Update action history
      setActionHistory([
        ...actionHistory,
        {
          action: nextAction,
          timestamp: timestamp.toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to process action:", error);
      Alert.alert(t("error"), t("failedToSaveWorkLog"));
    }
  };

  // Handle reset status
  const handleResetStatus = () => {
    Alert.alert(t("confirm"), t("resetStatusConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("reset"),
        style: "destructive",
        onPress: async () => {
          try {
            await resetWorkStatus();
            setActionHistory([]);
          } catch (error) {
            console.error("Failed to reset status:", error);
            Alert.alert(t("error"), t("failedToResetStatus"));
          }
        },
      },
    ]);
  };

  // Get button properties based on current status
  const getButtonColor = () => {
    switch (workStatus.status) {
      case "idle":
        return theme.colors.primary;
      case "go_work":
        return theme.colors.warning;
      case "check_in":
        return theme.colors.success;
      case "punch":
        return theme.colors.info;
      case "check_out":
        return theme.colors.info;
      case "complete":
        return theme.colors.disabled;
      default:
        return theme.colors.primary;
    }
  };

  const getButtonText = () => {
    const nextAction = getNextAction();
    switch (nextAction) {
      case "go_work":
        return t("goToWork");
      case "check_in":
        return t("clockIn");
      case "punch":
        return t("punch");
      case "check_out":
        return t("clockOut");
      case "complete":
        return t("complete");
      default:
        return t("goToWork");
    }
  };

  const getButtonIcon = () => {
    const nextAction = getNextAction();
    switch (nextAction) {
      case "go_work":
        return "walk-outline";
      case "check_in":
        return "log-in-outline";
      case "punch":
        return "create-outline";
      case "check_out":
        return "log-out-outline";
      case "complete":
        return "checkmark-done-outline";
      default:
        return "walk-outline";
    }
  };

  // Render action history
  const renderActionHistory = () => {
    if (actionHistory.length === 0) return null;

    return (
      <View style={styles.statusHistory}>
        {actionHistory.map((item, index) => {
          let actionText = "";
          switch (item.action) {
            case "go_work":
              actionText = t("goToWork");
              break;
            case "check_in":
              actionText = t("clockIn");
              break;
            case "punch":
              actionText = t("punch");
              break;
            case "check_out":
              actionText = t("clockOut");
              break;
            case "complete":
              actionText = t("complete");
              break;
          }

          const time = new Date(item.timestamp);
          const timeStr = format(time, "HH:mm:ss");

          return (
            <Text key={index} style={styles.historyItem}>
              {actionText}: {timeStr}
            </Text>
          );
        })}
      </View>
    );
  };

  // Render punch button
  const renderPunchButton = () => {
    if (!showPunch || workStatus.status !== "check_in") return null;

    return (
      <TouchableOpacity
        style={[
          styles.punchButton,
          { backgroundColor: theme.colors.secondary },
        ]}
        onPress={async () => {
          const timestamp = new Date();
          await updateWorkStatus("punch", timestamp);
          setActionHistory([
            ...actionHistory,
            {
              action: "punch",
              timestamp: timestamp.toISOString(),
            },
          ]);
        }}
      >
        <Ionicons name="create-outline" size={20} color="white" />
        <Text style={styles.punchButtonText}>{t("punch")}</Text>
      </TouchableOpacity>
    );
  };

  // Render reset button
  const renderResetButton = () => {
    // Chỉ hiển thị nút reset khi đã có ít nhất một hành động
    if (actionHistory.length === 0) return null;

    return (
      <TouchableOpacity style={styles.resetButton} onPress={handleResetStatus}>
        <Ionicons name="refresh-outline" size={16} color={theme.colors.text} />
        <Text style={styles.resetText}>{t("reset")}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[{ transform: [{ scale: scaleAnim }] }]}
        ref={buttonRef}
      >
        <TouchableOpacity
          style={[
            styles.mainButtonContainer,
            { backgroundColor: getButtonColor() },
            workStatus.status === "complete" && styles.disabledButton,
          ]}
          onPress={handleActionPress}
          disabled={workStatus.status === "complete"}
        >
          <View style={styles.mainButton}>
            <Ionicons name={getButtonIcon()} size={40} color="white" />
            <Text style={styles.buttonText}>{getButtonText()}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {renderPunchButton()}
      {renderActionHistory()}
      {renderResetButton()}
    </View>
  );
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
  punchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  punchButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  resetButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetText: {
    marginLeft: 4,
  },
  statusHistory: {
    marginTop: 16,
    alignItems: "center",
  },
  historyItem: {
    fontSize: 14,
    marginBottom: 4,
  },
});
