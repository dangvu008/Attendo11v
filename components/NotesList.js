"use client"

import { useContext, useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { AppContext } from "../context/AppContext"

/**
 * NotesList Component
 *
 * This component displays a list of notes with options to edit and delete.
 * It includes confirmation dialogs for delete actions to prevent accidental data loss.
 *
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
export default function NotesList({ darkMode }) {
  const { notes, deleteNote, t, currentShift } = useContext(AppContext)
  const navigation = useNavigation()
  const [filteredNotes, setFilteredNotes] = useState([])

  // Filter notes based on current shift and day
  useEffect(() => {
    if (!notes || notes.length === 0) {
      setFilteredNotes([])
      return
    }

    // Get current day of week in English (Sun, Mon, etc.)
    const today = new Date()
    const dayOfWeek = today.toLocaleString("en-US", { weekday: "short" })

    // Filter notes based on:
    // 1. Notes associated with current shift
    // 2. Notes not associated with any shift but scheduled for today
    const filtered = notes.filter((note) => {
      // Condition 1: Note is associated with current shift
      if (note.associatedShiftIds && note.associatedShiftIds.length > 0) {
        return currentShift && note.associatedShiftIds.includes(currentShift.id)
      }

      // Condition 2: Note is not associated with any shift but scheduled for today
      return (
        (!note.associatedShiftIds || note.associatedShiftIds.length === 0) &&
        note.explicitReminderDays &&
        note.explicitReminderDays.includes(dayOfWeek)
      )
    })

    // Calculate next reminder time for each note for sorting
    const notesWithNextReminder = filtered.map((note) => {
      const reminderDate = new Date(note.reminderTime)
      const hours = reminderDate.getHours()
      const minutes = reminderDate.getMinutes()

      // Create a Date object for the next reminder
      const nextReminder = new Date()
      nextReminder.setHours(hours, minutes, 0, 0)

      // If the time has already passed today, set it for tomorrow
      if (nextReminder < new Date()) {
        nextReminder.setDate(nextReminder.getDate() + 1)
      }

      return {
        ...note,
        nextReminderTime: nextReminder,
      }
    })

    // Sort notes by next reminder time
    const sorted = [...notesWithNextReminder].sort(
      (a, b) => a.nextReminderTime.getTime() - b.nextReminderTime.getTime(),
    )

    // Get only the first 3 notes
    setFilteredNotes(sorted.slice(0, 3))
  }, [notes, currentShift])

  // Format time
  const formatTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // Edit note
  const handleEditNote = (note) => {
    navigation.navigate("AddNote", { note })
  }

  // Delete note with confirmation
  const handleDeleteNote = (noteId, noteTitle) => {
    Alert.alert(
      t("delete_note") || "Delete Note",
      t("delete_note_confirmation", { title: noteTitle }) || `Are you sure you want to delete "${noteTitle}"?`,
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("delete") || "Delete",
          onPress: () => {
            deleteNote(noteId)
              .then((success) => {
                if (!success) {
                  Alert.alert(
                    t("error") || "Error",
                    t("error_deleting_note") || "There was an error deleting the note. Please try again.",
                  )
                }
              })
              .catch((error) => {
                console.error("Error deleting note:", error)
                Alert.alert(
                  t("error") || "Error",
                  t("unexpected_error") || "An unexpected error occurred. Please try again.",
                )
              })
          },
          style: "destructive",
        },
      ],
    )
  }

  if (filteredNotes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: darkMode ? "#bbb" : "#777" }]}>{t("no_notes")}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {filteredNotes.map((note) => (
        <View key={note.id} style={[styles.noteCard, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}>
          <View style={styles.noteHeader}>
            <Text
              style={[styles.noteTitle, { color: darkMode ? "#fff" : "#000" }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {note.title}
            </Text>
            <Text style={[styles.noteTime, { color: darkMode ? "#bbb" : "#777" }]}>
              {formatTime(note.reminderTime)}
            </Text>
          </View>
          <Text
            style={[styles.noteContent, { color: darkMode ? "#bbb" : "#555" }]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {note.content}
          </Text>
          <View style={styles.noteActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditNote(note)}
              accessibilityLabel={t("edit") || "Edit"}
            >
              <Ionicons name="pencil-outline" size={18} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteNote(note.id, note.title)}
              accessibilityLabel={t("delete") || "Delete"}
            >
              <Ionicons name="trash-outline" size={18} color={darkMode ? "#ff6b6b" : "#ff6b6b"} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  noteCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  noteTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  noteContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
})

