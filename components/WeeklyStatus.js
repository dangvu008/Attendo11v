"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import {
  getWorkLogs,
  getDailyWorkStatus,
  updateDailyWorkStatus,
} from "../utils/database";
import {
  getStatusIcon,
  getStatusColor,
  getDisplayStatus,
} from "../utils/workStatusCalculator";
import { useWorkStatus } from "../contexts/WorkStatusContext";

export default function WeeklyStatus() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();
  const { weeklyStatusRefreshTrigger } = useWorkStatus();

  const [weekDays, setWeekDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetails, setDayDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [workLogs, setWorkLogs] = useState({});
  const [dailyStatuses, setDailyStatuses] = useState({});

  // Tính toán các ngày trong tuần hiện tại
  useEffect(() => {
    const today = new Date();
    const startDay = startOfWeek(today, { weekStartsOn: 1 }); // Bắt đầu từ thứ 2

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDay, i);
      days.push({
        date: day,
        dayOfWeek: format(day, "EEE"),
        dayNumber: format(day, "d"),
        isToday: isSameDay(day, today),
        status: "unknown", // Trạng thái mặc định
        checkInTime: null,
        checkOutTime: null,
      });
    }

    setWeekDays(days);
    loadWeekData(days);
  }, [weeklyStatusRefreshTrigger]);

  // Tải dữ liệu cho tuần
  const loadWeekData = async (days) => {
    try {
      // Lấy ngày đầu và cuối tuần
      const startDate = days[0].date;
      const endDate = days[6].date;

      // Lấy logs chấm công
      const logs = await getWorkLogs(startDate, endDate);
      const logsMap = {};

      // Nhóm logs theo ngày
      logs.forEach((log) => {
        const logDate = format(parseISO(log.timestamp), "yyyy-MM-dd");
        if (!logsMap[logDate]) {
          logsMap[logDate] = [];
        }
        logsMap[logDate].push(log);
      });

      setWorkLogs(logsMap);

      // Lấy trạng thái công hàng ngày
      const statuses = {};
      for (const day of days) {
        const dayStr = format(day.date, "yyyy-MM-dd");
        const status = await getDailyWorkStatus(dayStr);
        if (status) {
          statuses[dayStr] = status;
        }
      }

      setDailyStatuses(statuses);

      // Cập nhật weekDays với dữ liệu
      const updatedDays = days.map((day) => {
        const dayStr = format(day.date, "yyyy-MM-dd");
        const dayStatus = statuses[dayStr];
        const dayLogs = logsMap[dayStr] || [];

        return {
          ...day,
          status: dayStatus ? getDisplayStatus(dayStatus) : "unknown",
          checkInTime: dayStatus?.checkInTime || null,
          checkOutTime: dayStatus?.checkOutTime || null,
          logs: dayLogs,
        };
      });

      setWeekDays(updatedDays);
    } catch (error) {
      console.error("Failed to load week data:", error);
    }
  };

  // Xử lý khi nhấn vào một ngày
  const handleDayPress = (day) => {
    setSelectedDay(day);

    const dayStr = format(day.date, "yyyy-MM-dd");
    const dayStatus = dailyStatuses[dayStr];
    const dayLogs = workLogs[dayStr] || [];

    setDayDetails({
      ...day,
      fullDate: format(day.date, "EEEE, MMMM d, yyyy"),
      status: dayStatus ? getDisplayStatus(dayStatus) : "unknown",
      totalWorkTime: dayStatus?.totalWorkTime || 0,
      overtime: dayStatus?.overtime || 0,
      remarks: dayStatus?.remarks || "",
      logs: dayLogs,
    });

    setShowDetailsModal(true);
  };

  // Cập nhật trạng thái thủ công
  const handleStatusChange = async (newStatus) => {
    if (!selectedDay) return;

    try {
      const dayStr = format(selectedDay.date, "yyyy-MM-dd");

      // Lấy trạng thái hiện tại
      const currentStatus = dailyStatuses[dayStr] || {
        status: "unknown",
        checkInTime: null,
        checkOutTime: null,
        totalWorkTime: 0,
        overtime: 0,
        remarks: "",
      };

      // Cập nhật trạng thái mới
      const updatedStatus = {
        ...currentStatus,
        status: newStatus,
        remarks:
          currentStatus.remarks +
          (currentStatus.remarks ? " " : "") +
          `[${format(new Date(), "HH:mm")}] Cập nhật thủ công: ${t(
            newStatus
          )}.`,
      };

      // Lưu vào database
      await updateDailyWorkStatus(dayStr, updatedStatus);

      // Cập nhật state
      const newDailyStatuses = { ...dailyStatuses, [dayStr]: updatedStatus };
      setDailyStatuses(newDailyStatuses);

      // Cập nhật weekDays
      const updatedDays = weekDays.map((day) => {
        if (isSameDay(day.date, selectedDay.date)) {
          return {
            ...day,
            status: getDisplayStatus(updatedStatus),
          };
        }
        return day;
      });

      setWeekDays(updatedDays);
      setShowStatusSelector(false);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Failed to update status:", error);
      Alert.alert(t("error"), t("failedToUpdateStatus"));
    }
  };

  // Render icon trạng thái
  const renderStatusIcon = (status, isToday) => {
    const iconSize = 24;
    const iconColor = isToday
      ? theme.colors.primary
      : getStatusColor(status, theme);

    // Nếu trạng thái là "RV" nhưng đã hoàn tất, hiển thị là "complete"
    if (status === "RV" && dayDetails?.completeTime) {
      return (
        <Ionicons
          name={getStatusIcon("complete")}
          size={iconSize}
          color={getStatusColor("complete", theme)}
        />
      );
    }

    return (
      <Ionicons
        name={getStatusIcon(status)}
        size={iconSize}
        color={iconColor}
      />
    );
  };

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 16,
    },
    header: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
    },
    weekGrid: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    dayColumn: {
      alignItems: "center",
      width: 40,
    },
    dayName: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    dayNumber: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    todayNumber: {
      color: theme.colors.primary,
    },
    dayStatus: {
      marginTop: 4,
      height: 30,
      justifyContent: "center",
      alignItems: "center",
    },
    timeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    timeText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      width: "90%",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      padding: 20,
      maxHeight: "80%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingVertical: 4,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailLabel: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      flexDirection: "row",
      alignItems: "center",
    },
    editButton: {
      marginLeft: 8,
    },
    remarksContainer: {
      marginTop: 8,
      marginBottom: 16,
      padding: 12,
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary,
    },
    remarksText: {
      fontSize: 14,
      color: theme.colors.text,
      fontStyle: "italic",
    },
    logsContainer: {
      marginTop: 16,
    },
    logsTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    logItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    logIcon: {
      marginRight: 12,
    },
    logInfo: {
      flex: 1,
    },
    logType: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    logTime: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    buttonRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 16,
    },
    button: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      color: "white",
      fontWeight: "bold",
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
      marginRight: 12,
    },
    statusSelector: {
      marginTop: 16,
    },
    statusOption: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statusText: {
      fontSize: 16,
      color: theme.colors.text,
      marginLeft: 12,
    },
    noLogsText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: 8,
    },
    rvBadge: {
      backgroundColor: "#FF5722",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignItems: "center",
      justifyContent: "center",
    },
    rvText: {
      color: "white",
      fontSize: 12,
      fontWeight: "bold",
    },
  });

  // Render chi tiết log
  const renderLogItem = (log) => {
    let iconName = "help-circle";
    let iconColor = theme.colors.textSecondary;
    let logTypeText = "";

    switch (log.type) {
      case "go_work":
        iconName = "briefcase-outline";
        iconColor = theme.colors.primary;
        logTypeText = t("goToWork");
        break;
      case "check_in":
        iconName = "enter-outline";
        iconColor = theme.colors.warning;
        logTypeText = t("clockIn");
        break;
      case "punch":
        iconName = "create-outline";
        iconColor = theme.colors.info;
        logTypeText = t("punch");
        break;
      case "check_out":
        iconName = "exit-outline";
        iconColor = theme.colors.success;
        logTypeText = t("clockOut");
        break;
      case "complete":
        iconName = "checkmark-done-outline";
        iconColor = theme.colors.primary;
        logTypeText = t("completed");
        break;
    }

    return (
      <View key={log.timestamp} style={styles.logItem}>
        <View style={styles.logIcon}>
          <Ionicons name={iconName} size={24} color={iconColor} />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.logType}>{logTypeText}</Text>
          <Text style={styles.logTime}>
            {format(parseISO(log.timestamp), "HH:mm:ss")}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{t("weeklyStatus")}</Text>

      <View style={styles.weekGrid}>
        {/* Hàng hiển thị thứ */}
        <View style={styles.weekRow}>
          {weekDays.map((day, index) => (
            <View key={`day-${index}`} style={styles.dayColumn}>
              <Text
                style={[
                  styles.dayName,
                  day.isToday && { color: theme.colors.primary },
                ]}
              >
                {day.dayOfWeek}
              </Text>
            </View>
          ))}
        </View>

        {/* Hàng hiển thị ngày */}
        <View style={styles.weekRow}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={`date-${index}`}
              style={styles.dayColumn}
              onPress={() => handleDayPress(day)}
            >
              <Text
                style={[styles.dayNumber, day.isToday && styles.todayNumber]}
              >
                {day.dayNumber}
              </Text>
              <View style={styles.dayStatus}>
                {day.status === "RV" ? (
                  <View style={styles.rvBadge}>
                    <Text style={styles.rvText}>RV</Text>
                  </View>
                ) : (
                  renderStatusIcon(day.status, day.isToday)
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hàng hiển thị giờ check-in/out */}
        <View style={styles.timeRow}>
          {weekDays.map((day, index) => (
            <View key={`time-${index}`} style={styles.dayColumn}>
              {day.checkInTime && day.checkOutTime ? (
                <Text style={styles.timeText}>
                  {day.checkInTime.substring(0, 5)}
                  {"\n"}-{"\n"}
                  {day.checkOutTime.substring(0, 5)}
                </Text>
              ) : (
                <Text style={styles.timeText}>--:--</Text>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Modal chi tiết ngày */}
      <Modal
        visible={showDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {dayDetails && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{dayDetails.fullDate}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailsModal(false)}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={theme.colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {showStatusSelector ? (
                  // Bộ chọn trạng thái
                  <View style={styles.statusSelector}>
                    {[
                      "complete",
                      "incomplete",
                      "RV",
                      "leave",
                      "sick",
                      "holiday",
                      "absent",
                      "unknown",
                    ].map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={styles.statusOption}
                        onPress={() => handleStatusChange(status)}
                      >
                        {status === "RV" ? (
                          <View style={styles.rvBadge}>
                            <Text style={styles.rvText}>RV</Text>
                          </View>
                        ) : (
                          renderStatusIcon(status, false)
                        )}
                        <Text style={styles.statusText}>{t(status)}</Text>
                      </TouchableOpacity>
                    ))}

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => setShowStatusSelector(false)}
                      >
                        <Text style={styles.buttonText}>{t("cancel")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  // Chi tiết ngày
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("status")}</Text>
                      <View style={styles.detailValue}>
                        <Text>{t(dayDetails.status)}</Text>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => setShowStatusSelector(true)}
                        >
                          <Ionicons
                            name="create-outline"
                            size={18}
                            color={theme.colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("checkIn")}</Text>
                      <Text style={styles.detailValue}>
                        {dayDetails.checkInTime
                          ? dayDetails.checkInTime.substring(0, 5)
                          : "--:--"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{t("checkOut")}</Text>
                      <Text style={styles.detailValue}>
                        {dayDetails.checkOutTime
                          ? dayDetails.checkOutTime.substring(0, 5)
                          : "--:--"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("totalWorkTime")}
                      </Text>
                      <Text style={styles.detailValue}>
                        {dayDetails.totalWorkTime > 0
                          ? `${dayDetails.totalWorkTime}h`
                          : "--"}
                      </Text>
                    </View>

                    {dayDetails.overtime > 0 && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t("overtime")}</Text>
                        <Text style={styles.detailValue}>
                          {dayDetails.overtime}h
                        </Text>
                      </View>
                    )}

                    {dayDetails.remarks && (
                      <View style={styles.remarksContainer}>
                        <Text style={styles.remarksText}>
                          {dayDetails.remarks}
                        </Text>
                      </View>
                    )}

                    <View style={styles.logsContainer}>
                      <Text style={styles.logsTitle}>{t("activityLogs")}</Text>
                      {dayDetails.logs && dayDetails.logs.length > 0 ? (
                        dayDetails.logs.map((log) => renderLogItem(log))
                      ) : (
                        <Text style={styles.noLogsText}>
                          {t("noLogsForThisDay")}
                        </Text>
                      )}
                    </View>

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={[styles.button, styles.cancelButton]}
                        onPress={() => setShowDetailsModal(false)}
                      >
                        <Text style={styles.buttonText}>{t("close")}</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
