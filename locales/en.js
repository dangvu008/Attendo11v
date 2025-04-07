export const en = {
  // General
  timeManager: "Time Manager",
  settings: "Settings",
  statistics: "Statistics",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete",
  edit: "Edit",
  apply: "Apply",
  reset: "Reset",
  confirm: "Confirm",
  close: "Close",
  error: "Error",

  // Home Screen
  goToWork: "Go to Work",
  clockIn: "Clock In",
  clockOut: "Clock Out",
  completed: "Completed",
  notStarted: "Not Started",
  working: "Working",
  goneToWork: "Gone to Work:",
  clockedIn: "Clocked In:",
  clockedOut: "Clocked Out:",
  weeklyStatus: "Weekly Status",
  notes: "Notes",
  addNote: "Add Note",
  noNotes: "No notes yet",
  reminder: "Reminder",

  // Weekly Status
  status: "Status",
  checkIn: "Check In",
  checkOut: "Check Out",
  complete: "Complete",
  absent: "Absent",
  leave: "Leave",
  sick: "Sick",
  holiday: "Holiday",
  late: "Late",
  earlyLeave: "Early Leave",
  unknown: "Unknown",

  // Settings Screen
  workShifts: "Work Shifts",
  manageWorkShifts: "Manage your work shifts",
  generalSettings: "General Settings",
  darkMode: "Dark Mode",
  darkModeDescription: "Enable dark mode for better viewing in low light",
  language: "Language",
  notificationSound: "Notification Sound",
  notificationSoundDescription: "Play sound for notifications",
  vibration: "Vibration",
  vibrationDescription: "Vibrate when notifications arrive",
  multiActionButton: "Multi-Action Button",
  multiActionButtonDescription:
    'Show all check-in/out actions instead of just "Go to Work"',

  // Shift Management
  addNewShift: "Add New Shift",
  editShift: "Edit Shift",
  shiftName: "Shift Name",
  enterShiftName: "Enter shift name",
  departureTime: "Departure Time",
  startTime: "Start Time",
  endTime: "End Time",
  officeEndTime: "Office End Time",
  remindBeforeStart: "Remind Before Start",
  remindAfterEnd: "Remind After End",
  showSignButton: "Show Sign Button",
  applyToDays: "Apply to Days",
  minutes: "minutes",
  currentlyApplied: "Currently Applied",
  deleteShiftConfirmation: "Are you sure you want to delete this shift?",
  applyShiftConfirmation: "Apply this shift for the current week?",
  resetStatusConfirmation: "Reset today's work status?",
  cannotDeleteLastShift: "Cannot delete the last shift",
  nameRequired: "Shift name is required",
  nameTooLong: "Shift name is too long (max 200 characters)",
  nameInvalidChars: "Shift name contains invalid characters",
  nameAlreadyExists: "This shift name already exists",
  startBeforeEnd: "Start time must be before end time",
  departureBeforeStart:
    "Departure time must be at least 5 minutes before start time",
  startTimeBeforeOfficeEnd: "Start time must be before office end time",
  endTimeAfterOfficeEnd: "End time must be after or equal to office end time",
  minWorkingHours: "Working time must be at least 2 hours",
  minOvertimeMinutes: "If overtime exists, it must be at least 30 minutes",
  selectAtLeastOneDay: "Please select at least one day",
  failedToSaveShift: "Failed to save shift",

  // Notes
  addNewNote: "Add New Note",
  editNote: "Edit Note",
  title: "Title",
  enterTitle: "Enter title",
  content: "Content",
  enterContent: "Enter content",
  reminderTime: "Reminder Time",
  titleRequired: "Title is required",
  titleTooLong: "Title is too long (max 100 characters)",
  contentRequired: "Content is required",
  contentTooLong: "Content is too long (max 300 characters)",
  noteAlreadyExists: "A note with this title and content already exists",
  deleteNoteConfirmation: "Are you sure you want to delete this note?",
  saveNoteConfirmation: "Save this note?",
  updateNoteConfirmation: "Update this note?",
  failedToSaveNote: "Failed to save note",
  associatedShifts: "Associated Work Shifts (Optional)",
  noShiftsAvailable: "No work shifts available",
  explicitReminderDays: "Reminder Days (when no shift selected)",
  shift: "Shift",
  shifts: "Shifts",
  unknownShift: "Unknown shift",
  showMore: "Show more notes",

  // Statistics
  monthlyStatistics: "Monthly Statistics",
  date: "Date",
  day: "Day",
  regularHours: "Regular Hours",

  // Work Status
  failedToSaveWorkLog: "Failed to save work log",
  failedToUpdateStatus: "Failed to update status",

  // Weather
  weatherForecast: "Weather Forecast",
  weatherLoadError: "Failed to load weather data",
  weatherAlert: "Weather Alert",
  understood: "Understood",
  additionallyAlert: "Additionally,",
  prepareAccordingly: "Please prepare accordingly",
  heavyRain: "Heavy rain expected",
  coldWeather: "Cold weather expected",
  hotWeather: "Hot weather expected",
  stormWarning: "Storm warning",
  showSettings: "Show Settings",
  hideSettings: "Hide Settings",
  enableAlerts: "Enable Weather Alerts",
  alertRain: "Alert for Heavy Rain",
  alertCold: "Alert for Cold Weather",
  alertHeat: "Alert for Hot Weather",
  alertStorm: "Alert for Storms",
  weatherInitError: "Failed to initialize weather data",
  currentWeather: "Current Weather",
  next3Hours: "Next 3 Hours",
  loadingWeather: "Loading weather data...",

  // Weather conditions
  clear: "Clear",
  "partly-cloudy": "Partly Cloudy",
  cloudy: "Cloudy",
  rain: "Rain",
  "heavy-rain": "Heavy Rain",
  thunderstorm: "Thunderstorm",
  snow: "Snow",
  fog: "Fog",

  // Thêm các chuỗi dịch mới
  punch: "Punch",
  punched: "Punched:",
  totalWorkTime: "Total Work Time",
  overtime: "Overtime",
  activityLogs: "Activity Logs",
  noLogsForThisDay: "No activity logs for this day",
  locationPermissionDenied: "Location permission denied",
  failedToSaveSettings: "Failed to save settings",

  // Chọn ca làm việc
  selectShifts: "Select Work Shifts",
  noShiftSelected: "No shift selected",
  selectedShiftsCount: "{{count}} shifts selected",
  noShift: "No shift (use selected days)",

  // Weather alerts for going to work
  heavyRainAlert:
    "Heavy rain expected when going to work (around {{time}}), please bring an umbrella/raincoat.",
  coldWeatherAlert:
    "Low temperature (below 10°C) expected when going to work (around {{time}}), please dress warmly.",
  hotWeatherAlert:
    "High temperature (above 35°C) expected when going to work (around {{time}}), please protect yourself.",
  stormWarningAlert:
    "Storm/thunderstorm expected when going to work (around {{time}}), please be cautious.",

  // Weather alerts for returning from work
  heavyRainReturnAlert:
    "Heavy rain expected when leaving work (around {{time}}), please bring an umbrella/raincoat.",
  coldWeatherReturnAlert:
    "Low temperature (below 10°C) expected when leaving work (around {{time}}), please dress warmly.",
  hotWeatherReturnAlert:
    "High temperature (above 35°C) expected when leaving work (around {{time}}), please protect yourself.",
  stormWarningReturnAlert:
    "Storm/thunderstorm expected when leaving work (around {{time}}), please be cautious.",

  // Weather settings
  soundEnabled: "Enable alert sound",
  testSound: "Test sound",
};
