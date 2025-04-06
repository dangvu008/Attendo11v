import React from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
    this.setState({ errorInfo })
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="alert-circle" size={48} color="#FF3B30" />
            <Text style={styles.title}>Oops! Something went wrong</Text>
          </View>

          <ScrollView style={styles.errorContainer}>
            <Text style={styles.errorText}>{this.state.error && this.state.error.toString()}</Text>
            <Text style={styles.stackTrace}>{this.state.errorInfo && this.state.errorInfo.componentStack}</Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={this.resetError}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 20,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000000",
    marginTop: 10,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    maxHeight: 300,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    marginBottom: 10,
  },
  stackTrace: {
    fontSize: 14,
    color: "#8E8E93",
  },
  buttonContainer: {
    alignItems: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
})

