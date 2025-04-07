/**
 * Alarm Manager - Module quản lý thông báo thông minh
 *
 * Giải quyết các vấn đề:
 * 1. Ngăn chặn tạo trùng lặp thông báo
 * 2. Quản lý ID thông báo để dễ dàng hủy
 * 3. Đảm bảo thời gian thông báo chính xác
 * 4. Hỗ trợ ca làm việc qua ngày mới
 */

import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./database";
import { Platform } from "react-native";

// Khai báo các loại thông báo
export const ALARM_TYPES = {
  DEPARTURE: "departure",
  CHECK_IN: "check_in",
  CHECK_OUT: "check_out",
  REMINDER: "reminder",
};

// Định danh cho các thông báo
export const NOTIFICATION_CHANNELS = {
  DEPARTURE: "attendo_departure",
  CHECK_IN: "attendo_check_in",
  CHECK_OUT: "attendo_check_out",
  REMINDER: "attendo_reminder",
};

// Key lưu trữ ID thông báo trong AsyncStorage
const ALARM_STORAGE_KEY = "attendo_alarm_ids";

/**
 * Khởi tạo hệ thống thông báo
 */
export const initializeAlarmManager = async () => {
  try {
    // Yêu cầu quyền thông báo
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("Notification permissions not granted");
      return false;
    }

    // Cấu hình thông báo khi ứng dụng trong foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Tạo notification channels cho Android
    if (Platform.OS === "android") {
      await setupNotificationChannels();
    }

    return true;
  } catch (error) {
    console.error("Error initializing alarm manager:", error);
    return false;
  }
};

/**
 * Tạo các kênh thông báo cho Android
 */
const setupNotificationChannels = async () => {
  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNELS.DEPARTURE,
    {
      name: "Thông báo xuất phát đi làm",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: true,
    }
  );

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNELS.CHECK_IN,
    {
      name: "Thông báo chấm công vào",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: true,
    }
  );

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNELS.CHECK_OUT,
    {
      name: "Thông báo chấm công ra",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: true,
    }
  );

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNELS.REMINDER,
    {
      name: "Các thông báo nhắc nhở",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: true,
    }
  );
};

/**
 * Lưu ID thông báo theo loại
 * @param {string} type - Loại thông báo
 * @param {string} id - ID thông báo
 * @param {object} metadata - Thông tin bổ sung (tùy chọn)
 */
export const saveAlarmId = async (type, id, metadata = {}) => {
  try {
    // Lấy danh sách ID hiện tại
    const storedIdsJSON = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    const storedIds = storedIdsJSON ? JSON.parse(storedIdsJSON) : {};

    // Thêm ID mới với timestamp để biết khi nào được tạo
    storedIds[type] = {
      id,
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Lưu lại
    await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(storedIds));
    console.log(`Saved alarm ID for type ${type}: ${id}`);
    return true;
  } catch (error) {
    console.error("Error saving alarm ID:", error);
    return false;
  }
};

/**
 * Lấy ID thông báo theo loại
 * @param {string} type - Loại thông báo
 * @returns {object|null} - Object chứa id và metadata hoặc null nếu không tìm thấy
 */
export const getAlarmId = async (type) => {
  try {
    const storedIdsJSON = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    if (!storedIdsJSON) return null;

    const storedIds = JSON.parse(storedIdsJSON);
    return storedIds[type] || null;
  } catch (error) {
    console.error("Error getting alarm ID:", error);
    return null;
  }
};

/**
 * Kiểm tra xem thông báo đã tồn tại chưa
 * @param {string} type - Loại thông báo
 * @returns {boolean} - true nếu đã tồn tại
 */
export const isAlarmScheduled = async (type) => {
  const alarmData = await getAlarmId(type);
  return !!alarmData;
};

/**
 * Xóa ID thông báo theo loại
 * @param {string} type - Loại thông báo
 */
export const removeAlarmId = async (type) => {
  try {
    const storedIdsJSON = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    if (!storedIdsJSON) return true;

    const storedIds = JSON.parse(storedIdsJSON);

    if (storedIds[type]) {
      delete storedIds[type];
      await AsyncStorage.setItem(ALARM_STORAGE_KEY, JSON.stringify(storedIds));
      console.log(`Removed alarm ID for type ${type}`);
    }

    return true;
  } catch (error) {
    console.error("Error removing alarm ID:", error);
    return false;
  }
};

