// Mock weather data service
// In a real app, this would connect to a weather API

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
};

// Get weather icon based on condition
export const getWeatherIcon = (condition) => {
  if (condition.includes("clear")) return weatherIcons["clear"];
  if (condition.includes("partly-cloudy")) return weatherIcons["partly-cloudy"];
  if (condition.includes("cloudy")) return weatherIcons["cloudy"];
  if (condition.includes("rain") && condition.includes("heavy"))
    return weatherIcons["heavy-rain"];
  if (condition.includes("rain")) return weatherIcons["rain"];
  if (condition.includes("thunder") || condition.includes("storm"))
    return weatherIcons["thunderstorm"];
  if (condition.includes("snow")) return weatherIcons["snow"];
  if (condition.includes("fog") || condition.includes("mist"))
    return weatherIcons["fog"];

  // Default icon
  return weatherIcons["partly-cloudy"];
};

// Mock weather data for the next 3 hours
const generateMockWeatherData = () => {
  const now = new Date();
  const weatherConditions = [
    "clear",
    "partly-cloudy",
    "cloudy",
    "rain",
    "heavy-rain",
    "thunderstorm",
  ];
  const temperatureRange = { min: 18, max: 35 };

  const data = [];

  // Current hour
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const formattedCurrentTime = `${currentHour
    .toString()
    .padStart(2, "0")}:${currentMinutes.toString().padStart(2, "0")}`;

  // Generate random weather for current hour
  const currentConditionIndex = Math.floor(
    Math.random() * weatherConditions.length
  );
  const currentCondition = weatherConditions[currentConditionIndex];
  const currentTemperature =
    Math.floor(Math.random() * (temperatureRange.max - temperatureRange.min)) +
    temperatureRange.min;

  data.push({
    time: formattedCurrentTime,
    temperature: currentTemperature,
    condition: currentCondition,
    intensity: currentCondition.includes("rain")
      ? Math.random() > 0.5
        ? "heavy"
        : "light"
      : "normal",
  });

  // Generate weather for next 2 hours with more realistic transitions
  for (let i = 1; i <= 2; i++) {
    const nextHour = (currentHour + i) % 24;
    const formattedTime = `${nextHour.toString().padStart(2, "0")}:00`;

    // Weather tends to be similar to previous hour with some variation
    const prevConditionIndex = weatherConditions.indexOf(data[i - 1].condition);
    let nextConditionIndex;

    // 70% chance weather stays similar, 30% chance it changes more dramatically
    if (Math.random() < 0.7) {
      // Similar weather (stay the same or move one step in either direction)
      const change = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      nextConditionIndex = Math.max(
        0,
        Math.min(weatherConditions.length - 1, prevConditionIndex + change)
      );
    } else {
      // More dramatic change
      nextConditionIndex = Math.floor(Math.random() * weatherConditions.length);
    }

    const nextCondition = weatherConditions[nextConditionIndex];

    // Temperature changes slightly from previous hour (more realistic)
    const timeOfDay = nextHour >= 6 && nextHour <= 14 ? "warming" : "cooling";
    let tempChange;

    if (timeOfDay === "warming") {
      // Morning to afternoon tends to warm up
      tempChange = Math.random() * 3; // 0 to +3 degrees
    } else {
      // Afternoon to night tends to cool down
      tempChange = -Math.random() * 3; // -3 to 0 degrees
    }

    // Add some randomness
    tempChange += Math.random() * 2 - 1; // Add -1 to +1 random variation

    const nextTemperature = Math.max(
      temperatureRange.min,
      Math.min(
        temperatureRange.max,
        Math.round(data[i - 1].temperature + tempChange)
      )
    );

    data.push({
      time: formattedTime,
      temperature: nextTemperature,
      condition: nextCondition,
      intensity: nextCondition.includes("rain")
        ? Math.random() > 0.5
          ? "heavy"
          : "light"
        : "normal",
    });
  }

  return data;
};

// Fetch mock weather data
export const fetchMockWeatherData = async () => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Generate mock data
  return generateMockWeatherData();
};

// In a real app, you would implement actual API calls like this:

export const fetchWeatherData = async (latitude, longitude) => {
  try {
    const apiKey = "51b547f3accfe106429c8ce64a24c7e5";
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error("Weather data fetch failed");
    }

    const data = await response.json();

    // Process and format the data
    const formattedData = data.list.slice(0, 3).map((item) => ({
      time: new Date(item.dt * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      temperature: Math.round(item.main.temp),
      condition: mapCondition(item.weather[0].main),
      intensity: getIntensity(item),
    }));

    return formattedData;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    throw error;
  }
};

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
  };

  return conditionMap[apiCondition] || "partly-cloudy";
};

const getIntensity = (item) => {
  if (item.weather[0].main === "Rain") {
    return item.rain && item.rain["3h"] > 7 ? "heavy" : "light";
  }
  return "normal";
};
