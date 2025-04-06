import * as Location from "expo-location"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { format, subHours } from "date-fns"

// Weather icons
const weatherIcons = {
  clear: require("../assets/weather/clear.png"),
  "partly-cloudy": require("../assets/weather/partly-cloudy.png"),
  cloudy: require("../assets/weather/cloudy.png"),
  rain: require("../assets/weather/rain.png"),
  "heavy-rain": require("../assets/weather/heavy-rain.png"),
  thunderstorm: require("../assets/weather/thunderstorm.png"),
  snow: require("../assets/weather/snow.png"),
  fog: require("../assets/weather/fog.png"),
}

// OpenWeatherMap API key
// In a production app, this should be stored in environment variables
const API_KEY = "51b547f3accfe106429c8ce64a24c7e5" // Replace with your actual API key

// Cache settings
const CACHE_KEY = "attendo_weather_cache"
const CACHE_EXPIRY = 30 * 60 * 1000 // 30 minutes in milliseconds
const LOCATION_CACHE_KEY = "attendo_location_cache"
const LOCATION_CACHE_EXPIRY = 15 * 60 * 1000 // 15 minutes in milliseconds

// Weather thresholds for alerts
export const WEATHER_THRESHOLDS = {
  COLD_TEMP: 15, // °C
  HOT_TEMP: 35, // °C
  HEAVY_RAIN: 7, // mm in 3h
  MODERATE_RAIN: 2.5, // mm in 3h
  STRONG_WIND: 10, // m/s
}

// Get weather icon based on condition
export const getWeatherIcon = (condition) => {
  if (condition.includes("clear")) return weatherIcons["clear"]
  if (condition.includes("partly-cloudy") || condition.includes("few clouds") || condition.includes("scattered clouds"))
    return weatherIcons["partly-cloudy"]
  if (condition.includes("cloudy") || condition.includes("clouds") || condition.includes("overcast"))
    return weatherIcons["cloudy"]
  if (condition.includes("rain") && (condition.includes("heavy") || condition.includes("extreme")))
    return weatherIcons["heavy-rain"]
  if (condition.includes("rain") || condition.includes("drizzle")) return weatherIcons["rain"]
  if (condition.includes("thunder") || condition.includes("storm")) return weatherIcons["thunderstorm"]
  if (condition.includes("snow")) return weatherIcons["snow"]
  if (condition.includes("fog") || condition.includes("mist") || condition.includes("haze")) return weatherIcons["fog"]

  // Default icon
  return weatherIcons["partly-cloudy"]
}

/**
 * Get the user's current location
 * @returns {Promise<{latitude: number, longitude: number}>} Location coordinates
 */
export const getCurrentLocation = async () => {
  try {
    // Check if we have cached location data that's still valid
    const cachedLocationJson = await AsyncStorage.getItem(LOCATION_CACHE_KEY)
    if (cachedLocationJson) {
      const cachedLocation = JSON.parse(cachedLocationJson)
      const now = new Date().getTime()
      if (now - cachedLocation.timestamp < LOCATION_CACHE_EXPIRY) {
        console.log("[Weather] Using cached location data")
        return {
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
        }
      }
    }

    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      throw new Error("Location permission denied")
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Balance between accuracy and battery usage
    })

    // Cache the location data
    const locationData = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date().getTime(),
    }
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationData))

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    }
  } catch (error) {
    console.error("[Weather] Error getting location:", error)
    throw error
  }
}

/**
 * Get the city name from coordinates using reverse geocoding
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string>} City name
 */
