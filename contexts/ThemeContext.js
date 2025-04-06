"use client"

import { createContext, useState, useContext, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useColorScheme } from "react-native"

// Define themes
const lightTheme = {
  dark: false,
  colors: {
    primary: "#007AFF",
    primaryLight: "#E5F1FF",
    background: "#F2F2F7",
    card: "#FFFFFF",
    text: "#000000",
    textSecondary: "#6E6E6E",
    border: "#C7C7CC",
    notification: "#FF3B30",
    success: "#34C759",
    warning: "#FF9500",
    danger: "#FF3B30",
    info: "#5856D6",
  },
}

const darkTheme = {
  dark: true,
  colors: {
    primary: "#0A84FF",
    primaryLight: "#1C3A5E",
    background: "#000000",
    card: "#1C1C1E",
    text: "#FFFFFF",
    textSecondary: "#8E8E93",
    border: "#38383A",
    notification: "#FF453A",
    success: "#30D158",
    warning: "#FF9F0A",
    danger: "#FF453A",
    info: "#5E5CE6",
  },
}

// Create context
const ThemeContext = createContext()

// Theme provider component
export function ThemeProvider({ children }) {
  const deviceTheme = useColorScheme()
  const [isDarkMode, setIsDarkMode] = useState(deviceTheme === "dark")
  const [theme, setTheme] = useState(isDarkMode ? darkTheme : lightTheme)

  // Load saved theme preference
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("attendo_theme")
        if (savedTheme !== null) {
          const parsedTheme = JSON.parse(savedTheme)
          setIsDarkMode(parsedTheme.isDarkMode)
          setTheme(parsedTheme.isDarkMode ? darkTheme : lightTheme)
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error)
      }
    }

    loadTheme()
  }, [])

  // Toggle theme
  const toggleTheme = async () => {
    const newIsDarkMode = !isDarkMode
    setIsDarkMode(newIsDarkMode)
    setTheme(newIsDarkMode ? darkTheme : lightTheme)

    try {
      await AsyncStorage.setItem("attendo_theme", JSON.stringify({ isDarkMode: newIsDarkMode }))
    } catch (error) {
      console.error("Failed to save theme preference:", error)
    }
  }

  return <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>{children}</ThemeContext.Provider>
}

// Custom hook for using theme
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}

