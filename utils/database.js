import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseISO, isWithinInterval } from "date-fns";
import { v4 as uuidv4 } from "uuid";

// Database keys
const SHIFTS_KEY = "attendo_shifts";
const WORK_LOGS_KEY = "attendo_work_logs";
const WORK_STATUS_KEY = "attendo_work_status";
const NOTES_KEY = "attendo_notes";
const WEATHER_SETTINGS_KEY = "@attendo/weather_settings";
const INITIALIZED_KEY = "attendo_initialized";
const DAILY_WORK_STATUS_KEY = "attendo_daily_work_status";
const WEATHER_ALERTS_HISTORY_KEY = "@attendo/weather_alerts_history";

export const initializeDatabase = async () => {
  try {
    const initialized = await AsyncStorage.getItem(INITIALIZED_KEY);

    if (!initialized) {
      await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(WORK_LOGS_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(WORK_STATUS_KEY, JSON.stringify({}));
      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify([]));
      await AsyncStorage.setItem(
        WEATHER_SETTINGS_KEY,
        JSON.stringify({
          enabled: true,
          alertRain: true,
          alertCold: true,
          alertHeat: true,
          alertStorm: true,
        })
      );
      await AsyncStorage.setItem(INITIALIZED_KEY, "true");
    }
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

// Shifts
export const getShifts = async () => {
  try {
    const shiftsJson = await AsyncStorage.getItem(SHIFTS_KEY);
    return shiftsJson ? JSON.parse(shiftsJson) : [];
  } catch (error) {
    console.error("Failed to get shifts:", error);
    return [];
  }
};

export const saveShift = async (shift) => {
  try {
    const shifts = await getShifts();
    const newShift = {
      ...shift,
      id: shift.id || Date.now(),
    };

    shifts.push(newShift);
    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));

    return newShift.id;
  } catch (error) {
    console.error("Failed to save shift:", error);
    throw error;
  }
};

export const updateShiftById = async (shiftId, updatedShift) => {
  try {
    const shifts = await getShifts();
    const index = shifts.findIndex((shift) => shift.id === shiftId);

    if (index !== -1) {
      shifts[index] = {
        ...shifts[index],
        ...updatedShift,
        id: shiftId,
      };

      await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to update shift:", error);
    throw error;
  }
};

export const removeShift = async (shiftId) => {
  try {
    const shifts = await getShifts();
    const filteredShifts = shifts.filter((shift) => shift.id !== shiftId);

    await AsyncStorage.setItem(SHIFTS_KEY, JSON.stringify(filteredShifts));
    return true;
  } catch (error) {
    console.error("Failed to remove shift:", error);
    throw error;
  }
};

// Work Logs
export const getWorkLogs = async (startDate, endDate) => {
  try {
    const logsJson = await AsyncStorage.getItem(WORK_LOGS_KEY);
    const logs = logsJson ? JSON.parse(logsJson) : [];

    if (startDate && endDate) {
      return logs.filter((log) => {
        const logDate = parseISO(log.timestamp);
        return isWithinInterval(logDate, { start: startDate, end: endDate });
      });
    }

    return logs;
  } catch (error) {
    console.error("Failed to get work logs:", error);
    return [];
  }
};

export const saveWorkLog = async (log) => {
  try {
    const logs = await getWorkLogs();

    // Ensure timestamp has timezone information
    const timestamp = log.timestamp
      ? log.timestamp instanceof Date
        ? log.timestamp.toISOString()
        : log.timestamp
      : new Date().toISOString();

    const newLog = {
      ...log,
      id: Date.now(),
      timestamp: timestamp, // Ensure ISO format with timezone
    };

    logs.push(newLog);
    await AsyncStorage.setItem(WORK_LOGS_KEY, JSON.stringify(logs));

    return newLog.id;
  } catch (error) {
    console.error("Failed to save work log:", error);
    throw error;
  }
};

// Work Status
export const getWorkStatus = async (date) => {
  try {
    const statusJson = await AsyncStorage.getItem(WORK_STATUS_KEY);
    const allStatus = statusJson ? JSON.parse(statusJson) : {};

    return allStatus[date] || null;
  } catch (error) {
    console.error("Failed to get work status:", error);
    return null;
  }
};

export const saveWorkStatus = async (status) => {
  try {
    const statusJson = await AsyncStorage.getItem(WORK_STATUS_KEY);
    const allStatus = statusJson ? JSON.parse(statusJson) : {};

    allStatus[status.date] = status;
    await AsyncStorage.setItem(WORK_STATUS_KEY, JSON.stringify(allStatus));

    return true;
  } catch (error) {
    console.error("Failed to save work status:", error);
    throw error;
  }
};

export const updateWorkStatus = async (date, updates) => {
  try {
    const status = await getWorkStatus(date);

    if (status) {
      const updatedStatus = {
        ...status,
        ...updates,
      };

      return await saveWorkStatus(updatedStatus);
    }

    return false;
  } catch (error) {
    console.error("Failed to update work status:", error);
    throw error;
  }
};

// Notes
export const getNotes = async () => {
  try {
    const notesJson = await AsyncStorage.getItem(NOTES_KEY);
    return notesJson ? JSON.parse(notesJson) : [];
  } catch (error) {
    console.error("Failed to get notes:", error);
    return [];
  }
};

export const saveNote = async (note) => {
  try {
    const notes = await getNotes();

    // Ensure timestamps have timezone information
    const createdAt = note.createdAt
      ? note.createdAt instanceof Date
        ? note.createdAt.toISOString()
        : note.createdAt
      : new Date().toISOString();

    const updatedAt = new Date().toISOString();

    // Ensure reminderTime has timezone if it exists
    const reminderTime = note.reminderTime
      ? note.reminderTime instanceof Date
        ? note.reminderTime.toISOString()
        : note.reminderTime
      : null;

    const newNote = {
      ...note,
      id: note.id || uuidv4(), // Use UUID if no ID
      createdAt: createdAt,
      updatedAt: updatedAt,
      reminderTime: reminderTime,
    };

    notes.push(newNote);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));

    return newNote.id;
  } catch (error) {
    console.error("Failed to save note:", error);
    throw error;
  }
};