export const getCityFromCoordinates = async (latitude, longitude) => {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`,
    )

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (data && data.length > 0) {
      return data[0].name
    }

    return "Unknown Location"
  } catch (error) {
    console.error("[Weather] Error getting city name:", error)
    return "Unknown Location"
  }
}

/**
 * Map OpenWeatherMap condition to our app's condition format
 * @param {string} apiCondition - OpenWeatherMap weather condition
 * @returns {string} Mapped condition
 */
const mapCondition = (apiCondition) => {
  const conditionMap = {
    Clear: "clear",
    Clouds: "cloudy",
    Rain: "rain",
    Drizzle: "rain",
    Thunderstorm: "thunderstorm",
    Snow: "snow",
    Mist: "fog",
    Fog: "fog",
    Haze: "fog",
    Dust: "fog",
    Sand: "fog",
    Ash: "fog",
    Squall: "heavy-rain",
    Tornado: "thunderstorm",
  }

  return conditionMap[apiCondition] || "partly-cloudy"
}

/**
 * Determine rain intensity based on precipitation volume
 * @param {Object} item - Weather data item
 * @returns {string} Intensity (heavy, light, or normal)
 */
const getIntensity = (item) => {
  if (item.weather[0].main === "Rain") {
    if (item.rain && item.rain["3h"]) {
      return item.rain["3h"] > WEATHER_THRESHOLDS.HEAVY_RAIN ? "heavy" : "light"
    }
    if (item.rain && item.rain["1h"]) {
      return item.rain["1h"] > WEATHER_THRESHOLDS.MODERATE_RAIN ? "heavy" : "light"
    }
  }
  return "normal"
}

/**
 * Fetch weather data from OpenWeatherMap API
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Array>} Weather data for the next few hours
 */
export const fetchWeatherData = async (latitude, longitude) => {
  try {
    // Check if we have cached weather data that's still valid
    const cachedWeatherJson = await AsyncStorage.getItem(CACHE_KEY)
    if (cachedWeatherJson) {
      const cachedWeather = JSON.parse(cachedWeatherJson)
      const now = new Date().getTime()

      // If the cache is still valid and for the same location (within 0.01 degrees)
      if (
        now - cachedWeather.timestamp < CACHE_EXPIRY &&
        Math.abs(cachedWeather.latitude - latitude) < 0.01 &&
        Math.abs(cachedWeather.longitude - longitude) < 0.01
      ) {
        console.log("[Weather] Using cached weather data")
        return cachedWeather.data
      }
    }

    // Fetch current weather
    const currentResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`,
    )

    if (!currentResponse.ok) {
      throw new Error(`Weather API error: ${currentResponse.status}`)
    }

    const currentData = await currentResponse.json()

    // Fetch forecast for the next few hours
    const forecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&cnt=8`,
    )

    if (!forecastResponse.ok) {
      throw new Error(`Forecast API error: ${forecastResponse.status}`)
    }

    const forecastData = await forecastResponse.json()

    // Format the data
    const formattedData = [
      // Current weather
      {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temperature: Math.round(currentData.main.temp),
        condition: mapCondition(currentData.weather[0].main),
        intensity:
          currentData.weather[0].main === "Rain"
            ? currentData.rain && currentData.rain["1h"] > WEATHER_THRESHOLDS.MODERATE_RAIN
              ? "heavy"
              : "light"
            : "normal",
        description: currentData.weather[0].description,
        humidity: currentData.main.humidity,
        windSpeed: currentData.wind.speed,
        timestamp: new Date().toISOString(),
        precipitation: currentData.rain ? currentData.rain["1h"] || 0 : 0,
      },
      // Forecast for next hours
      ...forecastData.list.slice(0, 7).map((item) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        temperature: Math.round(item.main.temp),
        condition: mapCondition(item.weather[0].main),
        intensity: getIntensity(item),
        description: item.weather[0].description,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        timestamp: new Date(item.dt * 1000).toISOString(),
        precipitation: item.rain ? item.rain["3h"] || 0 : 0,
      })),
    ]

    // Cache the weather data
    const weatherCache = {
      data: formattedData,
      timestamp: new Date().getTime(),
      latitude,
      longitude,
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(weatherCache))

    return formattedData
  } catch (error) {
    console.error("[Weather] Error fetching weather data:", error)
    throw error
  }
}

/**
 * Get weather forecast for a specific time
 * @param {Array} weatherData - Weather data array
 * @param {Date} targetTime - Target time to get forecast for
 * @returns {Object|null} Weather forecast for the target time or null if not found
 */
export const getWeatherForTime = (weatherData, targetTime) => {
  if (!weatherData || weatherData.length === 0) return null

  const targetTimestamp = targetTime.getTime()

  // Find the closest forecast to the target time
  let closestForecast = null
  let minTimeDiff = Number.POSITIVE_INFINITY

  for (const forecast of weatherData) {
    const forecastTime = new Date(forecast.timestamp).getTime()
    const timeDiff = Math.abs(forecastTime - targetTimestamp)

    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff
      closestForecast = forecast
    }
  }

  // Only return if within 3 hours (10800000 ms)
  return minTimeDiff <= 10800000 ? closestForecast : null
}

/**
 * Check for extreme weather conditions
 * @param {Object} weatherData - Weather data
 * @returns {Array} Array of extreme weather conditions
 */
export const checkExtremeWeather = (weatherData) => {
  if (!weatherData) return []

  const extremeConditions = []

  // Check temperature
  if (weatherData.temperature < WEATHER_THRESHOLDS.COLD_TEMP) {
    extremeConditions.push({
      type: "cold",
      value: weatherData.temperature,
      description: `Nhiệt độ thấp (${weatherData.temperature}°C)`,
      suggestion: "nên mặc thêm áo ấm",
    })
  }

  if (weatherData.temperature > WEATHER_THRESHOLDS.HOT_TEMP) {
    extremeConditions.push({
      type: "hot",
      value: weatherData.temperature,
      description: `Nhiệt độ cao (${weatherData.temperature}°C)`,
      suggestion: "nên che chắn cẩn thận và uống đủ nước",
    })
  }

  // Check rain
  if (weatherData.condition === "rain" || weatherData.condition === "heavy-rain") {
    const intensity = weatherData.intensity === "heavy" ? "to" : "nhỏ"
    extremeConditions.push({
      type: "rain",
      value: weatherData.precipitation,
      description: `Có mưa ${intensity}`,
      suggestion: "hãy nhớ mang theo áo mưa/ô",
    })
  }

  // Check thunderstorm
  if (weatherData.condition === "thunderstorm") {
    extremeConditions.push({
      type: "storm",
      value: weatherData.windSpeed,
      description: "Có dông/sấm sét",
      suggestion: "hãy cẩn thận và tránh các khu vực trống trải",
    })
  }

  // Check strong wind
  if (weatherData.windSpeed > WEATHER_THRESHOLDS.STRONG_WIND) {
    extremeConditions.push({
      type: "wind",
      value: weatherData.windSpeed,
      description: `Gió mạnh (${Math.round(weatherData.windSpeed)} m/s)`,
      suggestion: "nên cẩn thận khi di chuyển",
    })
  }

  // Check snow (unlikely in Vietnam but included for completeness)
  if (weatherData.condition === "snow") {
    extremeConditions.push({
      type: "snow",
      value: weatherData.precipitation,
      description: "Có tuyết rơi",
      suggestion: "hãy mặc ấm và cẩn thận khi di chuyển",
    })
  }

  return extremeConditions
}

/**
 * Generate weather alerts based on shift times
 * @param {Array} weatherData - Weather data array
 * @param {Object} shift - Current shift
 * @returns {Array} Array of weather alerts
 */
export const generateWeatherAlerts = (weatherData, shift) => {
  if (!weatherData || !shift) return []

  const alerts = []
  const now = new Date()

  try {
    // Parse shift times
    const departureTime = parseTimeString(shift.departureTime)
    const endTime = parseTimeString(shift.endTime)

    // Check if we're within 1 hour before departure time
    const oneHourBeforeDeparture = subHours(departureTime, 1)
    if (now >= oneHourBeforeDeparture && now <= departureTime) {
      const departureWeather = getWeatherForTime(weatherData, departureTime)
      if (departureWeather) {
        const extremeConditions = checkExtremeWeather(departureWeather)
        if (extremeConditions.length > 0) {
          extremeConditions.forEach((condition) => {
            alerts.push({
              time: "departure",
              formattedTime: format(departureTime, "HH:mm"),
              condition,
            })
          })
        }
      }
    }

    // Check if we're within 1 hour before end time
    const oneHourBeforeEnd = subHours(endTime, 1)
    if (now >= oneHourBeforeEnd && now <= endTime) {
      const endTimeWeather = getWeatherForTime(weatherData, endTime)
      if (endTimeWeather) {
        const extremeConditions = checkExtremeWeather(endTimeWeather)
        if (extremeConditions.length > 0) {
          extremeConditions.forEach((condition) => {
            alerts.push({
              time: "end",
              formattedTime: format(endTime, "HH:mm"),
              condition,
            })
          })
        }
      }
    }

    return alerts
  } catch (error) {
    console.error("[Weather] Error generating alerts:", error)
    return []
  }
}

/**
 * Parse time string to Date object
 * @param {string} timeString - Time string in format "HH:mm"
 * @returns {Date} Date object
 */
const parseTimeString = (timeString) => {
  const [hours, minutes] = timeString.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

// Fallback to mock data if real data cannot be fetched
export const generateMockWeatherData = () => {
  const now = new Date()
  const weatherConditions = ["clear", "partly-cloudy", "cloudy", "rain", "heavy-rain", "thunderstorm"]

  const data = []

  // Current hour
  const currentHour = now.getHours()
  const currentMinutes = now.getMinutes()
  const formattedCurrentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`

  // Generate random weather for current hour
  const currentConditionIndex = Math.floor(Math.random() * weatherConditions.length)
  const currentCondition = weatherConditions[currentConditionIndex]
  const currentTemperature = Math.floor(Math.random() * 15) + 20 // Random temp between 20-35°C

  data.push({
    time: formattedCurrentTime,
    temperature: currentTemperature,
    condition: currentCondition,
    intensity: currentCondition.includes("rain") ? (Math.random() > 0.5 ? "heavy" : "light") : "normal",
    description: `Mock ${currentCondition.replace("-", " ")}`,
    humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
    windSpeed: Math.floor(Math.random() * 20) + 5, // Random wind speed between 5-25 km/h
    timestamp: now.toISOString(),
    precipitation: currentCondition.includes("rain") ? Math.random() * 10 : 0,
  })

  // Generate weather for next hours
  for (let i = 1; i <= 7; i++) {
    const nextTime = new Date(now)
    nextTime.setHours(now.getHours() + i)

    const nextHour = nextTime.getHours()
    const formattedTime = `${nextHour.toString().padStart(2, "0")}:00`

    // Weather tends to be similar to previous hour with some variation
    const prevConditionIndex = data[i - 1].condition === "clear" ? 0 : weatherConditions.indexOf(data[i - 1].condition)
    let nextConditionIndex

    // 70% chance weather stays similar, 30% chance it changes more dramatically
    if (Math.random() < 0.7) {
      // Similar weather (stay the same or move one step in either direction)
      const change = Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
      nextConditionIndex = Math.max(0, Math.min(weatherConditions.length - 1, prevConditionIndex + change))
    } else {
      // More dramatic change
      nextConditionIndex = Math.floor(Math.random() * weatherConditions.length)
    }

    const nextCondition = weatherConditions[nextConditionIndex]

    // Temperature changes slightly from previous hour
    const tempChange = Math.floor(Math.random() * 5) - 2 // -2 to +2 degrees
    const nextTemperature = Math.max(0, Math.min(40, data[i - 1].temperature + tempChange))

    data.push({
      time: formattedTime,
      temperature: nextTemperature,
      condition: nextCondition,
      intensity: nextCondition.includes("rain") ? (Math.random() > 0.5 ? "heavy" : "light") : "normal",
      description: `Mock ${nextCondition.replace("-", " ")}`,
      humidity: Math.floor(Math.random() * 30) + 50, // Random humidity between 50-80%
      windSpeed: Math.floor(Math.random() * 20) + 5, // Random wind speed between 5-25 km/h
      timestamp: nextTime.toISOString(),
      precipitation: nextCondition.includes("rain") ? Math.random() * 10 : 0,
    })
  }

  return data
}

