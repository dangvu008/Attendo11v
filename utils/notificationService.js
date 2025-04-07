import AsyncStorage from "@react-native-async-storage/async-storage";
import { calculateAlarmTime, getNextDayOfWeek } from "./timeUtils";
import * as Device from "expo-device";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

// Storage keys for notification IDs
const NOTIFICATION_IDS_KEY = "attendo_notification_ids";
const SHIFT_NOTIFICATION_PREFIX = "shift_notification_";
const NOTE_NOTIFICATION_PREFIX = "note_notification_";

/**
 * Initialize notifications and request permissions
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const initNotifications = async () => {
  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("Notification permissions not granted");
      return false;
    }

    // Configure notification behavior
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    return true;
  } catch (error) {
    console.error("Failed to initialize notifications:", error);
    return false;
  }
};

/**
 * Schedule a notification and store its ID
 * @param {Object} options - Notification options
 * @returns {Promise<string|null>} Notification ID or null if failed
 */
export const scheduleNotification = async (options) => {
  try {
    // Check if we have permission
    const hasPermission = await initNotifications();
    if (!hasPermission) {
      return null;
    }

    // Ensure we have a valid identifier
    const identifier = options.identifier || `notification_${Date.now()}`;

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data || {},
      },
      trigger: options.date ? { date: options.date } : null,
      identifier: identifier,
    });

    // Store the notification ID for later cancellation
    await storeNotificationId(identifier, notificationId);

    return notificationId;
  } catch (error) {
    console.error("Failed to schedule notification:", error);
    return null;
  }
};

/**
 * Store a notification ID for later cancellation
 * @param {string} key - Key to identify the notification
 * @param {string} notificationId - Notification ID
 */
const storeNotificationId = async (key, notificationId) => {
  try {
    // Get existing notification IDs
    const idsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : {};

    // Add new ID
    ids[key] = notificationId;

    // Save back to storage
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Failed to store notification ID:", error);
  }
};

/**
 * Get a stored notification ID
 * @param {string} key - Key to identify the notification
 * @returns {Promise<string|null>} Notification ID or null if not found
 */
const getNotificationId = async (key) => {
  try {
    const idsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : {};
    return ids[key] || null;
  } catch (error) {
    console.error("Failed to get notification ID:", error);
    return null;
  }
};

/**
 * Remove a stored notification ID
 * @param {string} key - Key to identify the notification
 */
const removeNotificationId = async (key) => {
  try {
    const idsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : {};

    // Remove the ID
    delete ids[key];

    // Save back to storage
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Failed to remove notification ID:", error);
  }
};

/**
 * Cancel a notification by type and date
 * @param {string} type - Notification type
 * @param {string} date - Date string
 */
export const cancelNotificationByType = async (type, date) => {
  try {
    const key = `${type}_${date}`;
    const notificationId = await getNotificationId(key);

    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await removeNotificationId(key);
    }
  } catch (error) {
    console.error("Failed to cancel notification:", error);
  }
};

/**
 * Schedule notifications for a shift
 * @param {Object} shift - Shift data
 */
