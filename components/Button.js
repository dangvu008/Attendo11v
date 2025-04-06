import { TouchableOpacity, Text, StyleSheet } from "react-native"

export default function Button({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  style = {},
  textStyle = {},
}) {
  // Determine background color based on variant
  const getBackgroundColor = () => {
    if (disabled) return "#cccccc"

    switch (variant) {
      case "primary":
        return "#6a5acd"
      case "secondary":
        return "#f0f0f0"
      case "danger":
        return "#ff6b6b"
      case "success":
        return "#4caf50"
      default:
        return "#6a5acd"
    }
  }

  // Determine text color based on variant
  const getTextColor = () => {
    if (disabled) return "#888888"

    switch (variant) {
      case "primary":
        return "#ffffff"
      case "secondary":
        return "#333333"
      case "danger":
        return "#ffffff"
      case "success":
        return "#ffffff"
      default:
        return "#ffffff"
    }
  }

  // Determine padding based on size
  const getPadding = () => {
    switch (size) {
      case "small":
        return { paddingVertical: 6, paddingHorizontal: 12 }
      case "medium":
        return { paddingVertical: 10, paddingHorizontal: 16 }
      case "large":
        return { paddingVertical: 14, paddingHorizontal: 20 }
      default:
        return { paddingVertical: 10, paddingHorizontal: 16 }
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          ...getPadding(),
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "500",
  },
})

