"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useTheme } from "../contexts/ThemeContext"
import { useI18n } from "../contexts/I18nContext"

const LANGUAGES = [
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", name: "English", flag: "🇬🇧" },
]

export default function LanguageSelector() {
  const { theme } = useTheme()
  const { locale, changeLanguage } = useI18n()

  const [showModal, setShowModal] = useState(false)

  const currentLanguage = LANGUAGES.find((lang) => lang.code === locale) || LANGUAGES[0]

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    buttonText: {
      color: theme.colors.text,
      marginLeft: 8,
      marginRight: 4,
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
    languageItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    languageFlag: {
      fontSize: 20,
      marginRight: 12,
    },
    languageName: {
      fontSize: 16,
      color: theme.colors.text,
    },
    selectedItem: {
      backgroundColor: theme.colors.primaryLight,
    },
  })

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => setShowModal(true)}>
        <Text style={{ fontSize: 16 }}>{currentLanguage.flag}</Text>
        <Text style={styles.buttonText}>{currentLanguage.name}</Text>
        <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
            </View>

            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.languageItem, item.code === locale && styles.selectedItem]}
                  onPress={() => {
                    changeLanguage(item.code)
                    setShowModal(false)
                  }}
                >
                  <Text style={styles.languageFlag}>{item.flag}</Text>
                  <Text style={styles.languageName}>{item.name}</Text>
                  {item.code === locale && (
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

