/**
 * WorkStatusContext2 - Context quản lý trạng thái công việc
 *
 * Context này quản lý trạng thái công việc của người dùng, bao gồm:
 * - Trạng thái hiện tại (idle, go_work, check_in, punch, check_out, complete)
 * - Thời gian của các hành động
 * - Lịch sử các hành động
 * - Các hàm cập nhật trạng thái
 */

import { createContext, useState, useContext, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { format } from "date-fns";
import { saveWorkLog, updateDailyWorkStatus } from "../utils/database";
import { calculateWorkStatus } from "../utils/workStatusCalculator";
import { useShift } from "./ShiftContext";
import {
  cancelNotificationByType,
  scheduleNotification,
} from "../utils/notificationService";
import { STORAGE_KEYS } from "../utils/STORAGE_KEYS";

// Create context
const WorkStatusContext2 = createContext();

// Work status provider component
export function WorkStatusProvider2({ children }) {
  const { currentShift } = useShift();
  const [workStatus, setWorkStatus] = useState({
    status: "idle", // idle, go_work, check_in, punch, check_out, complete
    goToWorkTime: null,
    checkInTime: null,
    punchTime: null,
    checkOutTime: null,
    completeTime: null,
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [actionHistory, setActionHistory] = useState([]);
  const [weeklyStatusRefreshTrigger, setWeeklyStatusRefreshTrigger] =
    useState(0);
  const [isButtonDisabled, setIsButtonDisabled] = useState(false);

  // Load saved work status
  useEffect(() => {
    loadWorkStatus();
  }, []);

  // Auto reset after 2 hours of shift end or at midnight
  useEffect(() => {
    const checkAndResetStatus = async () => {
      // Reset at midnight
      const now = new Date();
      const currentDate = format(now, "yyyy-MM-dd");

      if (workStatus.date !== currentDate) {
        await resetWorkStatus();
        return;
      }

      // Reset after 2 hours of shift end
      if (
        workStatus.status === "complete" ||
        workStatus.status === "check_out"
      ) {
        const endTime = workStatus.completeTime || workStatus.checkOutTime;
        if (endTime) {
          const endDate = new Date(endTime);
          const hoursDiff = (now - endDate) / (1000 * 60 * 60); // Convert to hours

          if (hoursDiff >= 2) {
            await resetWorkStatus();
          }
        }
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkAndResetStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [workStatus]);

  // Kiểm tra và cập nhật trạng thái nút dựa vào thời gian
  useEffect(() => {
    if (!currentShift) return;

    const checkButtonStatus = () => {
      const now = new Date();
      const currentTime = format(now, "HH:mm");

      switch (workStatus.status) {
        case "go_work":
          // Nút Chấm Công Vào chỉ được bấm khi gần đến giờ bắt đầu ca
          if (currentShift.startTime) {
            const [startHour, startMinute] = currentShift.startTime
              .split(":")
              .map(Number);
            const startDate = new Date();
            startDate.setHours(startHour, startMinute, 0);

            // Cho phép bấm nút trước giờ bắt đầu 30 phút
            const timeDiff = (startDate - now) / (1000 * 60); // Convert to minutes
            setIsButtonDisabled(timeDiff > 30);
          }
          break;

        case "check_in":
          // Nút Chấm Công Ra chỉ được bấm sau khi đã làm việc đủ số giờ tối thiểu
          if (workStatus.checkInTime && currentShift.minWorkHours) {
            const checkInDate = new Date(workStatus.checkInTime);
            const minWorkMs = currentShift.minWorkHours * 60 * 60 * 1000; // Convert to milliseconds
            const canCheckOut = now - checkInDate >= minWorkMs;

            setIsButtonDisabled(!canCheckOut);
          }
          break;

        default:
          setIsButtonDisabled(false);
      }
    };

    // Kiểm tra mỗi phút
    const interval = setInterval(checkButtonStatus, 60 * 1000);
    checkButtonStatus(); // Kiểm tra ngay lập tức

    return () => clearInterval(interval);
  }, [workStatus.status, workStatus.checkInTime, currentShift]);

  const loadWorkStatus = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Lấy logs của ngày hiện tại
      const logsKey = `${STORAGE_KEYS.WORK_LOGS_BY_DATE_PREFIX}${today}`;
      const logsJson = await AsyncStorage.getItem(logsKey);
      const logs = logsJson ? JSON.parse(logsJson) : [];

      // Cập nhật lịch sử hành động
      setActionHistory(
        logs.map((log) => ({
          action: log.type,
          timestamp: log.timestamp,
        }))
      );

      // Xác định trạng thái dựa trên logs
      let status = "idle";
      let goToWorkTime = null;
      let checkInTime = null;
      let punchTime = null;
      let checkOutTime = null;
      let completeTime = null;

      for (const log of logs) {
        switch (log.type) {
          case "go_work":
            status = "go_work";
            goToWorkTime = log.timestamp;
            break;
          case "check_in":
            status = "check_in";
            checkInTime = log.timestamp;
            break;
          case "punch":
            status = "punch";
            punchTime = log.timestamp;
            break;
          case "check_out":
            status = "check_out";
            checkOutTime = log.timestamp;
            break;
          case "complete":
            status = "complete";
            completeTime = log.timestamp;
            break;
        }
      }

      setWorkStatus({
        status,
        goToWorkTime,
        checkInTime,
        punchTime,
        checkOutTime,
        completeTime,
        date: today,
      });
    } catch (error) {
      console.error("Failed to load work status:", error);
    }
  };

  const updateWorkStatus = async (action, timestamp) => {
    try {
      const today = format(timestamp, "yyyy-MM-dd");
      const logsKey = `${STORAGE_KEYS.WORK_LOGS_BY_DATE_PREFIX}${today}`;

      // Lấy logs hiện tại
      const logsJson = await AsyncStorage.getItem(logsKey);
      const logs = logsJson ? JSON.parse(logsJson) : [];

      // Thêm log mới
      const newLog = {
        type: action,
        timestamp: timestamp.toISOString(),
        shiftId: currentShift?.id,
      };

      logs.push(newLog);

      // Lưu logs
      await AsyncStorage.setItem(logsKey, JSON.stringify(logs));

      // Cập nhật trạng thái công việc
      const newStatus = { ...workStatus };

      switch (action) {
        case "go_work":
          newStatus.status = "go_work";
          newStatus.goToWorkTime = timestamp.toISOString();
          break;
        case "check_in":
          newStatus.status = "check_in";
          newStatus.checkInTime = timestamp.toISOString();
          break;
        case "punch":
          newStatus.status = "punch";
          newStatus.punchTime = timestamp.toISOString();
          break;
        case "check_out":
          newStatus.status = "check_out";
          newStatus.checkOutTime = timestamp.toISOString();
          break;
        case "complete":
          newStatus.status = "complete";
          newStatus.completeTime = timestamp.toISOString();
          break;
      }

      setWorkStatus(newStatus);

      // Cập nhật trạng thái hàng ngày
      await updateDailyWorkStatus(today, {
        status: calculateWorkStatus(newStatus),
        checkInTime: newStatus.checkInTime,
        checkOutTime: newStatus.checkOutTime,
        shiftId: currentShift?.id,
      });

      // Kích hoạt cập nhật lưới trạng thái tuần
      setWeeklyStatusRefreshTrigger((prev) => prev + 1);

      return true;
    } catch (error) {
      console.error("Failed to update work status:", error);
      return false;
    }
  };

  const resetWorkStatus = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const logsKey = `${STORAGE_KEYS.WORK_LOGS_BY_DATE_PREFIX}${today}`;

      // Xóa logs
      await AsyncStorage.removeItem(logsKey);

      // Reset trạng thái
      setWorkStatus({
        status: "idle",
        goToWorkTime: null,
        checkInTime: null,
        punchTime: null,
        checkOutTime: null,
        completeTime: null,
        date: today,
      });

      // Xóa lịch sử hành động
      setActionHistory([]);

      // Cập nhật trạng thái hàng ngày
      await updateDailyWorkStatus(today, {
        status: "not_updated",
        checkInTime: null,
        checkOutTime: null,
        shiftId: null,
      });

      // Kích hoạt cập nhật lưới trạng thái tuần
      setWeeklyStatusRefreshTrigger((prev) => prev + 1);

      // Kích hoạt lại các lịch nhắc nhở cho ngày hiện tại
      if (currentShift) {
        // Lên lịch lại các thông báo
        const alarmTypes = ["go_work", "check_in", "check_out"];
        if (currentShift.showPunch) {
          alarmTypes.push("punch");
        }

        for (const type of alarmTypes) {
          await scheduleNotification(type, today, currentShift);
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to reset work status:", error);
      return false;
    }
  };

  return (
    <WorkStatusContext2.Provider
      value={{
        workStatus,
        actionHistory,
        isButtonDisabled,
        updateWorkStatus,
        resetWorkStatus,
        weeklyStatusRefreshTrigger,
      }}
    >
      {children}
    </WorkStatusContext2.Provider>
  );
}

// Custom hook for using work status
export function useWorkStatus2() {
  const context = useContext(WorkStatusContext2);
  if (!context) {
    throw new Error("useWorkStatus2 must be used within a WorkStatusProvider2");
  }
  return context;
}