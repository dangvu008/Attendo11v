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
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 10,
      marginHorizontal: 16,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    title: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    refreshButton: {
      padding: 4,
    },
    forecastContainer: {
      flex: 1,
    },
    currentWeather: {
      marginBottom: 8,
    },
    currentLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    currentDetails: {
      flexDirection: "row",
      alignItems: "center",
    },
    currentIcon: {
      fontSize: 36,
      marginRight: 8,
      color: theme.colors.primary,
    },
    currentInfo: {
      flex: 1,
    },
    currentTemp: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 2,
    },
    currentCondition: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 8,
    },
    forecastLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    hourlyContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    hourlyForecast: {
      alignItems: "center",
      width: "32%",
      paddingVertical: 4,
    },
    time: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    weatherIcon: {
      width: 40,
      height: 40,
      marginVertical: 2,
    },
    temperature: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    condition: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      height: 80,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      marginTop: 4,
      fontSize: 12,
    },
    errorContainer: {
      alignItems: "center",
      justifyContent: "center",
      height: 80,
    },
    errorText: {
      color: "#F44336",
      marginBottom: 4,
      fontSize: 12,
    },
    alertContainer: {
      backgroundColor: "#FFF3CD",
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
      borderLeftWidth: 4,
      borderLeftColor: "#FFC107",
    },
    alertTitle: {
      fontSize: 12,
      fontWeight: "bold",
      color: "#856404",
      marginBottom: 2,
    },
    alertText: {
      fontSize: 11,
      color: "#856404",
    },
    settingsButton: {
      marginTop: 8,
      alignSelf: "flex-end",
    },
    settingsText: {
      fontSize: 12,
      color: theme.colors.primary,
    },
    settingsContainer: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    settingLabel: {
      fontSize: 14,
      color: theme.colors.text,
    },
    testSoundButton: {
      backgroundColor: theme.colors.primary,
      padding: 8,
      borderRadius: 4,
      alignItems: "center",
      marginTop: 10,
    },
    testSoundText: {
      color: "#fff",
      fontSize: 12,
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
        <Text style={styles.title}>{t("weatherForecast")}</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refreshWeatherData}
        >
          <Feather name="refresh-cw" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.forecastContainer}>
        {weatherData && weatherData.length > 0 ? (
          <>
            <View style={styles.hourlyContainer}>
              {/* Current Weather - First Item */}
              <View style={[styles.hourlyForecast, { width: "32%" }]}>
                <Text style={styles.time}>{t("currentWeather")}</Text>
                <Image
                  source={getWeatherIconClass(weatherData[0].condition)}
                  style={styles.weatherIcon}
                />
                <Text style={styles.temperature}>
                  {weatherData[0].temperature}°C
                </Text>
                <Text style={styles.condition}>
                  {t(weatherData[0].condition)}
                </Text>
              </View>

              {/* Next Hours - Only show 2 */}
              {weatherData.slice(1, 3).map((item, index) => (
                <View
                  key={index}
                  style={[styles.hourlyForecast, { width: "32%" }]}
                >
                  <Text style={styles.time}>{item.time}</Text>
                  <Image
                    source={getWeatherIconClass(item.condition, item.timestamp)}
                    style={styles.weatherIcon}
                  />
                  <Text style={styles.temperature}>{item.temperature}°C</Text>
                  <Text style={styles.condition}>{t(item.condition)}</Text>
                </View>
              ))}
            </View>

            {/* Weather Alert nếu có */}
            {renderWeatherAlert()}
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t("loadingWeather")}</Text>
          </View>
        )}
      </View>

      {/* Ẩn Settings Button để thu gọn component */}
      {showSettings && (
        <View style={styles.settingsContainer}>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("enableAlerts")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("enabled")}>
              <Feather
                name={alertSettings.enabled ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("alertRain")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertRain")}>
              <Feather
                name={alertSettings.alertRain ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("alertCold")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertCold")}>
              <Feather
                name={alertSettings.alertCold ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("alertHeat")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertHeat")}>
              <Feather
                name={alertSettings.alertHeat ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t("alertStorm")}</Text>
            <TouchableOpacity onPress={() => toggleAlertSetting("alertStorm")}>
              <Feather
                name={alertSettings.alertStorm ? "check-square" : "square"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
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
              style={styles.testSoundButton}
              onPress={() => playAlarm(0.8)}
            >
              <Text style={styles.testSoundText}>{t("testSound")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
