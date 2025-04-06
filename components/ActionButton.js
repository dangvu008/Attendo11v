import { TouchableOpacity, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"

export default function ActionButton({ text, icon, onPress, disabled, darkMode }) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabledButton, { backgroundColor: disabled ? "#9d8fe0" : "#6a5acd" }]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={24} color="#fff" style={styles.icon} />
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  icon: {
    marginBottom: 8,
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
})

