/**
 * Storage Keys - Định nghĩa các khóa lưu trữ dữ liệu
 *
 * File này định nghĩa tất cả các khóa được sử dụng để lưu trữ dữ liệu trong AsyncStorage
 * Việc tập trung các khóa vào một file giúp dễ dàng quản lý và tránh trùng lặp
 */

export const STORAGE_KEYS = {
  // Cài đặt người dùng
  USER_SETTINGS: "attendo_user_settings",

  // Dữ liệu ca làm việc
  SHIFTS: "attendo_shifts",
  ACTIVE_SHIFT: "attendo_active_shift",

  // Dữ liệu chấm công
  WORK_LOGS: "attendo_work_logs",
  WORK_STATUS: "attendo_work_status",
  DAILY_WORK_STATUS: "attendo_daily_work_status",

  // Ghi chú công việc
  NOTES: "attendo_notes",

  // Thời tiết
  WEATHER_SETTINGS: "@attendo/weather_settings",
  WEATHER_ALERTS_HISTORY: "@attendo/weather_alerts_history",

  // Khởi tạo ứng dụng
  INITIALIZED: "attendo_initialized",

  // Báo thức và thông báo
  ALARMS: "attendo_alarms",
  NOTIFICATIONS: "attendo_notifications",

  // Cấu hình nút đa năng
  MULTI_FUNCTION_BUTTON: "attendo_multi_function_button",

  // Prefix cho các khóa theo ngày
  WORK_LOGS_BY_DATE_PREFIX: "attendo_work_logs_",
  DAILY_STATUS_PREFIX: "attendo_daily_status_",
};
