import { TextInput, StyleSheet, View, Text } from "react-native"

export default function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  label,
  error,
  multiline = false,
  numberOfLines = 1,
  style = {},
  darkMode = false,
}) {
  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: darkMode ? "#ffffff" : "#333333" }]}>{label}</Text>}

      <TextInput
        style={[
          styles.input,
          multiline && styles.multilineInput,
          {
            backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0",
            color: darkMode ? "#ffffff" : "#333333",
          },
          error && styles.errorInput,
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={darkMode ? "#999999" : "#777777"}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : 1}
      />

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  errorInput: {
    borderWidth: 1,
    borderColor: "#ff6b6b",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    marginTop: 4,
  },
})