/**
 * Xóa tất cả ID thông báo
 */
export const clearAllAlarmIds = async () => {
  try {
    await AsyncStorage.removeItem(ALARM_STORAGE_KEY);
    console.log("Cleared all alarm IDs");
    return true;
  } catch (error) {
    console.error("Error clearing alarm IDs:", error);
    return false;
  }
};

/**
 * Lên lịch thông báo với cơ chế chống trùng lặp
 * @param {Object} options - Tùy chọn thông báo
 * @param {string} options.type - Loại thông báo (departure, check_in, ...)
 * @param {string} options.title - Tiêu đề thông báo
 * @param {string} options.body - Nội dung thông báo
 * @param {Date} options.triggerTime - Thời gian kích hoạt
 * @param {Object} options.data - Dữ liệu bổ sung
 * @param {boolean} options.sound - Bật/tắt âm thanh
 * @param {boolean} options.vibrate - Bật/tắt rung
 * @param {string} options.channelId - ID kênh thông báo (Android)
 * @param {boolean} options.replace - Thay thế thông báo cũ cùng loại
 * @returns {Promise<string|null>} - ID thông báo hoặc null nếu lỗi
 */
export const scheduleAlarm = async ({
  type,
  title,
  body,
  triggerTime,
  data = {},
  sound = true,
  vibrate = true,
  channelId = undefined,
  replace = true,
}) => {
  try {
    // Kiểm tra các tham số bắt buộc
    if (!type || !title || !body || !triggerTime) {
      console.error("Missing required parameters for scheduling alarm");
      return null;
    }

    // Lấy cài đặt người dùng
    const settingsStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};

    // Áp dụng cài đặt người dùng nếu có
    const soundEnabled =
      settings.soundEnabled !== undefined ? settings.soundEnabled : sound;
    const vibrationEnabled =
      settings.vibrationEnabled !== undefined
        ? settings.vibrationEnabled
        : vibrate;

    // Tính toán thời gian kích hoạt
    const now = new Date();
    const triggerAt = triggerTime.getTime();

    // Kiểm tra nếu thời gian trong quá khứ
    if (triggerAt <= now.getTime()) {
      console.log(
        `Alarm trigger time is in the past: ${triggerTime.toLocaleString()}, not scheduling`
      );
      return null;
    }

    // Nếu đã có thông báo cùng loại và không thay thế, trả về null
    if (!replace) {
      const existingAlarm = await getAlarmId(type);
      if (existingAlarm) {
        console.log(`Alarm of type ${type} already exists and replace=false`);
        return existingAlarm.id;
      }
    }

    // Nếu thay thế, hủy thông báo cũ
    if (replace) {
      await cancelAlarm(type);
    }

    // Xác định kênh thông báo cho Android
    let androidChannel = channelId;
    if (!androidChannel && Platform.OS === "android") {
      switch (type) {
        case ALARM_TYPES.DEPARTURE:
          androidChannel = NOTIFICATION_CHANNELS.DEPARTURE;
          break;
        case ALARM_TYPES.CHECK_IN:
          androidChannel = NOTIFICATION_CHANNELS.CHECK_IN;
          break;
        case ALARM_TYPES.CHECK_OUT:
          androidChannel = NOTIFICATION_CHANNELS.CHECK_OUT;
          break;
        default:
          androidChannel = NOTIFICATION_CHANNELS.REMINDER;
      }
    }

    // Tạo thông báo với Expo Notifications
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
        ...(Platform.OS === "android" && { channelId: androidChannel }),
      },
      trigger: {
        date: triggerTime,
      },
    });

    // Lưu ID thông báo
    const metadata = {
      title,
      body,
      scheduledFor: triggerTime.toISOString(),
      createdAt: new Date().toISOString(),
    };
    await saveAlarmId(type, notificationId, metadata);

    console.log(
      `Scheduled alarm for ${triggerTime.toLocaleString()}, ID: ${notificationId}, Type: ${type}`
    );
    return notificationId;
  } catch (error) {
    console.error("Error scheduling alarm:", error);
    return null;
  }
};

