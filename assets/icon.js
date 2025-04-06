import { View, Text, StyleSheet } from "react-native"

export default function PlaceholderIcon() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>A11</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 100,
    backgroundColor: "#6a5acd",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "white",
    fontSize: 36,
    fontWeight: "bold",
  },
})

