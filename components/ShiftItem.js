"use client"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../contexts/ThemeContext"
import { useI18n } from "../contexts/I18nContext"
import { useShift } from "../contexts/ShiftContext"

export default function ShiftItem({ shift, onEdit, onDelete, onApply }) {
  const { theme } = useTheme()
  const { t } = useI18n()
  const { currentShift } = useShift()

  const isCurrentShift = currentShift?.id === shift.id

  const styles = StyleSheet.create({
    container: {
      backgroundColor: isCurrentShift ? theme.colors.primaryLight : theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: isCurrentShift ? 1 : 0,
      borderColor: theme.colors.primary,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: isCurrentShift ? theme.colors.primary : theme.colors.text,
    },
    timeText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    currentLabel: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "bold",
      marginTop: 4,
    },
    buttonsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 12,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    applyButton: {
      backgroundColor: theme.colors.primary,
    },
    editButton: {
      backgroundColor: theme.colors.card,
    },
    deleteButton: {
      backgroundColor: "#F44336",
    },
  })

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{shift.name}</Text>
      </View>

      <Text style={styles.timeText}>
        {shift.startTime} - {shift.endTime}
      </Text>

      {isCurrentShift && <Text style={styles.currentLabel}>{t("currentlyApplied")}</Text>}

      <View style={styles.buttonsRow}>
        {!isCurrentShift && (
          <TouchableOpacity style={[styles.actionButton, styles.applyButton]} onPress={onApply}>
            <Ionicons name="checkmark" size={20} color="white" />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={onEdit}>
          <Ionicons name="pencil" size={20} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Ionicons name="trash" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

