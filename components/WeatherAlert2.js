/**
 * WeatherAlert2 - Cảnh báo Thời tiết
 *
 * Component này hiển thị cảnh báo thời tiết với các thông tin:
 * - Loại hình thời tiết
 * - Thời gian
 * - Gợi ý
 * - Nút "Đã biết" để đóng cảnh báo
 */

import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { format } from "date-fns";
import { playAlarm, stopAlarm } from "../utils/alarmUtils";

const WeatherAlert2 = ({
  alertData,
  isVisible = false,
  onDismiss,
  playSoundAlert = true,
  vibrate = true,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  // Phát âm thanh và rung khi component hiển thị
  useEffect(() => {
    if (isVisible) {
      if (playSoundAlert) {
        playAlarm(0.8);
      }

      if (vibrate) {
        Vibration.vibrate([500, 300, 500]);
      }
    }

    return () => {
      // Dừng âm thanh khi component bị ẩn
      if (playSoundAlert) {
        stopAlarm();
      }
    };
  }, [isVisible, playSoundAlert, vibrate]);

  if (!isVisible || !alertData) return null;

  // Lấy icon dựa vào loại thời tiết
  const getWeatherIcon = () => {
    const { type } = alertData;

    switch (type) {
      case "rain":
        return (
          <Ionicons name="rainy" size={28} color={theme.colors.alertText} />
        );
      case "storm":
        return (
          <Ionicons
            name="thunderstorm"
            size={28}
            color={theme.colors.alertText}
          />
        );
      case "heat":
        return (
          <Ionicons name="sunny" size={28} color={theme.colors.alertText} />
        );
      case "cold":
        return (
          <Ionicons name="snow" size={28} color={theme.colors.alertText} />
        );
      case "wind":
        return <Feather name="wind" size={28} color={theme.colors.alertText} />;
      default:
        return (
          <Feather
            name="alert-triangle"
            size={28}
            color={theme.colors.alertText}
          />
        );
    }
  };

  // Lấy tiêu đề dựa vào loại thời tiết
  const getAlertTitle = () => {
    const { type } = alertData;

    switch (type) {
      case "rain":
        return t("rainAlert");
      case "storm":
        return t("stormAlert");
      case "heat":
        return t("heatAlert");
      case "cold":
        return t("coldAlert");
      case "wind":
        return t("windAlert");
      default:
        return t("weatherAlert");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.alertBackground },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>{getWeatherIcon()}</View>
        <View style={styles.messageContainer}>
          <Text style={[styles.title, { color: theme.colors.alertText }]}>
            {getAlertTitle()}
          </Text>
          <Text style={[styles.time, { color: theme.colors.alertText }]}>
            {alertData.time
              ? format(new Date(alertData.time), "HH:mm, dd/MM/yyyy")
              : ""}
          </Text>
          <Text style={[styles.message, { color: theme.colors.alertText }]}>
            {alertData.message}
          </Text>
          {alertData.suggestion && (
            <Text
              style={[styles.suggestion, { color: theme.colors.alertText }]}
            >
              <Text style={styles.suggestionLabel}>{t("suggestion")}: </Text>
              {alertData.suggestion}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Text
          style={[styles.dismissText, { color: theme.colors.alertDismiss }]}
        >
          {t("understood")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  content: {
    flexDirection: "row",
    padding: 16,
  },
  iconContainer: {
    marginRight: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  messageContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
  },
  message: {
    fontSize: 16,
    marginBottom: 8,
  },
  suggestion: {
    fontSize: 14,
    fontStyle: "italic",
  },
  suggestionLabel: {
    fontWeight: "bold",
  },
  dismissButton: {
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  dismissText: {
    fontWeight: "bold",
  },
});

export default WeatherAlert2;