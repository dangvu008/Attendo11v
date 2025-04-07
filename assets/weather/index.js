// This file exports the weather icons using SVG files based on time of day
// React Native handles SVG differently than web - we'll use direct require

export const weatherIcons = {
  // Day icons
  "clear-day": require("./clear-day.svg"),
  "partly-cloudy-day": require("./cloudy-1-day.svg"),
  "cloudy-day": require("./cloudy-2-day.svg"),
  "rain-day": require("./rainy-1-day.svg"),
  "heavy-rain-day": require("./rainy-3-day.svg"),
  "thunderstorm-day": require("./isolated-thunderstorms-day.svg"),
  "snow-day": require("./snowy-1-day.svg"),
  "fog-day": require("./fog-day.svg"),

  // Night icons
  "clear-night": require("./clear-night.svg"),
  "partly-cloudy-night": require("./cloudy-1-night.svg"),
  "cloudy-night": require("./cloudy-2-night.svg"),
  "rain-night": require("./rainy-1-night.svg"),
  "heavy-rain-night": require("./rainy-3-night.svg"),
  "thunderstorm-night": require("./isolated-thunderstorms-night.svg"),
  "snow-night": require("./snowy-1-night.svg"),
  "fog-night": require("./fog-night.svg"),

  // Generic icons (no day/night variation)
  clear: require("./clear-day.svg"),
  "partly-cloudy": require("./cloudy-1-day.svg"),
  cloudy: require("./cloudy.svg"),
  rain: require("./rainy-1.svg"),
  "heavy-rain": require("./rainy-3.svg"),
  thunderstorm: require("./thunderstorms.svg"),
  snow: require("./snowy-1.svg"),
  fog: require("./fog.svg"),
  dust: require("./dust.svg"),
  haze: require("./haze.svg"),
  wind: require("./wind.svg"),
};
