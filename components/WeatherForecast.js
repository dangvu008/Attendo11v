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
  RefreshControl,
  ScrollView,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { getWeatherSettings, saveWeatherSettings } from "../utils/database";
import {
  fetchWeatherData,
  getWeatherIcon,
  generateMockWeatherData,
  getCurrentLocation,
  getCityFromCoordinates,
  generateWeatherAlerts,
} from "../utils/weatherService";

export default function WeatherForecast() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();

  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    alertRain: true,
    alertCold: true,
    alertHeat: true,
    alertStorm: true,
  });
  const [location, setLocation] = useState(null);
  const [cityName, setCityName] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const checkWeatherAlerts = useCallback(() => {
    if (!weatherData || !currentShift || !alertSettings.enabled) {
      setWeatherAlerts([]);
      setShowAlert(false);
      return;
    }

    // Generate alerts based on shift times and weather data
    const alerts = generateWeatherAlerts(weatherData, currentShift);

    // Filter alerts based on user settings
    const filteredAlerts = alerts.filter((alert) => {
      const { type } = alert.condition;

      if (type === "rain" && !alertSettings.alertRain) return false;
      if (type === "cold" && !alertSettings.alertCold) return false;
      if (type === "hot" && !alertSettings.alertHeat) return false;
      if ((type === "storm" || type === "wind") && !alertSettings.alertStorm)
        return false;

      return true;
    });

    setWeatherAlerts(filteredAlerts);
    setShowAlert(filteredAlerts.length > 0);
  }, [weatherData, currentShift, alertSettings]);

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
      checkWeatherAlerts();
    }
  }, [weatherData, currentShift, alertSettings, checkWeatherAlerts]);

  const initWeatherData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get user's location
      const userLocation = await getCurrentLocation();
      setLocation(userLocation);

      // Get city name
      const city = await getCityFromCoordinates(
        userLocation.latitude,
        userLocation.longitude
      );
      setCityName(city);

      // Fetch weather data
      await loadWeatherData(userLocation);
    } catch (error) {
      console.error("Failed to initialize weather data:", error);

      if (error.message === "Location permission denied") {
        setError(t("locationPermissionDenied"));
      } else {
        setError(t("weatherInitError"));
      }

      // Fall back to mock data
      setWeatherData(generateMockWeatherData());
    } finally {
      setLoading(false);
    }
  }, [
    t,
    loadWeatherData,
    setLoading,
    setError,
    setLocation,
    setCityName,
    setWeatherData,
  ]);

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

      if (!locationData) {
        throw new Error("No location data available");
      }

      const data = await fetchWeatherData(
        locationData.latitude,
        locationData.longitude
      );
      setWeatherData(data);
    } catch (error) {
      console.error("Failed to load weather data:", error);
      setError(t("weatherLoadError"));

      // Fall back to mock data
      setWeatherData(generateMockWeatherData());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshWeatherData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Get fresh location data
      const userLocation = await getCurrentLocation();
      setLocation(userLocation);

      // Update city name if location has changed significantly
      if (
        !location ||
        Math.abs(location.latitude - userLocation.latitude) > 0.01 ||
        Math.abs(location.longitude - userLocation.longitude) > 0.01
      ) {
        const city = await getCityFromCoordinates(
          userLocation.latitude,
          userLocation.longitude
        );
        setCityName(city);
      }

      await loadWeatherData(userLocation);
    } catch (error) {
      console.error("Failed to refresh weather data:", error);
      setError(t("weatherLoadError"));
      setRefreshing(false);
    }
  }, [
    location,
    t,
    loadWeatherData,
    setLocation,
    setCityName,
    setError,
    setRefreshing,
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
    titleContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginLeft: 8,
    },
    locationText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    refreshButton: {
      padding: 4,
    },
    forecastContainer: {
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
    alertItem: {
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: "rgba(133, 100, 4, 0.2)",
    },
    alertItemLast: {
      marginBottom: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
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
    detailsContainer: {
      marginTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: 12,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    expandButton: {
      alignItems: "center",
      marginTop: 8,
    },
    expandButtonText: {
      fontSize: 12,
      color: theme.colors.primary,
    },
  });

  const renderWeatherAlerts = () => {
    if (!showAlert || weatherAlerts.length === 0) return null;

    return (
      <View style={styles.alertContainer}>
        <Text style={styles.alertTitle}>{t("weatherAlert")}</Text>

        {weatherAlerts.map((alert, index) => {
          const isLast = index === weatherAlerts.length - 1;
          const timeLabel =
            alert.time === "departure" ? t("departureTime") : t("endTime");

          return (
            <View
              key={index}
              style={[styles.alertItem, isLast && styles.alertItemLast]}
            >
              <Text style={styles.alertText}>
                <Text style={{ fontWeight: "bold" }}>
                  {timeLabel} ({alert.formattedTime})
                </Text>
                : {alert.condition.description}, {alert.condition.suggestion}.
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderWeatherDetails = (item) => {
    if (!expanded || !item) return null;

    return (
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("description")}</Text>
          <Text style={styles.detailValue}>{item.description}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("humidity")}</Text>
          <Text style={styles.detailValue}>{item.humidity}%</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{t("windSpeed")}</Text>
          <Text style={styles.detailValue}>{item.windSpeed} m/s</Text>
        </View>
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
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshWeatherData}
        />
      }
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{t("weatherForecast")}</Text>
            {cityName && (
              <View style={styles.locationContainer}>
                <Ionicons
                  name="location"
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={styles.locationText}>{cityName}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshWeatherData}
          >
            <Feather name="refresh-cw" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.forecastContainer}>
          {weatherData &&
            weatherData.slice(0, 3).map((item, index) => (
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

        {weatherData &&
          weatherData.length > 0 &&
          renderWeatherDetails(weatherData[0])}

        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? t("hideDetails") : t("showDetails")}
          </Text>
        </TouchableOpacity>

        {renderWeatherAlerts()}

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
              <TouchableOpacity
                onPress={() => toggleAlertSetting("alertStorm")}
              >
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
    </ScrollView>
  );
}
