"use client"

import { useState, useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { LogBox } from "react-native"

// Ignore specific warnings
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  "DatePickerIOS has been merged with DatePickerAndroid",
])

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
  }, [])

  if (!isReady) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

