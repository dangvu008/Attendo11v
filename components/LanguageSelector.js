"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native"
import { Ionicons } from "@expo/vector-icons"

export default function LanguageSelector({ language, setLanguage, darkMode }) {
  const [modalVisible, setModalVisible] = useState(false)

  const languages = [
    { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
    { code: "en", name: "English", flag: "🇬🇧" },
  ]

  const selectedLanguage = languages.find((lang) => lang.code === language) || languages[0]

  const handleSelectLanguage = (langCode) => {
    setLanguage(langCode)
    setModalVisible(false)
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorText, { color: darkMode ? "#fff" : "#000" }]}>
          {selectedLanguage.flag} {selectedLanguage.name}
        </Text>
        <Ionicons name="chevron-down" size={16} color={darkMode ? "#fff" : "#000"} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: darkMode ? "#1e1e1e" : "#fff" }]}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  lang.code === language && styles.selectedLanguage,
                  {
                    backgroundColor: lang.code === language ? (darkMode ? "#2d2d2d" : "#f0f0f0") : "transparent",
                  },
                ]}
                onPress={() => handleSelectLanguage(lang.code)}
              >
                <Text style={[styles.languageText, { color: darkMode ? "#fff" : "#000" }]}>
                  {lang.flag} {lang.name}
                </Text>
                {lang.code === language && <Ionicons name="checkmark" size={16} color="#6a5acd" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  selectorText: {
    fontSize: 14,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "80%",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedLanguage: {
    borderRadius: 8,
    margin: 4,
  },
  languageText: {
    fontSize: 16,
  },
})

