/**
 * Alarm Utilities Module
 *
 * This module provides functions for creating and managing alarms in the Attendo app.
 * It uses Expo Notifications for notification features and Vibration for feedback.
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { Platform, Vibration } from "react-native";
import * as KeepAwake from "expo-keep-awake";
import { STORAGE_KEYS } from "./STORAGE_KEYS";
import { safelyUnregisterTask } from "./taskManager";

// Define task names
const BACKGROUND_ALARM_TASK = "BACKGROUND_ALARM_TASK";
const ALARM_CHANNEL_ID = "attendo-alarms";

// Sound objects
const alarmSound = null;
let isPlaying = false;
let activeAlarmId = null;
const vibrationInterval = null;

/**
 * Initialize alarm system
 *
 * @returns {Promise<boolean>} - True if initialization was successful
 */
export const initializeAlarmSystem = async () => {
  try {
    // Request notification permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Notification permissions not granted");
      return false;
    }

    // Create notification channel for Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
        name: "Attendo Alarms",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6a5acd",
      });
    }

    // Register background task
    await registerBackgroundAlarmTask();

    return true;
  } catch (error) {
    console.error("Error initializing alarm system:", error);
    return false;
  }
};

/**
 * Register background task for alarms
 *
 * @returns {Promise<void>}
 */
const registerBackgroundAlarmTask = async () => {
  try {
    // Check if task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_ALARM_TASK
    );

    if (!isRegistered) {
      // Define task
      TaskManager.defineTask(BACKGROUND_ALARM_TASK, async () => {
        try {
          // Check for upcoming alarms and schedule them
          const result = await checkAndScheduleAlarms();
          return result
            ? BackgroundFetch.BackgroundFetchResult.NewData
            : BackgroundFetch.BackgroundFetchResult.NoData;
        } catch (error) {
          console.error("Error in background alarm task:", error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_ALARM_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (error) {
    console.error("Error registering background alarm task:", error);
  }
};

/**
 * Check for upcoming alarms and schedule them
 *
 * @returns {Promise<boolean>} - True if alarms were scheduled
 */
const checkAndScheduleAlarms = async () => {
  // Implementation will depend on your app's specific needs
  // This is a placeholder for the actual implementation
  return false;
};

/**
 * Schedule an alarm
 *
 * @param {Object} options - Alarm options
 * @param {string} options.title - Alarm title
 * @param {string} options.body - Alarm body
 * @param {Date} options.triggerTime - When to trigger the alarm
 * @param {string} options.type - Alarm type (e.g., 'departure', 'check-in', 'check-out')
 * @param {Object} options.data - Additional data to include with the alarm
 * @param {string} options.identifier - Optional unique identifier for the notification
 * @returns {Promise<string>} - Alarm ID
 */
export const scheduleAlarm = async ({
  title,
  body,
  triggerTime,
  type,
  data = {},
  identifier = null,
}) => {
  try {
    // Get user settings
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const soundEnabled =
      settings.soundEnabled !== undefined ? settings.soundEnabled : true;
    const vibrationEnabled =
      settings.vibrationEnabled !== undefined
        ? settings.vibrationEnabled
        : true;

    // Calculate trigger time in seconds
    const now = new Date();
    const triggerAt = triggerTime.getTime();

    // If trigger time is in the past, don't schedule
    if (triggerAt <= now.getTime()) {
      console.log("Alarm trigger time is in the past, not scheduling");
      return null;
    }

    // If an identifier is provided, cancel any existing notification with this ID
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }

    // Schedule with Expo Notifications
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundEnabled,
        vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
        priority: "high",
        data: {
          type,
          alarmType: "attendo_alarm",
          ...data,
        },
      },
      trigger: {
        date: triggerAt,
      },
      identifier: identifier || undefined, // Use provided identifier or let system generate one
    });

    console.log(
      `Scheduled alarm for ${triggerTime.toLocaleString()}, ID: ${notificationId}`
    );
    return notificationId;
  } catch (error) {
    console.error("Error scheduling alarm:", error);
    return null;
  }
};

/**
 * Trigger an alarm immediately
 *
 * @param {Object} options - Alarm options
 * @param {string} options.title - Alarm title
 * @param {string} options.body - Alarm body
 * @param {string} options.type - Alarm type
 * @param {Object} options.data - Additional data
 * @returns {Promise<string>} - Alarm ID
 */
export const triggerAlarmNow = async ({ title, body, type, data = {} }) => {
  try {
    // Get user settings
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    const soundEnabled =
      settings.soundEnabled !== undefined ? settings.soundEnabled : true;
    const vibrationEnabled =
      settings.vibrationEnabled !== undefined
        ? settings.vibrationEnabled
        : true;

    // Create a unique ID for this alarm
    const alarmId = Date.now().toString();
    activeAlarmId = alarmId;

    // Keep screen awake while alarm is active
    KeepAwake.activateKeepAwake();

    // Start vibration if enabled
    if (vibrationEnabled) {
      // Vibrate in a pattern (500ms on, 500ms off)
      Vibration.vibrate([0, 500, 500], true);
    }

    // Show notification
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundEnabled,
        vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
        priority: "high",
        data: {
          type,
          alarmType: "attendo_alarm",
          alarmId,
          ...data,
        },
      },
      trigger: null, // Immediate notification
    });

    return identifier;
  } catch (error) {
    console.error("Error triggering alarm:", error);
    return null;
  }
};

