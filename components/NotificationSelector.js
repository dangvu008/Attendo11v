"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../contexts/ThemeContext"
import { useI18n } from "../contexts/I18nContext"

const NOTIFICATION_OPTIONS = [
  { id: "none", name: "noReminder" },
  { id: "onchange", name: "remindOnChange" },
  { id: "always", name: "alwaysRemind" },
]

export default function NotificationSelector() {
  const { theme } = useTheme()
  const { t } = useI18n()

  const [showModal, setShowModal] = useState(false)
  const [selectedOption, setSelectedOption] = useState("onchange")

  const currentOption = NOTIFICATION_OPTIONS.find((option) => option.id === selectedOption) || NOTIFICATION_OPTIONS[0]

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.card,
      padding: 12,
      borderRadius: 8,
    },
    buttonText: {
      color: theme.colors.text,
    },
    modalContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    modalContent: {
      width: "80%",
      backgroundColor: theme.colors.background,
      borderRadius: 12,
      overflow: "hidden",
    },
    modalHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    optionName: {
      fontSize: 16,
      color: theme.colors.text,
    },
    selectedItem: {
      backgroundColor: theme.colors.primaryLight,
    },
  })

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("shiftChangeReminder")}</Text>

      <TouchableOpacity style={styles.button} onPress={() => setShowModal(true)}>
        <Text style={styles.buttonText}>{t(currentOption.name)}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("selectReminderOption")}</Text>
            </View>

            <FlatList
              data={NOTIFICATION_OPTIONS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionItem, item.id === selectedOption && styles.selectedItem]}
                  onPress={() => {
                    setSelectedOption(item.id)
                    setShowModal(false)
                  }}
                >
                  <Text style={styles.optionName}>{t(item.name)}</Text>
                  {item.id === selectedOption && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary} style={{ marginLeft: "auto" }} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  )
}

