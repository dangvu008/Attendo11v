/**
 * ShiftManagementScreen - Màn Hình Quản Lý Ca
 *
 * Màn hình quản lý ca làm việc với các tính năng:
 * - Danh sách các ca (FlatList)
 * - Hiển thị tên, giờ làm, ngày áp dụng
 * - Đánh dấu ca đang hoạt động
 * - Các nút: Chọn, Sửa, Xóa
 * - Nút "+" để thêm ca mới
 */

import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { getShifts, removeShift, updateShiftById } from "../utils/database";
import AddShiftModal from "../components/AddShiftModal";

export default function ShiftManagementScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift, refreshShifts } = useShift();

  const [shifts, setShifts] = useState([]);
  const [showAddShift, setShowAddShift] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const savedShifts = await getShifts();
      setShifts(savedShifts);
    } catch (error) {
      console.error("Failed to load shifts:", error);
    }
  };

  const handleActivateShift = async (shift) => {
    try {
      // Đặt tất cả các ca khác thành không active
      for (const s of shifts) {
        if (s.id !== shift.id && s.isActive) {
          await updateShiftById(s.id, { isActive: false });
        }
      }

      // Đặt ca được chọn thành active
      await updateShiftById(shift.id, { isActive: true });

      // Cập nhật danh sách ca
      await loadShifts();
      refreshShifts();

      Alert.alert(t("success"), t("shiftActivated"));
    } catch (error) {
      console.error("Failed to activate shift:", error);
      Alert.alert(t("error"), t("failedToActivateShift"));
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShowAddShift(true);
  };

  const handleDeleteShift = (shiftId) => {
    if (shifts.length <= 1) {
      Alert.alert(t("error"), t("cannotDeleteLastShift"));
      return;
    }

    Alert.alert(t("confirm"), t("deleteShiftConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await removeShift(shiftId);
            await loadShifts();
            refreshShifts();
          } catch (error) {
            console.error("Failed to delete shift:", error);
          }
        },
      },
    ]);
  };

  const handleCloseAddShift = async (saved) => {
    setShowAddShift(false);
    setEditingShift(null);

    if (saved) {
      await loadShifts();
      refreshShifts();
    }
  };

  const renderShiftItem = ({ item }) => {
    const isActive = currentShift?.id === item.id;

    // Chuyển đổi mảng ngày thành chuỗi hiển thị
    const daysDisplay = item.days
      ? item.days
          .map((day) => {
            switch (day) {
              case "Mon":
                return t("day_short_mon");
              case "Tue":
                return t("day_short_tue");
              case "Wed":
                return t("day_short_wed");
              case "Thu":
                return t("day_short_thu");
              case "Fri":
                return t("day_short_fri");
              case "Sat":
                return t("day_short_sat");
              case "Sun":
                return t("day_short_sun");
              default:
                return day;
            }
          })
          .join(", ")
      : "";

    return (
      <View
        style={[
          styles.shiftCard,
          { backgroundColor: theme.colors.card },
          isActive && styles.activeShiftCard,
        ]}
      >
        <View style={styles.shiftHeader}>
          <View style={styles.shiftTitleContainer}>
            <Text
              style={[
                styles.shiftName,
                { color: isActive ? theme.colors.primary : theme.colors.text },
              ]}
            >
              {item.name}
            </Text>
            {isActive && (
              <View style={styles.activeIndicator}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.activeText, { color: theme.colors.primary }]}
                >
                  {t("active")}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.shiftActions}>
            {!isActive && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleActivateShift(item)}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={22}
                  color={theme.colors.success}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditShift(item)}
            >
              <Ionicons
                name="pencil-outline"
                size={22}
                color={theme.colors.warning}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteShift(item.id)}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.shiftTime, { color: theme.colors.textSecondary }]}>
          {item.startTime} - {item.endTime}
        </Text>

        <View style={styles.shiftDays}>
          <Text
            style={[
              styles.shiftDaysText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {daysDisplay}
          </Text>
        </View>

        {item.showPunch && (
          <View style={styles.punchIndicator}>
            <Ionicons
              name="create-outline"
              size={14}
              color={theme.colors.info}
            />
            <Text style={[styles.punchText, { color: theme.colors.info }]}>
              {t("punchEnabled")}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("shiftManagement")}
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t("yourShifts")}
          </Text>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() => {
              setEditingShift(null);
              setShowAddShift(true);
            }}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>{t("addShift")}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={shifts}
          renderItem={renderShiftItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.shiftsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <AddShiftModal
        visible={showAddShift}
        onClose={handleCloseAddShift}
        editShift={editingShift}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    marginLeft: 4,
    fontWeight: "bold",
  },
  shiftsList: {
    paddingBottom: 16,
  },
  shiftCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  activeShiftCard: {
    borderLeftWidth: 4,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  shiftTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  shiftName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  activeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  activeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  shiftActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 12,
  },
  shiftTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  shiftDays: {
    marginTop: 4,
  },
  shiftDaysText: {
    fontSize: 14,
  },
  punchIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  punchText: {
    fontSize: 12,
    marginLeft: 4,
  },
});