/**
 * Lên lịch thông báo xuất phát
 * @param {Object} shift - Ca làm việc
 * @param {Date} date - Ngày (tùy chọn, mặc định là ngày hiện tại)
 */
export const scheduleDepartureAlarm = async (shift, date = new Date()) => {
  if (!shift || !shift.departureTime) {
    console.log("Invalid shift or missing departure time");
    return null;
  }

  try {
    // Tạo thời gian xuất phát từ chuỗi HH:MM
    const [hours, minutes] = shift.departureTime.split(":").map(Number);

    // Sử dụng ngày đã cho hoặc ngày hiện tại
    const triggerTime = new Date(date);
    triggerTime.setHours(hours, minutes, 0, 0);

    // Nếu thời gian đã qua, không lên lịch
    if (triggerTime <= new Date()) {
      console.log("Departure time already passed for today");
      return null;
    }

    return await scheduleAlarm({
      type: ALARM_TYPES.DEPARTURE,
      title: "Đến giờ đi làm",
      body: `Đã đến giờ xuất phát đi làm cho ca ${shift.name}`,
      triggerTime,
      data: { shiftId: shift.id },
      channelId: NOTIFICATION_CHANNELS.DEPARTURE,
    });
  } catch (error) {
    console.error("Error scheduling departure alarm:", error);
    return null;
  }
};

/**
 * Lên lịch thông báo chấm công vào
 * @param {Object} shift - Ca làm việc
 * @param {Date} date - Ngày (tùy chọn, mặc định là ngày hiện tại)
 */
export const scheduleCheckInAlarm = async (shift, date = new Date()) => {
  if (!shift || !shift.startTime) {
    console.log("Invalid shift or missing start time");
    return null;
  }

  try {
    // Tạo thời gian bắt đầu từ chuỗi HH:MM
    const [hours, minutes] = shift.startTime.split(":").map(Number);

    // Sử dụng ngày đã cho hoặc ngày hiện tại
    const startTime = new Date(date);
    startTime.setHours(hours, minutes, 0, 0);

    // Tính thời gian nhắc nhở trước khi bắt đầu (mặc định 15 phút)
    const reminderTime = new Date(startTime);
    const reminderMinutes = shift.remindBeforeStart || 15;
    reminderTime.setMinutes(reminderTime.getMinutes() - reminderMinutes);

    // Nếu thời gian nhắc nhở đã qua, không lên lịch
    if (reminderTime <= new Date()) {
      console.log("Check-in reminder time already passed for today");
      return null;
    }

    // Lên lịch nhắc nhở trước giờ chấm công
    return await scheduleAlarm({
      type: ALARM_TYPES.CHECK_IN,
      title: "Sắp đến giờ chấm công vào",
      body: `Còn ${reminderMinutes} phút nữa đến giờ chấm công vào cho ca ${shift.name}`,
      triggerTime: reminderTime,
      data: { shiftId: shift.id, reminderMinutes },
      channelId: NOTIFICATION_CHANNELS.CHECK_IN,
    });
  } catch (error) {
    console.error("Error scheduling check-in alarm:", error);
    return null;
  }
};

/**
 * Lên lịch thông báo chấm công ra
 * @param {Object} shift - Ca làm việc
 * @param {Date} date - Ngày (tùy chọn, mặc định là ngày hiện tại)
 */
export const scheduleCheckOutAlarm = async (shift, date = new Date()) => {
  if (!shift || !shift.endTime) {
    console.log("Invalid shift or missing end time");
    return null;
  }

  try {
    // Tạo thời gian kết thúc từ chuỗi HH:MM
    const [hours, minutes] = shift.endTime.split(":").map(Number);

    // Sử dụng ngày đã cho hoặc ngày hiện tại
    const endTime = new Date(date);
    endTime.setHours(hours, minutes, 0, 0);

    // Xử lý ca làm việc qua ngày
    if (hours < 12 && new Date().getHours() > 12) {
      // Giả sử ca đêm kết thúc vào sáng hôm sau
      endTime.setDate(endTime.getDate() + 1);
    }

    // Nếu thời gian đã qua, không lên lịch
    if (endTime <= new Date()) {
      console.log("Check-out time already passed");
      return null;
    }

    return await scheduleAlarm({
      type: ALARM_TYPES.CHECK_OUT,
      title: "Đã đến giờ chấm công ra",
      body: `Đã đến giờ kết thúc ca ${shift.name}, hãy chấm công ra`,
      triggerTime: endTime,
      data: { shiftId: shift.id },
      channelId: NOTIFICATION_CHANNELS.CHECK_OUT,
    });
  } catch (error) {
    console.error("Error scheduling check-out alarm:", error);
    return null;
  }
};

