import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import {
  fetchWeatherData,
  getForecastForTime,
  checkExtremeWeatherConditions,
  generateWeatherAlertMessage,
} from "../utils/weatherService";
import {
  getWeatherSettings,
  saveWeatherAlertRecord,
  hasShiftBeenAlerted,
  cleanupOldAlerts,
} from "../utils/database";
import { useI18n } from "./I18nContext";
import { useShift } from "./ShiftContext";
import { sendWeatherAlert } from "../utils/notificationService";
import * as Location from "expo-location";

// Tạo context
const WeatherContext = createContext();

export const WeatherProvider = ({ children }) => {
  const { t } = useI18n();
  const { currentShift, activeShift } = useShift();

  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    alertRain: true,
    alertCold: true,
    alertHeat: true,
    alertStorm: true,
    soundEnabled: true,
  });
  const [location, setLocation] = useState(null);
  const [weatherAlertMessage, setWeatherAlertMessage] = useState("");
  const [showWeatherAlert, setShowWeatherAlert] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);

  // Làm sạch cảnh báo cũ khi khởi động
  useEffect(() => {
    cleanupOldAlerts();
  }, []);

  // Tải cài đặt cảnh báo thời tiết
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getWeatherSettings();
        if (settings) {
          setAlertSettings(settings);
        }
      } catch (error) {
        console.error("Failed to load weather settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Khởi tạo và cập nhật dữ liệu thời tiết
  const initWeatherData = useCallback(async () => {
    try {
      // Kiểm tra quyền truy cập vị trí
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Cần quyền truy cập vị trí để lấy dữ liệu thời tiết");
        setLoading(false);
        return;
      }

      // Lấy vị trí hiện tại
      const location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      // Lấy dữ liệu thời tiết
      await refreshWeatherData(location);
    } catch (error) {
      console.error("Lỗi khởi tạo dữ liệu thời tiết:", error);
      setError("Không thể lấy dữ liệu thời tiết");
      setLoading(false);
    }
  }, [refreshWeatherData]);

  // Cập nhật dữ liệu thời tiết
  const refreshWeatherData = useCallback(
    async (locationData = location) => {
      if (!locationData) return;

      try {
        setLoading(true);
        setError(null);

        const data = await fetchWeatherData(
          locationData.coords.latitude,
          locationData.coords.longitude
        );

        setWeatherData(data);
        setLoading(false);

        // Kiểm tra điều kiện thời tiết cho ca làm việc
        if (activeShift) {
          checkWeatherForActiveShift(data, activeShift);
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu thời tiết:", error);
        setError("Không thể lấy dữ liệu thời tiết");
        setLoading(false);
      }
    },
    [location, activeShift, checkWeatherForActiveShift]
  );

  // Kiểm tra thời tiết cho ca làm việc hiện tại
  const checkWeatherForActiveShift = useCallback(
    async (weatherData, shift) => {
      if (!weatherData || !shift || !alertSettings.enabled) return;

      try {
        // Kiểm tra xem ca làm việc này đã được cảnh báo chưa
        const alreadyAlerted = await hasShiftBeenAlerted(
          shift.date,
          shift.departureTime
        );
        if (alreadyAlerted) return;

        // Tính toán thời gian đi làm và tan làm
        const departureTime = new Date(shift.date);
        const [depHours, depMinutes] = shift.departureTime
          .split(":")
          .map(Number);
        departureTime.setHours(depHours, depMinutes, 0, 0);

        const returnTime = new Date(shift.date);
        const [retHours, retMinutes] = shift.endTime.split(":").map(Number);

        // Xử lý ca qua đêm
        if (
          retHours < depHours ||
          (retHours === depHours && retMinutes < depMinutes)
        ) {
          returnTime.setDate(returnTime.getDate() + 1);
        }
        returnTime.setHours(retHours, retMinutes, 0, 0);

        // Lấy dự báo thời tiết cho thời điểm đi làm và tan làm
        const departureForecast = getForecastForTime(
          weatherData,
          departureTime
        );
        const returnForecast = getForecastForTime(weatherData, returnTime);

        // Kiểm tra các điều kiện thời tiết cực đoan
        const departureConditions = checkExtremeWeatherConditions(
          departureForecast,
          alertSettings
        );
        const returnConditions = checkExtremeWeatherConditions(
          returnForecast,
          alertSettings
        );

        // Nếu có điều kiện cực đoan, tạo thông báo cảnh báo
        if (departureConditions.length > 0 || returnConditions.length > 0) {
          // Tạo thông điệp cảnh báo tổng hợp
          const alertMessage = generateWeatherAlertMessage(
            departureConditions,
            returnConditions,
            departureTime,
            returnTime,
            t
          );

          if (alertMessage) {
            setWeatherAlertMessage(alertMessage);
            setShowWeatherAlert(true);

            // Gửi thông báo
            const notificationId = await sendWeatherAlert(
              alertMessage,
              departureTime
            );
            if (notificationId) {
              setLastNotificationId(notificationId);
            }

            // Lưu lại bản ghi đã cảnh báo
            await saveWeatherAlertRecord(shift.date, shift.departureTime);
          }
        }
      } catch (error) {
        console.error("Lỗi kiểm tra thời tiết cho ca làm việc:", error);
      }
    },
    [
      alertSettings.enabled,
      t,
      hasShiftBeenAlerted,
      saveWeatherAlertRecord,
      sendWeatherAlert,
      generateWeatherAlertMessage,
      checkExtremeWeatherConditions,
      getForecastForTime,
    ]
  );

  // Xử lý khi người dùng đóng cảnh báo
  const dismissWeatherAlert = () => {
    setShowWeatherAlert(false);
    setWeatherAlertMessage("");
  };

  // Tự động cập nhật dữ liệu thời tiết mỗi 30 phút
  useEffect(() => {
    if (location) {
      refreshWeatherData();
    } else {
      initWeatherData();
    }

    const interval = setInterval(() => {
      if (location) {
        refreshWeatherData();
      } else {
        initWeatherData();
      }
    }, 30 * 60 * 1000); // 30 phút

    return () => clearInterval(interval);
  }, [location, refreshWeatherData, initWeatherData]);

  // Kiểm tra thời tiết cho ca làm việc hiện tại
  useEffect(() => {
    if (weatherData && currentShift) {
      checkWeatherForActiveShift(weatherData, currentShift);
    }
  }, [weatherData, currentShift, checkWeatherForActiveShift]);

  return (
    <WeatherContext.Provider
      value={{
        weatherData,
        loading,
        error,
        alertSettings,
        setAlertSettings,
        refreshWeatherData,
        weatherAlertMessage,
        showWeatherAlert,
        dismissWeatherAlert,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error("useWeather must be used within a WeatherProvider");
  }
  return context;
};

export default WeatherContext;
