"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { getWeatherSettings, saveWeatherSettings } from "../utils/database";
import { fetchWeatherData, getWeatherIcon } from "../utils/weatherService";

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
  });
  const [location, setLocation] = useState(null);

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
  }, [weatherData, currentShift, alertSettings.enabled, checkExtremeWeather]);

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
  }, [t, loadWeatherData]);

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

  const loadWeatherData = async (locationData) => {
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
  };

  const parseTimeString = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const isWithinHour = (currentTime, targetTime) => {
    const diff = Math.abs(currentTime - targetTime);
    return diff <= 60 * 60 * 1000; // 1 giờ tính bằng mili giây
  };

  const refreshWeatherData = useCallback(async () => {
    if (location) {
      await loadWeatherData(location);
    } else {
      await initWeatherData();
    }
  }, [location, loadWeatherData, initWeatherData]);

  const checkExtremeWeather = useCallback(() => {
    if (!weatherData || !currentShift) return;

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
    } else {
      setShowAlert(false);
    }
  }, [
    weatherData,
    currentShift,
    alertSettings,
    t,
    parseTimeString,
    isWithinHour,
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

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 16,
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
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
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
      marginBottom: 12,
    },
    currentLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    currentDetails: {
      flexDirection: "row",
      alignItems: "center",
    },
    currentIcon: {
      width: 60,
      height: 60,
      marginRight: 16,
    },
    currentInfo: {
      flex: 1,
    },
    currentTemp: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    currentCondition: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 12,
    },
    forecastLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    hourlyContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    hourlyForecast: {
      alignItems: "center",
      flex: 1,
    },
    time: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    weatherIcon: {
      width: 40,
      height: 40,
      marginVertical: 8,
    },
    temperature: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    condition: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      height: 120,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
    errorContainer: {
      alignItems: "center",
      justifyContent: "center",
      height: 120,
    },
    errorText: {
      color: "#F44336",
      marginBottom: 8,
    },
    alertContainer: {
      backgroundColor: "#FFF3CD",
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#FFC107",
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#856404",
      marginBottom: 4,
    },
    alertText: {
      fontSize: 14,
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
          <Feather name="refresh-cw" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.forecastContainer}>
        {weatherData && weatherData.length > 0 ? (
          <>
            <View style={styles.currentWeather}>
              <Text style={styles.currentLabel}>{t("currentWeather")}</Text>
              <View style={styles.currentDetails}>
                <Image
                  source={getWeatherIcon(weatherData[0].condition)}
                  style={styles.currentIcon}
                />
                <View style={styles.currentInfo}>
                  <Text style={styles.currentTemp}>
                    {weatherData[0].temperature}°C
                  </Text>
                  <Text style={styles.currentCondition}>
                    {t(weatherData[0].condition)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.forecastLabel}>{t("next3Hours")}</Text>
            <View style={styles.hourlyContainer}>
              {weatherData.map((item, index) => (
                <View key={index} style={styles.hourlyForecast}>
                  <Text style={styles.time}>{item.time}</Text>
                  <Image
                    source={getWeatherIcon(item.condition)}
                    style={styles.weatherIcon}
                  />
                  <Text style={styles.temperature}>{item.temperature}°C</Text>
                  <Text style={styles.condition}>{t(item.condition)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t("loadingWeather")}</Text>
          </View>
        )}
      </View>

      {renderWeatherAlert()}

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowSettings(!showSettings)}
      >
        <Text style={styles.settingsText}>
          {showSettings ? t("hideSettings") : t("showSettings")}
        </Text>
      </TouchableOpacity>

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
        </View>
      )}
    </View>
  );
}
