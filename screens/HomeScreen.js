"use client";

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  StatusBar,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { useWorkStatus } from "../contexts/WorkStatusContext";
import ActionButton from "../components/ActionButton";
import WeeklyStatus from "../components/WeeklyStatus";
import Notes from "../components/Notes";
import AddNoteModal from "../components/AddNoteModal";
import WeatherForecast from "../components/WeatherForecast";
import { saveWorkLog, getWorkLogs } from "../utils/database";
import { useWeather } from "../contexts/WeatherContext";
import WeatherAlert from "../components/WeatherAlert";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();
  const { workStatus, updateWorkStatus, resetWorkStatus } = useWorkStatus();
  const { weatherAlertMessage, showWeatherAlert, dismissWeatherAlert } =
    useWeather();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [workLogs, setWorkLogs] = useState([]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Load work logs when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadWorkLogs();
    }, [])
  );

  const loadWorkLogs = async () => {
    try {
      const logs = await getWorkLogs();
      setWorkLogs(logs);
    } catch (error) {
      console.error("Failed to load work logs:", error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWorkLogs();
    setRefreshing(false);
  }, []);

  const handleActionButtonPress = async (action) => {
    const timestamp = new Date();

    try {
      // Save to database
      await saveWorkLog({
        action,
        timestamp: timestamp.toISOString(),
        shiftId: currentShift?.id,
      });

      // Update UI state
      updateWorkStatus(action, timestamp);

      // Reload work logs
      await loadWorkLogs();
    } catch (error) {
      console.error("Failed to save work log:", error);
      Alert.alert(t("error"), t("failedToSaveWorkLog"));
    }
  };

  const handleResetStatus = () => {
    Alert.alert(t("confirm"), t("resetStatusConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("reset"),
        onPress: async () => {
          resetWorkStatus();
          await loadWorkLogs();
        },
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    headerButtons: {
      flexDirection: "row",
    },
    iconButton: {
      marginLeft: 16,
    },
    timeContainer: {
      alignItems: "center",
      marginVertical: 16,
    },
    time: {
      fontSize: 36,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    date: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    shiftContainer: {
      backgroundColor: theme.colors.card,
      marginHorizontal: 16,
      padding: 16,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    shiftInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    shiftIcon: {
      marginRight: 8,
    },
    shiftName: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    shiftTime: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    actionButtonContainer: {
      alignItems: "center",
      marginVertical: 24,
    },
    statusHistory: {
      marginTop: 8,
    },
    historyItem: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 16,
      marginHorizontal: 16,
    },
    section: {
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      padding: 10,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: "center",
    },
    addButtonText: {
      color: "white",
      marginLeft: 4,
    },
  });

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme.dark ? "light" : "dark"} />

      {/* Weather Alert Banner hiển thị trên cùng nếu có */}
      {showWeatherAlert && (
        <WeatherAlert
          alertMessage={weatherAlertMessage}
          isVisible={showWeatherAlert}
          onDismiss={dismissWeatherAlert}
          playSoundAlert={true}
        />
      )}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("timeManager")}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("Settings")}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => navigation.navigate("Statistics")}
            >
              <Ionicons
                name="stats-chart"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <Text style={styles.time}>{format(currentTime, "HH:mm")}</Text>
          <Text style={styles.date}>{format(currentTime, "EEEE, dd/MM")}</Text>
        </View>

        {currentShift && (
          <View style={styles.shiftContainer}>
            <View style={styles.shiftInfo}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={theme.colors.primary}
                style={styles.shiftIcon}
              />
              <View>
                <Text style={styles.shiftName}>{currentShift.name}</Text>
                <Text style={styles.shiftTime}>
                  {currentShift.startTime} → {currentShift.endTime}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Weather Forecast Component */}
        <WeatherForecast />

        <View style={styles.actionButtonContainer}>
          <ActionButton
            status={workStatus.status}
            onPress={handleActionButtonPress}
            onReset={handleResetStatus}
          />

          {workStatus.status !== "idle" && (
            <View style={styles.statusHistory}>
              {workStatus.goToWorkTime && (
                <Text style={styles.historyItem}>
                  {t("goneToWork")}{" "}
                  {format(new Date(workStatus.goToWorkTime), "HH:mm")}
                </Text>
              )}
              {workStatus.clockInTime && (
                <Text style={styles.historyItem}>
                  {t("clockedIn")}{" "}
                  {format(new Date(workStatus.clockInTime), "HH:mm")}
                </Text>
              )}
              {workStatus.clockOutTime && (
                <Text style={styles.historyItem}>
                  {t("clockedOut")}{" "}
                  {format(new Date(workStatus.clockOutTime), "HH:mm")}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <WeeklyStatus workLogs={workLogs} />
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("notes")}</Text>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowAddNote(true)}
            >
              <Ionicons
                name="add-circle-outline"
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>
          <Notes />
        </View>

        <AddNoteModal
          visible={showAddNote}
          onClose={() => setShowAddNote(false)}
        />
      </ScrollView>
    </View>
  );
}
