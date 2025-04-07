// Mock weather data service
// In a real app, this would connect to a weather API

import axios from "axios";
import { weatherIcons } from "../assets/weather";

// Weather icons mapping
const weatherIconMap = {
  clear: weatherIcons.clear,
  "partly-cloudy": weatherIcons["partly-cloudy"],
  cloudy: weatherIcons.cloudy,
  rain: weatherIcons.rain,
  "heavy-rain": weatherIcons["heavy-rain"],
  thunderstorm: weatherIcons.thunderstorm,
  snow: weatherIcons.snow,
  fog: weatherIcons.fog,
  dust: weatherIcons.dust,
  haze: weatherIcons.haze,
  wind: weatherIcons.wind,
};

// Get weather icon based on condition
export const getWeatherIcon = (condition) => {
  if (condition.includes("clear")) return weatherIconMap["clear"];
  if (condition.includes("partly-cloudy"))
    return weatherIconMap["partly-cloudy"];
  if (condition.includes("cloudy")) return weatherIconMap["cloudy"];
  if (condition.includes("rain") && condition.includes("heavy"))
    return weatherIconMap["heavy-rain"];
  if (condition.includes("rain")) return weatherIconMap["rain"];
  if (condition.includes("thunder") || condition.includes("storm"))
    return weatherIconMap["thunderstorm"];
  if (condition.includes("snow")) return weatherIconMap["snow"];
  if (condition.includes("fog") || condition.includes("mist"))
    return weatherIconMap["fog"];

  // Default icon
  return weatherIconMap["partly-cloudy"];
};

// Mock weather data for the next 3 hours
const generateMockWeatherData = (startHour) => {
  const data = [];
  let currentTemperature = Math.floor(Math.random() * 15) + 15; // 15-30°C
  const conditions = [
    "clear",
    "partly-cloudy",
    "cloudy",
    "rain",
    "heavy-rain",
    "thunderstorm",
  ];

  // Thêm dữ liệu cho giờ hiện tại và 12 giờ tiếp theo (để có dự báo cho cả lúc đi và lúc về)
  for (let i = 0; i < 24; i++) {
    const hour = (startHour + i) % 24;
    const timeStr = `${hour}:00`;

    // Tạo biến nhiệt độ nhẹ giữa các giờ
    currentTemperature += (Math.random() - 0.5) * 2;
    currentTemperature = Math.min(Math.max(currentTemperature, 10), 38); // Giới hạn từ 10-38°C

    // Chọn điều kiện thời tiết
    const conditionIndex = Math.floor(Math.random() * conditions.length);
    const condition = conditions[conditionIndex];

    // Xác định cường độ dựa trên điều kiện
    let intensity = "normal";
    if (condition.includes("rain") || condition.includes("storm")) {
      intensity = Math.random() > 0.7 ? "heavy" : "normal";
    }

    // Tạo timestamp cho thời điểm dự báo
    const timestamp = new Date();
    timestamp.setHours(hour, 0, 0, 0);

    data.push({
      time: timeStr,
      timestamp: timestamp.toISOString(),
      temperature: Math.round(currentTemperature),
      condition,
      intensity,
      humidity: Math.floor(Math.random() * 30) + 60, // 60-90%
      windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
    });
  }

  return data;
};

// Fetch weather data (mock implementation)
export const fetchWeatherData = async (latitude, longitude) => {
  try {
    // Mô phỏng gọi API
    // const response = await axios.get(`https://api.example.com/weather?lat=${latitude}&lon=${longitude}`);

    // Dữ liệu mẫu cho mục đích demo
    // Trong ứng dụng thực tế, dữ liệu này sẽ đến từ API
    const currentHour = new Date().getHours();
    const mockData = generateMockWeatherData(currentHour);

    return mockData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
};

// In a real app, you would implement actual API calls with a valid API key
// Example implementation is commented out to avoid API key exposure

// Hàm dự báo thời tiết cho thời điểm cụ thể (timestamp) - gần đúng nhất
export const getForecastForTime = (weatherData, targetTime) => {
  if (!weatherData || weatherData.length === 0) return null;

  const targetTimestamp = new Date(targetTime).getTime();

  // Tìm dự báo gần nhất với thời gian mục tiêu
  let closestForecast = weatherData[0];
  let smallestDiff = Math.abs(
    new Date(weatherData[0].timestamp).getTime() - targetTimestamp
  );

  weatherData.forEach((forecast) => {
    const forecastTime = new Date(forecast.timestamp).getTime();
    const diff = Math.abs(forecastTime - targetTimestamp);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestForecast = forecast;
    }
  });

  return closestForecast;
};

