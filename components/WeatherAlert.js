import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { Audio } from "expo-av";
import {
  ALARM_SOUND,
  ALARM_SOUND_AVAILABLE,
  playAlarm,
  stopAlarm,
} from "../assets/sounds/alarm";

const WeatherAlert = ({
  alertMessage,
  isVisible = false,
  onDismiss,
  playSoundAlert = true,
}) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  // Phát âm thanh cảnh báo khi component hiển thị
  React.useEffect(() => {
    if (isVisible && playSoundAlert && ALARM_SOUND_AVAILABLE) {
      playAlarm(0.8);
    }

    return () => {
      // Dừng âm thanh khi component bị ẩn
      if (playSoundAlert) {
        stopAlarm();
      }
    };
  }, [isVisible, playSoundAlert]);

  if (!isVisible || !alertMessage) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.alertBackground },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather
            name="alert-triangle"
            size={24}
            color={theme.colors.alertText}
          />
        </View>
        <View style={styles.messageContainer}>
          <Text style={[styles.title, { color: theme.colors.alertText }]}>
            {t("weatherAlert")}
          </Text>
          <Text style={[styles.message, { color: theme.colors.alertText }]}>
            {alertMessage}
          </Text>
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
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  content: {
    flexDirection: "row",
    padding: 12,
  },
  iconContainer: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 4,
  },
  messageContainer: {
    flex: 1,
  },
  title: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  dismissText: {
    fontWeight: "bold",
  },
});

export default WeatherAlert;