export const scheduleShiftNotifications = async (shift) => {
  try {
    // Check if we have permission
    const hasPermission = await initNotifications();
    if (!hasPermission) {
      return;
    }

    // Cancel any existing notifications for this shift
    await cancelShiftNotifications(shift.id);

    // For each day the shift applies to
    for (const dayIndex of shift.days) {
      // Get the next occurrence of this day
      const nextDate = getNextDayOfWeek(dayIndex);

      // Set up departure time notification
      if (shift.departureTime && shift.remindBeforeStart) {
        const [hours, minutes] = shift.departureTime.split(":").map(Number);
        const departureDate = new Date(nextDate);
        departureDate.setHours(hours, minutes, 0, 0);

        // Calculate alarm time (before departure)
        const alarmTime = calculateAlarmTime(
          departureDate,
          shift.remindBeforeStart
        );

        if (alarmTime) {
          const notificationKey = `${SHIFT_NOTIFICATION_PREFIX}${shift.id}_departure_${dayIndex}`;

          // Check if we already have this notification scheduled
          const existingId = await getNotificationId(notificationKey);
          if (!existingId) {
            await scheduleNotification({
              title: "Time to Leave",
              body: `It's time to leave for your ${shift.name} shift`,
              date: alarmTime,
              data: { type: "shift_departure", shiftId: shift.id },
              identifier: notificationKey,
            });
          }
        }
      }

      // Set up end time notification
      if (shift.endTime && shift.remindAfterEnd) {
        const [hours, minutes] = shift.endTime.split(":").map(Number);
        const endDate = new Date(nextDate);
        endDate.setHours(hours, minutes, 0, 0);

        // Handle overnight shifts
        const [startHours, startMinutes] = shift.startTime
          .split(":")
          .map(Number);
        const startDate = new Date(nextDate);
        startDate.setHours(startHours, startMinutes, 0, 0);

        // If end time is before start time, it's the next day
        if (endDate < startDate) {
          endDate.setDate(endDate.getDate() + 1);
        }

        const notificationKey = `${SHIFT_NOTIFICATION_PREFIX}${shift.id}_end_${dayIndex}`;

        // Check if we already have this notification scheduled
        const existingId = await getNotificationId(notificationKey);
        if (!existingId) {
          await scheduleNotification({
            title: "Shift Ended",
            body: `Your ${shift.name} shift has ended`,
            date: endDate,
            data: { type: "shift_end", shiftId: shift.id },
            identifier: notificationKey,
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to schedule shift notifications:", error);
  }
};

/**
 * Cancel all notifications for a shift
 * @param {string} shiftId - Shift ID
 */
export const cancelShiftNotifications = async (shiftId) => {
  try {
    const idsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : {};

    // Find all notification IDs for this shift
    const prefix = `${SHIFT_NOTIFICATION_PREFIX}${shiftId}`;
    const keysToRemove = Object.keys(ids).filter((key) =>
      key.startsWith(prefix)
    );

    // Cancel each notification
    for (const key of keysToRemove) {
      const notificationId = ids[key];
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        delete ids[key];
      }
    }

    // Save updated IDs
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Failed to cancel shift notifications:", error);
  }
};

/**
 * Schedule notifications for a note
 * @param {Object} note - Note data
 * @param {Array} shifts - Shifts data
 */
export const scheduleNoteNotifications = async (note, shifts) => {
  if (!note.reminderTime) return;

  try {
    // Check if we have permission
    const hasPermission = await initNotifications();
    if (!hasPermission) return;

    // Cancel any existing notifications for this note
    await cancelNoteNotifications(note.id);

    // Determine reminder days
    let reminderDays = [];

    // If note is linked to shifts
    if (note.associatedShiftIds && note.associatedShiftIds.length > 0) {
      // Get all days from linked shifts
      note.associatedShiftIds.forEach((shiftId) => {
        const shift = shifts.find((s) => s.id === shiftId);
        if (shift && shift.days) {
          // Add non-duplicate days
          shift.days.forEach((day) => {
            if (!reminderDays.includes(day)) {
              reminderDays.push(day);
            }
          });
        }
      });
    }
    // If note is not linked to shifts
    else if (
      note.explicitReminderDays &&
      note.explicitReminderDays.length > 0
    ) {
      reminderDays = note.explicitReminderDays;
    }

    // If no days, don't schedule
    if (reminderDays.length === 0) return;

    // Get reminder time
    const reminderDate = new Date(note.reminderTime);
    const hours = reminderDate.getHours();
    const minutes = reminderDate.getMinutes();

    // Schedule for each day
    for (const dayIndex of reminderDays) {
      // Get next occurrence of this day
      const nextDate = getNextDayOfWeek(dayIndex);
      nextDate.setHours(hours, minutes, 0, 0);

      // If time has passed, move to next week
      const now = new Date();
      if (nextDate < now) {
        nextDate.setDate(nextDate.getDate() + 7);
      }

      const notificationKey = `${NOTE_NOTIFICATION_PREFIX}${note.id}_${dayIndex}`;

      // Check if we already have this notification scheduled
      const existingId = await getNotificationId(notificationKey);
      if (!existingId) {
        await scheduleNotification({
          title: note.title,
          body: note.content,
          date: nextDate,
          data: { type: "note", noteId: note.id },
          identifier: notificationKey,
        });
      }
    }
  } catch (error) {
    console.error("Failed to schedule note notifications:", error);
  }
};

/**
 * Cancel all notifications for a note
 * @param {string} noteId - Note ID
 */
export const cancelNoteNotifications = async (noteId) => {
  try {
    const idsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    const ids = idsJson ? JSON.parse(idsJson) : {};

    // Find all notification IDs for this note
    const prefix = `${NOTE_NOTIFICATION_PREFIX}${noteId}`;
    const keysToRemove = Object.keys(ids).filter((key) =>
      key.startsWith(prefix)
    );

    // Cancel each notification
    for (const key of keysToRemove) {
      const notificationId = ids[key];
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        delete ids[key];
      }
    }

    // Save updated IDs
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Failed to cancel note notifications:", error);
  }
};

// Đăng ký thiết bị để nhận thông báo
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("weather-alerts", {
      name: "Cảnh Báo Thời Tiết",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Không thể lấy quyền thông báo!");
      return;
    }

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      })
    ).data;
  } else {
    console.log("Phải sử dụng thiết bị vật lý cho thông báo");
  }

  return token;
}

// Gửi thông báo cục bộ
export async function sendLocalNotification(title, body, data = {}) {
  try {
    const notificationContent = {
      title,
      body,
      data,
      sound: true,
      priority: "high",
    };

    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // null để thông báo hiển thị ngay lập tức
    });

    return true;
  } catch (error) {
    console.error("Lỗi khi gửi thông báo:", error);
    return false;
  }
}

// Gửi thông báo cảnh báo thời tiết
export async function sendWeatherAlert(message, departureTime) {
  // Tạo ID duy nhất cho thông báo dựa trên thời gian đi làm
  // Điều này đảm bảo chỉ có một thông báo cho mỗi ca làm việc
  const departureDate = new Date(departureTime);
  const notificationId = `weather-alert-${departureDate.toDateString()}-${departureDate.getHours()}`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cảnh Báo Thời Tiết",
        body: message,
        data: { screen: "HomeScreen", type: "weatherAlert" },
        sound: true,
      },
      trigger: null, // Hiển thị ngay lập tức
      identifier: notificationId,
    });

    return notificationId;
  } catch (error) {
    console.error("Lỗi khi gửi cảnh báo thời tiết:", error);
    return null;
  }
}

// Hủy một thông báo cụ thể
export async function cancelNotification(notificationId) {
  if (!notificationId) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Lỗi khi hủy thông báo:", error);
  }
}

// Hủy tất cả thông báo
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Lỗi khi hủy tất cả thông báo:", error);
  }
}
