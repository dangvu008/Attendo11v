/**
 * WeeklyStatusGrid - Lưới Trạng Thái Tuần
 *
 * Component này hiển thị trạng thái làm việc trong tuần dưới dạng lưới 7 ô (T2-CN)
 * Mỗi ô hiển thị: Ngày (số), Thứ (chữ), Icon trạng thái với màu nền tương ứng
 */

import { useState, useEffect, useCallback } from "react";
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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { useWorkStatus } from "../contexts/WorkStatusContext";
import { getDailyWorkStatus, updateDailyWorkStatus } from "../utils/database";
import { STORAGE_KEYS } from "../utils/STORAGE_KEYS";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function WeeklyStatusGrid() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();
  const { weeklyStatusRefreshTrigger } = useWorkStatus();

  const [weekDays, setWeekDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusSelector, setShowStatusSelector] = useState(false);
  const [dailyStatuses, setDailyStatuses] = useState({});
  const [firstDayOfWeek, setFirstDayOfWeek] = useState(1); // 0 = Sunday, 1 = Monday

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          // Nếu firstDayOfWeek được cấu hình, sử dụng giá trị đó
          if (parsedSettings.firstDayOfWeek !== undefined) {
            setFirstDayOfWeek(
              parsedSettings.firstDayOfWeek === "sunday" ? 0 : 1
            );
          }
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Tính toán các ngày trong tuần hiện tại
  useEffect(() => {
    const today = new Date();
    const startDay = startOfWeek(today, { weekStartsOn: firstDayOfWeek });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(startDay, i);
      days.push({
        date: day,
        dayOfWeek: format(day, "EEE"),
        dayNumber: format(day, "d"),
        isToday: isSameDay(day, today),
        status: "unknown", // Trạng thái mặc định
      });
    }

    setWeekDays(days);
    loadWeekData(days);
  }, [firstDayOfWeek, weeklyStatusRefreshTrigger]);

  // Tải dữ liệu trạng thái cho tuần
  const loadWeekData = async (days) => {
    try {
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
    } catch (error) {
      console.error("Failed to load week data:", error);
    }
  };

  // Xử lý khi nhấn vào một ngày để xem chi tiết
  const handleDayPress = (day) => {
    setSelectedDay(day);
    setShowDetailsModal(true);
  };

  // Xử lý khi nhấn giữ một ngày để cập nhật trạng thái thủ công
  const handleDayLongPress = (day) => {
    // Chỉ cho phép cập nhật thủ công cho ngày trong quá khứ và hiện tại
    const today = new Date();
    if (day.date > today) return;

    setSelectedDay(day);
    setShowStatusSelector(true);
  };

  // Lấy icon và màu cho trạng thái
  const getStatusInfo = (status) => {
    switch (status) {
      case "completed":
        return {
          icon: "checkmark-circle",
          color: theme.colors.success,
          label: t("completed"),
        };
      case "partial":
        return {
          icon: "alert-circle",
          color: theme.colors.warning,
          label: t("partial"),
        };
      case "absent":
        return {
          icon: "close-circle",
          color: theme.colors.error,
          label: t("absent"),
        };
      case "leave":
        return {
          icon: "airplane",
          color: theme.colors.info,
          label: t("leave"),
        };
      case "sick":
        return {
          icon: "medkit",
          color: theme.colors.secondary,
          label: t("sick"),
        };
      case "holiday":
        return {
          icon: "calendar",
          color: theme.colors.primary,
          label: t("holiday"),
        };
      case "remote":
        return {
          icon: "laptop",
          color: theme.colors.tertiary,
          label: t("remote"),
        };
      default:
        return {
          icon: "help-circle",
          color: theme.colors.disabled,
          label: t("unknown"),
        };
    }
  };

  // Render một ô ngày trong lưới
  const renderDayCell = (day) => {
    const dayStr = format(day.date, "yyyy-MM-dd");
    const dayStatus = dailyStatuses[dayStr] || { status: "unknown" };
    const { icon, color, label } = getStatusInfo(dayStatus.status);

    return (
      <TouchableOpacity
        key={dayStr}
        style={[
          styles.dayCell,
          { backgroundColor: color },
          day.isToday && styles.todayCell,
        ]}
        onPress={() => handleDayPress(day)}
        onLongPress={() => handleDayLongPress(day)}
      >
        <Text style={styles.dayNumber}>{day.dayNumber}</Text>
        <Text style={styles.dayOfWeek}>{day.dayOfWeek}</Text>
        <Ionicons name={icon} size={24} color="white" />
      </TouchableOpacity>
    );
  };

  // Render modal chi tiết ngày
  const renderDetailsModal = () => {
    if (!selectedDay) return null;

    const dayStr = format(selectedDay.date, "yyyy-MM-dd");
    const dayStatus = dailyStatuses[dayStr] || { status: "unknown" };
    const { icon, color, label } = getStatusInfo(dayStatus.status);

    return (
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {format(selectedDay.date, "EEEE, d MMMM yyyy")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: color }]}>
              <Ionicons name={icon} size={24} color="white" />
              <Text style={styles.statusLabel}>{label}</Text>
            </View>

            {dayStatus.checkInTime && (
              <View style={styles.timeInfo}>
                <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
                  {t("checkInTime")}:
                </Text>
                <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                  {format(parseISO(dayStatus.checkInTime), "HH:mm:ss")}
                </Text>
              </View>
            )}

            {dayStatus.checkOutTime && (
              <View style={styles.timeInfo}>
                <Text style={[styles.timeLabel, { color: theme.colors.text }]}>
                  {t("checkOutTime")}:
                </Text>
                <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                  {format(parseISO(dayStatus.checkOutTime), "HH:mm:ss")}
                </Text>
              </View>
            )}

            {dayStatus.notes && (
              <View style={styles.notesContainer}>
                <Text style={[styles.notesLabel, { color: theme.colors.text }]}>
                  {t("notes")}:
                </Text>
                <Text
                  style={[styles.notesContent, { color: theme.colors.text }]}
                >
                  {dayStatus.notes}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.editButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                setShowDetailsModal(false);
                setShowStatusSelector(true);
              }}
            >
              <Text style={styles.editButtonText}>{t("editStatus")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Render modal chọn trạng thái
  const renderStatusSelector = () => {
    if (!selectedDay) return null;

    const statusOptions = [
      { status: "completed", label: t("completed") },
      { status: "partial", label: t("partial") },
      { status: "absent", label: t("absent") },
      { status: "leave", label: t("leave") },
      { status: "sick", label: t("sick") },
      { status: "holiday", label: t("holiday") },
      { status: "remote", label: t("remote") },
    ];

    const handleStatusSelect = async (status) => {
      try {
        const dayStr = format(selectedDay.date, "yyyy-MM-dd");
        await updateDailyWorkStatus(dayStr, { status });

        // Cập nhật state
        setDailyStatuses({
          ...dailyStatuses,
          [dayStr]: { ...dailyStatuses[dayStr], status },
        });

        setShowStatusSelector(false);
      } catch (error) {
        console.error("Failed to update status:", error);
        Alert.alert(t("error"), t("failedToUpdateStatus"));
      }
    };

    return (
      <Modal
        visible={showStatusSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.colors.card },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {t("selectStatus")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowStatusSelector(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.statusList}>
              {statusOptions.map((option) => {
                const { icon, color } = getStatusInfo(option.status);
                return (
                  <TouchableOpacity
                    key={option.status}
                    style={[
                      styles.statusOption,
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => handleStatusSelect(option.status)}
                  >
                    <View
                      style={[
                        styles.statusIconContainer,
                        { backgroundColor: color },
                      ]}
                    >
                      <Ionicons name={icon} size={24} color="white" />
                    </View>
                    <Text
                      style={[
                        styles.statusOptionText,
                        { color: theme.colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("weeklyStatus")}
        </Text>
      </View>

      <View style={styles.grid}>
        {weekDays.map((day) => renderDayCell(day))}
      </View>

      {renderDetailsModal()}
      {renderStatusSelector()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginHorizontal: 16,
  },
  dayCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: "white",
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  dayOfWeek: {
    fontSize: 12,
    color: "white",
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusLabel: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },
  timeInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  notesContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 14,
  },
  editButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  editButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  statusList: {
    maxHeight: 300,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statusOptionText: {
    fontSize: 16,
  },
});
