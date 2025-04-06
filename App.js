"use client"

import { useState, useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { LogBox, AppState, Alert } from "react-native"
import * as Notifications from "expo-notifications"
import * as ErrorUtils from "ErrorUtils"
import Constants from "expo-constants"

// Add error boundary to catch and handle unhandled errors
import { ErrorBoundary } from "./components/ErrorBoundary"

// Ignore specific warnings
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  "DatePickerIOS has been merged with DatePickerAndroid",
])

// Add global error handler
const handleError = (error, isFatal) => {
  console.error(`[Global Error] ${isFatal ? "Fatal:" : "Non-fatal:"} ${error.message}`, error.stack)

  // You could log to a service or show an alert to the user
  if (isFatal) {
    Alert.alert("Unexpected Error Occurred", "The app encountered an unexpected error and needs to restart.", [
      {
        text: "OK",
        onPress: () => {
          // In a real app, you might want to restart the app or navigate to a safe screen
        },
      },
    ])
  }
}

// Set up the error handler
if (!Constants.expoConfig.extra.environment === "development") {
  ErrorUtils.setGlobalHandler(handleError)
}

// Import screens
import HomeScreen from "./screens/HomeScreen"
import SettingsScreen from "./screens/SettingsScreen"
import StatisticsScreen from "./screens/StatisticsScreen"

// Import contexts
import { ThemeProvider } from "./contexts/ThemeContext"
import { I18nProvider } from "./contexts/I18nContext"
import { ShiftProvider } from "./contexts/ShiftContext"
import { WorkStatusProvider } from "./contexts/WorkStatusContext"

// Import utils
import { initializeDatabase } from "./utils/database"

const Stack = createNativeStackNavigator()

export default function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      try {
        await initializeDatabase()
        setIsReady(true)
      } catch (error) {
        console.error("Failed to initialize app:", error)
        setIsReady(true)
      }
    }

    initializeApp()

    // Set up notification listeners
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Notification] Received:", notification)
    })

    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[Notification] Response received:", response)
      // Handle notification interaction here
    })

    // Set up app state listener to refresh data when app comes to foreground
    const appStateListener = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("[App] App has come to the foreground, refreshing data")
        // You could refresh your data here
      }
    })

    return () => {
      // Clean up listeners
      notificationListener.remove()
      responseListener.remove()
      appStateListener.remove()
    }
  }, [])

  if (!isReady) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <ThemeProvider>
            <I18nProvider>
              <ShiftProvider>
                <WorkStatusProvider>
                  <NavigationContainer>
                    <Stack.Navigator
                      initialRouteName="Home"
                      screenOptions={{
                        headerShown: false,
                      }}
                    >
                      <Stack.Screen name="Home" component={HomeScreen} />
                      <Stack.Screen name="Settings" component={SettingsScreen} />
                      <Stack.Screen name="Statistics" component={StatisticsScreen} />
                    </Stack.Navigator>
                  </NavigationContainer>
                  <StatusBar style="auto" />
                </WorkStatusProvider>
              </ShiftProvider>
            </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