// Hàm kiểm tra các điều kiện thời tiết cực đoan
export const checkExtremeWeatherConditions = (forecast, alertSettings) => {
  if (!forecast) return [];

  const extremeConditions = [];

  // Kiểm tra mưa to
  if (
    alertSettings.alertRain &&
    forecast.condition.includes("rain") &&
    forecast.intensity === "heavy"
  ) {
    extremeConditions.push("heavyRain");
  }

  // Kiểm tra thời tiết lạnh
  if (alertSettings.alertCold && forecast.temperature < 10) {
    extremeConditions.push("coldWeather");
  }

  // Kiểm tra thời tiết nóng
  if (alertSettings.alertHeat && forecast.temperature > 35) {
    extremeConditions.push("hotWeather");
  }

  // Kiểm tra bão
  if (
    alertSettings.alertStorm &&
    (forecast.condition.includes("storm") ||
      forecast.condition.includes("thunder"))
  ) {
    extremeConditions.push("stormWarning");
  }

  return extremeConditions;
};

// Hàm tạo thông báo cảnh báo thời tiết tổng hợp
export const generateWeatherAlertMessage = (
  departureConditions,
  returnConditions,
  departureTime,
  returnTime,
  t
) => {
  if (!departureConditions.length && !returnConditions.length) return "";

  let message = "";

  // Format thời gian
  const formatTime = (timeString) => {
    const time = new Date(timeString);
    return `${time.getHours()}h${
      time.getMinutes() > 0 ? time.getMinutes() : "00"
    }`;
  };

  // Đi làm - thêm vào điều kiện nếu có
  if (departureConditions.length > 0) {
    const deptTime = formatTime(departureTime);

    // Xử lý từng loại cảnh báo
    departureConditions.forEach((condition, index) => {
      if (index > 0) message += " ";

      switch (condition) {
        case "heavyRain":
          message += `${t("heavyRainAlert", { time: deptTime })} `;
          break;
        case "coldWeather":
          message += `${t("coldWeatherAlert", { time: deptTime })} `;
          break;
        case "hotWeather":
          message += `${t("hotWeatherAlert", { time: deptTime })} `;
          break;
        case "stormWarning":
          message += `${t("stormWarningAlert", { time: deptTime })} `;
          break;
        default:
          break;
      }
    });
  }

  // Tan làm - thêm vào điều kiện nếu có
  if (returnConditions.length > 0) {
    const returnTimeStr = formatTime(returnTime);

    // Nếu đã có cảnh báo đi làm, thêm cụm từ nối
    if (departureConditions.length > 0) {
      message += `${t("additionallyAlert")} `;
    }

    // Xử lý từng loại cảnh báo
    returnConditions.forEach((condition, index) => {
      if (index > 0) message += " ";

      switch (condition) {
        case "heavyRain":
          message += `${t("heavyRainReturnAlert", { time: returnTimeStr })} `;
          break;
        case "coldWeather":
          message += `${t("coldWeatherReturnAlert", { time: returnTimeStr })} `;
          break;
        case "hotWeather":
          message += `${t("hotWeatherReturnAlert", { time: returnTimeStr })} `;
          break;
        case "stormWarning":
          message += `${t("stormWarningReturnAlert", {
            time: returnTimeStr,
          })} `;
          break;
        default:
          break;
      }
    });
  }

  return message.trim();
};
