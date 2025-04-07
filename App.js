"use client";

import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";
import * as Font from "expo-font";
import { WeatherProvider } from "./contexts/WeatherContext";
import * as Notifications from "expo-notifications";

// Ignore specific warnings
LogBox.ignoreLogs([
  "Non-serializable values were found in the navigation state",
  "DatePickerIOS has been merged with DatePickerAndroid",
]);

// Import screens
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import StatisticsScreen from "./screens/StatisticsScreen";

// Import contexts
import { ThemeProvider } from "./contexts/ThemeContext";
import { I18nProvider } from "./contexts/I18nContext";
import { ShiftProvider } from "./contexts/ShiftContext";
import { WorkStatusProvider } from "./contexts/WorkStatusContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";

// Import utils
import { initializeDatabase } from "./utils/database";

const Stack = createNativeStackNavigator();

// Cấu hình xử lý thông báo khi ứng dụng đang chạy
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize app data
    const initializeApp = async () => {
      try {
        // Load weather icons font
        // await Font.loadAsync({
        //   weathericons: require("./assets/fonts/weathericons-regular-webfont.ttf"),
        // });

        await initializeDatabase();
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <I18nProvider>
            <DatabaseProvider>
              <ShiftProvider>
                <WeatherProvider>
                  <WorkStatusProvider>
                    <NavigationContainer>
                      <Stack.Navigator
                        initialRouteName="Home"
                        screenOptions={{
                          headerShown: false,
                        }}
                      >
                        <Stack.Screen name="Home" component={HomeScreen} />
                        <Stack.Screen
                          name="Settings"
                          component={SettingsScreen}
                        />
                        <Stack.Screen
                          name="Statistics"
                          component={StatisticsScreen}
                        />
                      </Stack.Navigator>
                    </NavigationContainer>
                    <StatusBar style="auto" />
                  </WorkStatusProvider>
                </WeatherProvider>
              </ShiftProvider>
            </DatabaseProvider>
          </I18nProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