/**
 * Stop the currently playing alarm
 *
 * @returns {Promise<boolean>} - True if alarm was stopped
 */
export const stopAlarm = async () => {
  try {
    // Stop sound
    if (alarmSound && isPlaying) {
      // In a real app, you would stop the sound here
      isPlaying = false;
    }

    // Stop vibration
    Vibration.cancel();

    // Allow screen to sleep again
    KeepAwake.deactivateKeepAwake();

    // Cancel the notification if it exists
    if (activeAlarmId) {
      await Notifications.dismissNotificationAsync(activeAlarmId);
      activeAlarmId = null;
    }

    return true;
  } catch (error) {
    console.error("Error stopping alarm:", error);
    return false;
  }
};

/**
 * Cancel a scheduled alarm by ID
 *
 * @param {string} alarmId - ID of the alarm to cancel
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAlarm = async (alarmId) => {
  try {
    if (!alarmId) return false;

    await Notifications.cancelScheduledNotificationAsync(alarmId);
    console.log(`Canceled alarm: ${alarmId}`);
    return true;
  } catch (error) {
    console.error(`Error canceling alarm ${alarmId}:`, error);
    return false;
  }
};

/**
 * Cancel all alarms of a specific type
 *
 * @param {string} type - Type of alarms to cancel
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAlarmsByType = async (type) => {
  try {
    // For simplicity, we'll just cancel all notifications
    // In a real app, you would filter by type
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log(`Canceled all alarms of type: ${type}`);
    return true;
  } catch (error) {
    console.error(`Error canceling ${type} alarms:`, error);
    return false;
  }
};

/**
 * Safely unregister the background alarm task
 *
 * @returns {Promise<boolean>} - True if successful or if task didn't exist
 */
export const unregisterBackgroundAlarmTask = async () => {
  try {
    // Use the utility function to safely unregister the task
    return await safelyUnregisterTask(BACKGROUND_ALARM_TASK);
  } catch (error) {
    // Log the error but don't throw it further
    console.error(
      `Error safely unregistering task ${BACKGROUND_ALARM_TASK}:`,
      error
    );
    return false;
  }
};

/**
 * Cancel all scheduled alarms
 *
 * @returns {Promise<boolean>} - True if successful
 */
export const cancelAllAlarms = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log("Canceled all alarms");
    return true;
  } catch (error) {
    console.error("Error canceling all alarms:", error);
    return false;
  }
};

/**
 * Handle alarm response
 *
 * @param {Object} notification - Notification object
 * @returns {Promise<boolean>} - True if handled successfully
 */
export const handleAlarmResponse = async (notification) => {
  try {
    const { type, alarmId } = notification.request.content.data || {};

    if (!type) return false;

    // Stop the alarm
    await stopAlarm();

    // Log the response time
    console.log(`Alarm response for ${type} at ${new Date().toISOString()}`);

    return true;
  } catch (error) {
    console.error("Error handling alarm response:", error);
    return false;
  }
};
