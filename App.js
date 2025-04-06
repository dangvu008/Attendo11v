"use client"

import { useEffect } from "react"
import { StatusBar } from "expo-status-bar"
import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { AppProvider } from "./context/AppContext"
import HomeScreen from "./screens/HomeScreen"
import SettingsScreen from "./screens/SettingsScreen"
import StatsScreen from "./screens/StatsScreen"
import WorkScheduleScreen from "./screens/WorkScheduleScreen"
import AddNoteScreen from "./screens/AddNoteScreen"
import AddShiftScreen from "./screens/AddShiftScreen"
import DataManagementScreen from "./screens/DataManagementScreen"
import { initializeDatabase } from "./utils/database"
import { configureNotifications } from "./utils/notificationUtils"
import { scheduleAutomaticBackup } from "./utils/dataBackupUtils"
import { View, Text } from "react-native"

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Error boundary component for Snack
const ErrorBoundary = ({ children }) => {
  try {
    return children
  } catch (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>Something went wrong</Text>
        <Text style={{ textAlign: "center" }}>{error.message || "An unknown error occurred"}</Text>
      </View>
    )
  }
}

// Home stack navigator
const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="AddNote" component={AddNoteScreen} />
    </Stack.Navigator>
  )
}

// Stats stack navigator
const StatsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StatsScreen" component={StatsScreen} />
    </Stack.Navigator>
  )
}

// Settings stack navigator
const SettingsStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="DataManagement" component={DataManagementScreen} />
    </Stack.Navigator>
  )
}

// Work Schedule stack navigator
const WorkScheduleStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WorkScheduleScreen" component={WorkScheduleScreen} />
      <Stack.Screen name="AddShift" component={AddShiftScreen} />
    </Stack.Navigator>
  )
}

// Main tab navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline"
          } else if (route.name === "Stats") {
            iconName = focused ? "stats-chart" : "stats-chart-outline"
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline"
          } else if (route.name === "Schedule") {
            iconName = focused ? "calendar" : "calendar-outline"
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: "#6a5acd",
        tabBarInactiveTintColor: "gray",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        tabBarStyle: {
          paddingVertical: 5,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Stats" component={StatsStack} />
      <Tab.Screen name="Schedule" component={WorkScheduleStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  )
}

export default function App() {
  useEffect(() => {
    // Initialize the database with sample data
    try {
      initializeDatabase()

      // Configure notifications when app starts
      configureNotifications()

      // Schedule automatic backup
      scheduleAutomaticBackup()
    } catch (error) {
      console.error("Failed to initialize:", error)
    }
  }, [])

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <NavigationContainer>
            <TabNavigator />
            <StatusBar style="auto" />
          </NavigationContainer>
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  )
}

