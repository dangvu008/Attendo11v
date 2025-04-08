"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { getWeatherSettings, saveWeatherSettings } from "../utils/database";
import { fetchWeatherData } from "../utils/weatherService";
import { weatherIcons } from "../assets/weather";
import {
  ALARM_SOUND_AVAILABLE,
  playAlarm,
  stopAlarm,
} from "../assets/sounds/alarm";

export default function WeatherForecast() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();

  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConditions, setAlertConditions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    alertRain: true,
    alertCold: true,
    alertHeat: true,
    alertStorm: true,
    soundEnabled: true,
  });
  const [location, setLocation] = useState(null);

  const soundRef = useRef(null);

  const loadWeatherData = useCallback(
    async (locationData) => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchWeatherData(
          locationData?.coords.latitude,
          locationData?.coords.longitude
        );
        setWeatherData(data);
      } catch (error) {
        console.error("Failed to load weather data:", error);
        setError(t("weatherLoadError"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const initWeatherData = useCallback(async () => {
    try {
      // Kiểm tra quyền truy cập vị trí
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(t("locationPermissionDenied"));
        setLoading(false);
        return;
      }

      // Lấy vị trí hiện tại
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // Lấy dữ liệu thời tiết
      await loadWeatherData(location);
    } catch (error) {
      console.error("Failed to initialize weather data:", error);
      setError(t("weatherInitError"));
      setLoading(false);
    }
  }, [loadWeatherData, t]);

  const loadAlertSettings = async () => {
    try {
      const settings = await getWeatherSettings();
      if (settings) {
        setAlertSettings(settings);
      }
    } catch (error) {
      console.error("Failed to load weather settings:", error);
    }
  };

  const refreshWeatherData = useCallback(async () => {
    if (location) {
      await loadWeatherData(location);
    } else {
      await initWeatherData();
    }
  }, [location, loadWeatherData, initWeatherData]);

  const parseTimeString = useCallback((timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  const isWithinHour = useCallback((currentTime, targetTime) => {
    const diff = Math.abs(currentTime - targetTime);
    return diff <= 60 * 60 * 1000; // 1 giờ tính bằng mili giây
  }, []);

  const checkExtremeWeather = useCallback(() => {
    if (!weatherData || !alertSettings.enabled || !currentShift) return;

    const now = new Date();
    const departureTime = parseTimeString(currentShift.departureTime);
    const endTime = parseTimeString(currentShift.endTime);

    // Kiểm tra nếu đang trong khoảng 1 giờ trước giờ đi làm hoặc tan làm
    const isNearDeparture = isWithinHour(now, departureTime);
    const isNearEndTime = isWithinHour(now, endTime);

    if (!isNearDeparture && !isNearEndTime) return;

    // Kiểm tra các điều kiện cực đoan
    const extremeConditions = [];

    // Kiểm tra mưa to
    if (
      alertSettings.alertRain &&
      weatherData.some(
        (item) => item.condition.includes("rain") && item.intensity === "heavy"
      )
    ) {
      extremeConditions.push(t("heavyRain"));
    }

    // Kiểm tra thời tiết lạnh
    if (
      alertSettings.alertCold &&
      weatherData.some((item) => item.temperature < 10)
    ) {
      extremeConditions.push(t("coldWeather"));
    }

    // Kiểm tra thời tiết nóng
    if (
      alertSettings.alertHeat &&
      weatherData.some((item) => item.temperature > 35)
    ) {
      extremeConditions.push(t("hotWeather"));
    }

    // Kiểm tra bão
    if (
      alertSettings.alertStorm &&
      weatherData.some(
        (item) =>
          item.condition.includes("storm") || item.condition.includes("thunder")
      )
    ) {
      extremeConditions.push(t("stormWarning"));
    }

    if (extremeConditions.length > 0) {
      setAlertConditions(extremeConditions);
      setShowAlert(true);

      // Phát âm thanh chuông khi có cảnh báo
      if (alertSettings.soundEnabled && ALARM_SOUND_AVAILABLE) {
        playAlarm();
      }
    } else {
      setShowAlert(false);

      // Dừng âm thanh nếu không còn cảnh báo
      stopAlarm();
    }
  }, [
    weatherData,
    alertSettings,
    currentShift,
    parseTimeString,
    isWithinHour,
    t,
  ]);

  const toggleAlertSetting = async (setting) => {
    const newSettings = {
      ...alertSettings,
      [setting]: !alertSettings[setting],
    };
    setAlertSettings(newSettings);

    try {
      await saveWeatherSettings(newSettings);
    } catch (error) {
      console.error("Failed to save weather settings:", error);
      Alert.alert(t("error"), t("failedToSaveSettings"));
    }
  };

  useEffect(() => {
    // Lấy vị trí và dữ liệu thời tiết khi component mount
    initWeatherData();

    // Lấy cài đặt cảnh báo thời tiết
    loadAlertSettings();

    // Thiết lập cập nhật định kỳ (30 phút)
    const refreshInterval = setInterval(() => {
      refreshWeatherData();
    }, 30 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, [initWeatherData, refreshWeatherData]);

  // Kiểm tra điều kiện thời tiết cực đoan khi dữ liệu thời tiết hoặc ca làm việc thay đổi
  useEffect(() => {
    if (weatherData && alertSettings.enabled && currentShift) {
      checkExtremeWeather();
    }
  }, [weatherData, alertSettings, currentShift, checkExtremeWeather]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      // Dừng và giải phóng âm thanh khi component unmount
      stopAlarm();
    };
  }, []);

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    refreshButton: {
      padding: 8,
    },
    weatherGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    weatherItem: {
      width: "30%",
      alignItems: "center",
      marginBottom: 16,
    },
    weatherIcon: {
      width: 40,
      height: 40,
      marginBottom: 8,
    },
    weatherTemp: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    weatherTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    loadingContainer: {
      padding: 32,
      alignItems: "center",
    },
    errorContainer: {
      padding: 16,
      alignItems: "center",
    },
    errorText: {
      color: theme.colors.error,
      textAlign: "center",
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    retryText: {
      color: "white",
      fontWeight: "bold",
    },
    alertContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.error,
      padding: 16,
      zIndex: 1000,
    },
    alertTitle: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 8,
    },
    alertText: {
      color: "white",
      marginBottom: 4,
    },
    settingsContainer: {
      backgroundColor: theme.colors.card,
      padding: 16,
      borderRadius: 12,
    },
    settingsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    settingLabel: {
      fontSize: 16,
      color: theme.colors.text,
    },
  });

  const renderWeatherAlert = () => {
    if (!showAlert || alertConditions.length === 0) return null;

    return (
      <View style={styles.alertContainer}>
        <Text style={styles.alertTitle}>{t("weatherAlert")}</Text>
        <Text style={styles.alertText}>
          {alertConditions.join(", ")}. {t("prepareAccordingly")}
        </Text>
      </View>
    );
  };

  // Chuyển đổi condition sang weather icon và xác định thời gian trong ngày
  const getWeatherIconClass = (condition, time = null) => {
    // Kiểm tra xem hiện tại là ngày hay đêm dựa vào thời gian được truyền vào
    const currentHour = time
      ? new Date(time).getHours()
      : new Date().getHours();
    const isDay = currentHour >= 6 && currentHour < 18; // Từ 6h sáng đến 6h tối là ban ngày
    const timeOfDay = isDay ? "day" : "night";

    // Map điều kiện thời tiết sang tên icon
    let iconName = "";
    switch (condition) {
      case "clear":
        iconName = `clear-${timeOfDay}`;
        break;
      case "partly-cloudy":
        iconName = `partly-cloudy-${timeOfDay}`;
        break;
      case "cloudy":
        iconName = `cloudy-${timeOfDay}`;
        break;
      case "rain":
        iconName = `rain-${timeOfDay}`;
        break;
      case "heavy-rain":
        iconName = `heavy-rain-${timeOfDay}`;
        break;
      case "thunderstorm":
        iconName = `thunderstorm-${timeOfDay}`;
        break;
      case "snow":
        iconName = `snow-${timeOfDay}`;
        break;
      case "fog":
        iconName = `fog-${timeOfDay}`;
        break;
      default:
        // Fallback to generic day icon if condition is not recognized
        return weatherIcons[`partly-cloudy-${timeOfDay}`];
    }

    // Trả về icon tương ứng nếu có, ngược lại trả về icon generic
    return (
      weatherIcons[iconName] ||
      weatherIcons[condition] ||
      weatherIcons[`partly-cloudy-${timeOfDay}`]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={refreshWeatherData}>
          <Feather name="refresh-cw" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("next3Hours")}</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshWeatherData}
        >
          <Feather name="refresh-cw" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weatherGrid}>
        {weatherData && weatherData.length > 0 ? (
          // Chỉ hiển thị 3 giờ tiếp theo
          weatherData.slice(0, 3).map((item, index) => (
            <View key={index} style={styles.weatherItem}>
              <Text style={styles.weatherTime}>{item.time}</Text>
              <Image
                source={getWeatherIconClass(item.condition, item.timestamp)}
                style={styles.weatherIcon}
                resizeMode="contain"
              />
              <Text style={styles.weatherTemp}>{item.temperature}°C</Text>
              <Text style={styles.weatherTime}>{t(item.condition)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.errorText}>{t("loadingWeather")}</Text>
          </View>
        )}
      </View>

      {/* Weather Alert nếu có */}
      {renderWeatherAlert()}

      {/* Ẩn Settings Button để thu gọn component */}
      {showSettings && (
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>{t("weatherSettings")}</Text>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t("enableAlerts")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("enabled")}>
              <Feather
                name={alertSettings.enabled ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t("alertRain")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertRain")}>
              <Feather
                name={alertSettings.alertRain ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t("alertCold")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertCold")}>
              <Feather
                name={alertSettings.alertCold ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t("alertHeat")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertHeat")}>
              <Feather
                name={alertSettings.alertHeat ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t("alertStorm")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertStorm")}>
              <Feather
                name={alertSettings.alertStorm ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>{t("soundEnabled")}</Text>
            <TouchableOpacity
              onPress={() => toggleAlertSetting("soundEnabled")}
            >
              <Feather
                name={alertSettings.soundEnabled ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Nút để test âm thanh */}
          {alertSettings.soundEnabled && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => playAlarm(0.8)}
            >
              <Text style={styles.retryText}>{t("testSound")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