export const updateNote = async (noteId, updatedNote) => {
  try {
    const notes = await getNotes();
    const index = notes.findIndex((note) => note.id === noteId);

    if (index !== -1) {
      notes[index] = {
        ...notes[index],
        ...updatedNote,
        id: noteId,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
      return true;
    }

    return false;
  } catch (error) {
    console.error("Failed to update note:", error);
    throw error;
  }
};

export const deleteNote = async (noteId) => {
  try {
    const notes = await getNotes();
    const filteredNotes = notes.filter((note) => note.id !== noteId);

    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(filteredNotes));
    return true;
  } catch (error) {
    console.error("Failed to delete note:", error);
    throw error;
  }
};

// Weather Settings
export const getWeatherSettings = async () => {
  try {
    const settings = await AsyncStorage.getItem(WEATHER_SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }

    // Trả về giá trị mặc định nếu không có dữ liệu
    return {
      enabled: true,
      alertRain: true,
      alertCold: true,
      alertHeat: true,
      alertStorm: true,
      soundEnabled: true,
    };
  } catch (error) {
    console.error("Failed to get weather settings:", error);

    // Trả về giá trị mặc định nếu có lỗi
    return {
      enabled: true,
      alertRain: true,
      alertCold: true,
      alertHeat: true,
      alertStorm: true,
      soundEnabled: true,
    };
  }
};

export const saveWeatherSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(WEATHER_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error("Failed to save weather settings:", error);
    return false;
  }
};

// Daily Work Status
export const getDailyWorkStatus = async (date) => {
  try {
    const statusJson = await AsyncStorage.getItem(
      `${DAILY_WORK_STATUS_KEY}_${date}`
    );
    return statusJson ? JSON.parse(statusJson) : null;
  } catch (error) {
    console.error("Failed to get daily work status:", error);
    return null;
  }
};

export const updateDailyWorkStatus = async (date, status) => {
  try {
    await AsyncStorage.setItem(
      `${DAILY_WORK_STATUS_KEY}_${date}`,
      JSON.stringify(status)
    );
    return true;
  } catch (error) {
    console.error("Failed to update daily work status:", error);
    throw error;
  }
};

// Lưu thông tin cảnh báo thời tiết đã được hiển thị
// Mỗi ca làm việc chỉ cảnh báo một lần
export const saveWeatherAlertRecord = async (shiftDate, departureTime) => {
  try {
    // Tạo key duy nhất cho mỗi ca làm việc
    const shiftKey = `${
      new Date(shiftDate).toISOString().split("T")[0]
    }-${departureTime}`;

    // Lấy dữ liệu hiện tại (nếu có)
    let alertsHistory = await AsyncStorage.getItem(WEATHER_ALERTS_HISTORY_KEY);
    if (!alertsHistory) {
      alertsHistory = {};
    } else {
      alertsHistory = JSON.parse(alertsHistory);
    }

    // Thêm bản ghi mới với timestamp là thời điểm hiện tại
    alertsHistory[shiftKey] = {
      timestamp: new Date().toISOString(),
      alerted: true,
    };

    // Lưu lại dữ liệu
    await AsyncStorage.setItem(
      WEATHER_ALERTS_HISTORY_KEY,
      JSON.stringify(alertsHistory)
    );

    return true;
  } catch (error) {
    console.error("Failed to save weather alert record:", error);
    return false;
  }
};

// Kiểm tra xem ca làm việc đã được cảnh báo thời tiết chưa
export const hasShiftBeenAlerted = async (shiftDate, departureTime) => {
  try {
    // Tạo key duy nhất cho mỗi ca làm việc
    const shiftKey = `${
      new Date(shiftDate).toISOString().split("T")[0]
    }-${departureTime}`;

    // Lấy dữ liệu lịch sử cảnh báo
    const alertsHistory = await AsyncStorage.getItem(
      WEATHER_ALERTS_HISTORY_KEY
    );

    if (!alertsHistory) return false;

    const alerts = JSON.parse(alertsHistory);

    // Kiểm tra xem ca làm việc này đã được cảnh báo chưa
    return !!alerts[shiftKey]?.alerted;
  } catch (error) {
    console.error("Failed to check weather alert history:", error);
    return false;
  }
};

// Xóa lịch sử cảnh báo cũ (hơn 7 ngày)
export const cleanupOldAlerts = async () => {
  try {
    // Lấy dữ liệu hiện tại
    const alertsHistory = await AsyncStorage.getItem(
      WEATHER_ALERTS_HISTORY_KEY
    );

    if (!alertsHistory) return;

    const alerts = JSON.parse(alertsHistory);
    const now = new Date();
    const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));

    // Lọc ra các bản ghi còn mới (trong vòng 7 ngày)
    const updatedAlerts = {};

    Object.keys(alerts).forEach((key) => {
      const alertTime = new Date(alerts[key].timestamp);
      if (alertTime > oneWeekAgo) {
        updatedAlerts[key] = alerts[key];
      }
    });

    // Lưu lại dữ liệu đã lọc
    await AsyncStorage.setItem(
      WEATHER_ALERTS_HISTORY_KEY,
      JSON.stringify(updatedAlerts)
    );
  } catch (error) {
    console.error("Failed to cleanup old alerts:", error);
  }
};