/**
 * Hủy một thông báo theo loại
 * @param {string} type - Loại thông báo
 */
export const cancelAlarm = async (type) => {
  try {
    const alarmData = await getAlarmId(type);
    if (!alarmData) return true; // Không có thông báo để hủy

    const { id } = alarmData;

    // Hủy thông báo với Expo Notifications
    await Notifications.cancelScheduledNotificationAsync(id);

    // Xóa ID khỏi storage
    await removeAlarmId(type);

    console.log(`Canceled alarm of type ${type} with ID ${id}`);
    return true;
  } catch (error) {
    console.error(`Error canceling alarm of type ${type}:`, error);
    return false;
  }
};

/**
 * Hủy tất cả thông báo
 */
export const cancelAllAlarms = async () => {
  try {
    // Hủy tất cả thông báo với Expo Notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Xóa tất cả ID khỏi storage
    await clearAllAlarmIds();

    console.log("Canceled all alarms");
    return true;
  } catch (error) {
    console.error("Error canceling all alarms:", error);
    return false;
  }
};

/**
 * Kiểm tra và lên lịch tất cả thông báo cho một ca làm việc
 * @param {Object} shift - Ca làm việc
 */
export const scheduleAllAlarmsForShift = async (shift) => {
  if (!shift) return null;

  try {
    const today = new Date();

    // Lên lịch thông báo xuất phát
    const departureId = await scheduleDepartureAlarm(shift, today);

    // Lên lịch thông báo chấm công vào
    const checkInId = await scheduleCheckInAlarm(shift, today);

    // Lên lịch thông báo chấm công ra
    const checkOutId = await scheduleCheckOutAlarm(shift, today);

    return {
      departureId,
      checkInId,
      checkOutId,
    };
  } catch (error) {
    console.error("Error scheduling all alarms for shift:", error);
    return null;
  }
};

/**
 * Liệt kê tất cả các thông báo đã lên lịch
 * @returns {Promise<Array>} - Danh sách các thông báo
 */
export const listScheduledAlarms = async () => {
  try {
    const storedIdsJSON = await AsyncStorage.getItem(ALARM_STORAGE_KEY);
    if (!storedIdsJSON) return [];

    return JSON.parse(storedIdsJSON);
  } catch (error) {
    console.error("Error listing scheduled alarms:", error);
    return [];
  }
};

/**
 * Xử lý thông báo khi nhận được
 * @param {Object} notification - Đối tượng thông báo nhận được
 */
export const handleAlarmNotification = async (notification) => {
  try {
    const { type, alarmType, shiftId } =
      notification.request.content.data || {};

    // Chỉ xử lý thông báo của ứng dụng
    if (alarmType !== "attendo_alarm" || !type) return false;

    console.log(`Received alarm notification of type: ${type}`);

    // Xử lý theo loại thông báo
    switch (type) {
      case ALARM_TYPES.DEPARTURE:
        // Xử lý thông báo xuất phát
        console.log("Processing departure notification");
        break;

      case ALARM_TYPES.CHECK_IN:
        // Xử lý thông báo chấm công vào
        console.log("Processing check-in notification");
        break;

      case ALARM_TYPES.CHECK_OUT:
        // Xử lý thông báo chấm công ra
        console.log("Processing check-out notification");
        break;

      default:
        console.log(`Unknown alarm type: ${type}`);
    }

    // Xóa ID thông báo khỏi storage vì đã xử lý
    await removeAlarmId(type);

    return true;
  } catch (error) {
    console.error("Error handling alarm notification:", error);
    return false;
  }
};
