import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Initialize notifications and request permissions
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const initNotifications = async () => {
  try {
    // Check if device is a physical device (not an emulator)
    if (!Device.isDevice) {
      console.warn("Notifications are not available on emulators/simulators")
      return false
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // If we don't have permission yet, ask for it
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    // Check if we got permission
    if (finalStatus !== "granted") {
      console.warn("Failed to get notification permissions")
      return false
    }

    // Get push token for remote notifications (if needed in the future)
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      })
    }

    return true
  } catch (error) {
    console.error("Error initializing notifications:", error)
    return false
  }
}

/**
 * Schedule a notification
 * @param {Object} options - Notification options
 * @returns {Promise<string>} Notification identifier
 */
export const scheduleNotification = async (options) => {
  try {
    // Check if notifications are enabled in user settings
    const userSettingsJson = await AsyncStorage.getItem("attendo_user_settings")
    const userSettings = userSettingsJson ? JSON.parse(userSettingsJson) : { notificationsEnabled: true }

    if (!userSettings.notificationsEnabled) {
      console.log("Notifications are disabled in user settings")
      return null
    }

    // Check if we already have a notification with this identifier
    if (options.identifier) {
      // Cancel any existing notification with this identifier
      await Notifications.cancelScheduledNotificationAsync(options.identifier)
    }

    // Generate a unique identifier if none provided
    const identifier = options.identifier || `notification_${Date.now()}`

    // Schedule the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data || {},
        sound: true,
      },
      trigger: {
        date: options.date,
      },
      identifier,
    })

    return identifier
  } catch (error) {
    console.error("Error scheduling notification:", error)
    return null
  }
}

/**
 * Get all scheduled notifications
 * @returns {Promise<Array>} List of scheduled notifications
 */
export const getScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync()
  } catch (error) {
    console.error("Error getting scheduled notifications:", error)
    return []
  }
}

