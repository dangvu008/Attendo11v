"use client";

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
  isSameDay,
  differenceInMinutes,
} from "date-fns";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { getWorkLogs } from "../utils/database";

export default function StatisticsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useI18n();

  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [workLogs, setWorkLogs] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);

  useEffect(() => {
    const loadWorkLogs = async () => {
      try {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);

        const logs = await getWorkLogs(start, end);
        setWorkLogs(logs);

        // Process logs to generate statistics
        generateMonthlyStats(logs, start, end);
      } catch (error) {
        console.error("Failed to load work logs:", error);
      }
    };

    loadWorkLogs();
  }, [selectedMonth]);

  const generateMonthlyStats = (logs, start, end) => {
    const daysInMonth = eachDayOfInterval({ start, end });

    const stats = daysInMonth.map((day) => {
      // Find logs for this day
      const dayLogs = logs.filter((log) => {
        const logDate = parseISO(log.timestamp);
        return isSameDay(logDate, day);
      });

      // Calculate work hours
      let workMinutes = 0;
      let status = "unknown";

      const clockInLog = dayLogs.find((log) => log.action === "clockIn");
      const clockOutLog = dayLogs.find((log) => log.action === "clockOut");

      if (clockInLog && clockOutLog) {
        const clockInTime = parseISO(clockInLog.timestamp);
        const clockOutTime = parseISO(clockOutLog.timestamp);
        workMinutes = differenceInMinutes(clockOutTime, clockInTime);
        status = "complete";
      } else if (clockInLog) {
        status = "working";
      } else if (dayLogs.some((log) => log.action === "goToWork")) {
        status = "going";
      }

      return {
        date: day,
        dayOfWeek: format(day, "EEE"),
        workMinutes,
        workHours: Math.floor(workMinutes / 60),
        workMinutesRemainder: workMinutes % 60,
        status,
      };
    });

    setMonthlyStats(stats);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "complete":
        return theme.colors.success;
      case "working":
        return theme.colors.warning;
      case "going":
        return theme.colors.info;
      default:
        return theme.colors.border;
    }
  };

  const previousMonth = () => {
    const prevMonth = new Date(selectedMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setSelectedMonth(prevMonth);
  };

  const nextMonth = () => {
    const nextMonth = new Date(selectedMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setSelectedMonth(nextMonth);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    monthSelector: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    monthText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    tableContainer: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerCell: {
      padding: 12,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    dateCell: {
      flex: 1,
    },
    dayCell: {
      flex: 1,
    },
    hoursCell: {
      flex: 1,
      textAlign: "center",
    },
    tableRow: {
      flexDirection: "row",
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    lastRow: {
      borderBottomWidth: 0,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    cell: {
      padding: 12,
      color: theme.colors.text,
    },
    statusIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    dateWithStatus: {
      flexDirection: "row",
      alignItems: "center",
    },
    summaryContainer: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 16,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      color: theme.colors.text,
      fontWeight: "bold",
    },
  });

  // Calculate total work hours for the month
  const totalWorkMinutes = monthlyStats.reduce(
    (total, day) => total + day.workMinutes,
    0
  );
  const totalWorkHours = Math.floor(totalWorkMinutes / 60);
  const totalWorkMinutesRemainder = totalWorkMinutes % 60;

  // Count days by status
  const completeDays = monthlyStats.filter(
    (day) => day.status === "complete"
  ).length;
  const workingDays = monthlyStats.filter(
    (day) => day.status === "working"
  ).length;
  const goingDays = monthlyStats.filter((day) => day.status === "going").length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t("statistics")}</Text>
      </View>

      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={previousMonth}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {format(selectedMonth, "MMMM yyyy")}
        </Text>
        <TouchableOpacity onPress={nextMonth}>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView>
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.dateCell]}>
              {t("date")}
            </Text>
            <Text style={[styles.headerCell, styles.dayCell]}>{t("day")}</Text>
            <Text style={[styles.headerCell, styles.hoursCell]}>
              {t("regularHours")}
            </Text>
          </View>

          {monthlyStats.map((day, index) => (
            <View
              key={index}
              style={[
                styles.tableRow,
                index === monthlyStats.length - 1 && styles.lastRow,
              ]}
            >
              <View
                style={[styles.cell, styles.dateCell, styles.dateWithStatus]}
              >
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: getStatusColor(day.status) },
                  ]}
                />
                <Text>{format(day.date, "dd/MM")}</Text>
              </View>
              <Text style={[styles.cell, styles.dayCell]}>{day.dayOfWeek}</Text>
              <Text style={[styles.cell, styles.hoursCell]}>
                {day.status === "complete"
                  ? `${day.workHours}h ${day.workMinutesRemainder}m`
                  : "-"}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>{t("monthlyStatistics")}</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("complete")}</Text>
            <Text style={styles.summaryValue}>
              {completeDays} {t("days")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("working")}</Text>
            <Text style={styles.summaryValue}>
              {workingDays} {t("days")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("goToWork")}</Text>
            <Text style={styles.summaryValue}>
              {goingDays} {t("days")}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t("totalHours")}</Text>
            <Text style={styles.summaryValue}>
              {totalWorkHours}h {totalWorkMinutesRemainder}m
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
