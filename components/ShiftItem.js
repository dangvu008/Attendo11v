import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"

/**
 * ShiftItem Component
 *
 * This component displays a single work shift item with actions for apply, edit, and delete.
 * It includes confirmation dialogs for delete actions to prevent accidental data loss.
 *
 * @param {Object} shift - The shift object to display
 * @param {boolean} isActive - Whether this shift is currently active
 * @param {Function} onApply - Function to call when applying the shift
 * @param {Function} onEdit - Function to call when editing the shift
 * @param {Function} onDelete - Function to call when deleting the shift
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
export default function ShiftItem({ shift, isActive, onApply, onEdit, onDelete, darkMode }) {
  // Handle delete with confirmation
  const handleDelete = () => {
    Alert.alert(
      shift.t ? shift.t("delete_shift_title") : "Delete Shift",
      shift.t ? shift.t("delete_shift_message") : "Are you sure you want to delete this shift?",
      [
        {
          text: shift.t ? shift.t("cancel") : "Cancel",
          style: "cancel",
        },
        {
          text: shift.t ? shift.t("delete") : "Delete",
          onPress: onDelete,
          style: "destructive",
        },
      ],
    )
  }

  // Handle apply with confirmation
  const handleApply = () => {
    if (isActive) return // Already applied

    Alert.alert(
      shift.t ? shift.t("apply_shift_title") : "Apply Shift",
      shift.t ? shift.t("apply_shift_message", { name: shift.name }) : `Apply "${shift.name}" shift for this week?`,
      [
        {
          text: shift.t ? shift.t("cancel") : "Cancel",
          style: "cancel",
        },
        {
          text: shift.t ? shift.t("apply") : "Apply",
          onPress: onApply,
        },
      ],
    )
  }

  return (
    <View
      style={[
        styles.container,
        isActive && styles.activeContainer,
        {
          backgroundColor: isActive ? (darkMode ? "#2d2d2d" : "#f0f0f0") : "transparent",
        },
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={[styles.shiftName, { color: darkMode ? "#fff" : "#000" }]}>{shift.name}</Text>
        <Text style={[styles.shiftTime, { color: darkMode ? "#bbb" : "#777" }]}>
          {shift.startTime} - {shift.endTime}
        </Text>
        {isActive && (
          <Text style={[styles.activeText, { color: "#6a5acd" }]}>
            {shift.t ? shift.t("currently_applied") : "Currently applied for this week"}
          </Text>
        )}
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#6a5acd" }]}
          onPress={handleApply}
          disabled={isActive}
          accessibilityLabel={shift.t ? shift.t("apply") : "Apply"}
        >
          <Ionicons name="checkmark" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
          onPress={onEdit}
          accessibilityLabel={shift.t ? shift.t("edit") : "Edit"}
        >
          <Ionicons name="pencil-outline" size={20} color={darkMode ? "#fff" : "#000"} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
          onPress={handleDelete}
          accessibilityLabel={shift.t ? shift.t("delete") : "Delete"}
        >
          <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  activeContainer: {
    borderRadius: 8,
    paddingHorizontal: 8,
    marginVertical: 4,
  },
  infoContainer: {
    flex: 1,
  },
  shiftName: {
    fontSize: 16,
    fontWeight: "500",
  },
  shiftTime: {
    fontSize: 14,
    marginTop: 2,
  },
  activeText: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: "row",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
})

