// Fix the import paths to correctly point to the utils directory
import { getActiveShift, getAttendanceLogByType, getNotes, getShiftById } from "../utils/database"
import { formatDate } from "../utils/dateUtils"
import {
  scheduleAlarm,
  cancelAlarmsByType,
  cancelAllAlarms,
  initializeAlarmSystem,
  triggerAlarmNow,
} from "../utils/alarmUtils"

