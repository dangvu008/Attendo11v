/**
 * WorkNotes - Ghi Chú Công Việc
 *
 * Component này hiển thị khu vực Ghi Chú Công Việc với các tính năng:
 * - Hiển thị tối đa 3 ghi chú phù hợp (theo ca hoạt động hoặc theo ngày)
 * - Sắp xếp theo thời gian nhắc nhở gần nhất hoặc thời gian cập nhật mới nhất
 * - Mỗi ghi chú hiển thị: Tiêu đề, Nội dung, Thời gian nhắc nhở, nút Sửa, nút Xóa
 * - Nút "Thêm Ghi Chú" để mở form thêm ghi chú mới
 */

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { getNotes, deleteNote } from "../utils/database";
import { STORAGE_KEYS } from "../utils/STORAGE_KEYS";
import AddNoteModal from "./AddNoteModal";

export default function WorkNotes({ navigation }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();
  const [notes, setNotes] = useState([]);
  const [currentDayOfWeek] = useState(format(new Date(), "EEE"));
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [maxNotesToShow] = useState(3); // Hiển thị tối đa 3 ghi chú

  // Load notes when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [currentShift])
  );

  const loadNotes = async () => {
    try {
      const allNotes = await getNotes();

      // Lọc ghi chú theo điều kiện
      const filteredNotes = allNotes.filter((note) => {
        // Điều kiện 1: Ghi chú theo ca - associatedShiftIds chứa ID của ca hiện tại
        if (
          note.associatedShiftIds &&
          note.associatedShiftIds.length > 0 &&
          currentShift
        ) {
          return note.associatedShiftIds.includes(currentShift.id);
        }

        // Điều kiện 2: Ghi chú chung - associatedShiftIds rỗng VÀ explicitReminderDays chứa ngày hiện tại
        if (
          (!note.associatedShiftIds || note.associatedShiftIds.length === 0) &&
          note.explicitReminderDays &&
          note.explicitReminderDays.length > 0
        ) {
          // Chuyển đổi ngày hiện tại sang index (0 = Mon, 1 = Tue, ...)
          const dayIndex = [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun",
          ].indexOf(currentDayOfWeek);
          return note.explicitReminderDays.includes(dayIndex);
        }

        return false;
      });

      // Sắp xếp ghi chú theo thời gian nhắc nhở gần nhất
      const sortedNotes = filteredNotes.sort((a, b) => {
        // Tính toán thời gian nhắc nhở tiếp theo
        const timeA = a.reminderTime ? a.reminderTime : "23:59";
        const timeB = b.reminderTime ? b.reminderTime : "23:59";

        // So sánh thời gian
        if (timeA < timeB) return -1;
        if (timeA > timeB) return 1;

        // Nếu thời gian bằng nhau, sắp xếp theo updatedAt mới nhất
        const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB - dateA;
      });

      // Giới hạn số lượng ghi chú hiển thị
      setNotes(sortedNotes.slice(0, maxNotesToShow));
    } catch (error) {
      console.error("Failed to load notes:", error);
    }
  };

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowAddNote(true);
  };

  const handleDeleteNote = (noteId) => {
    Alert.alert(t("confirm"), t("deleteNoteConfirmation"), [
      {
        text: t("cancel"),
        style: "cancel",
      },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNote(noteId);
            await loadNotes();
          } catch (error) {
            console.error("Failed to delete note:", error);
          }
        },
      },
    ]);
  };

  const handleAddNote = () => {
    setEditingNote(null);
    setShowAddNote(true);
  };

  const handleCloseAddNote = async (saved) => {
    setShowAddNote(false);
    setEditingNote(null);

    if (saved) {
      await loadNotes();
    }
  };

  // Render a note item
  const renderNoteItem = ({ item }) => {
    return (
      <View style={[styles.noteCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.noteHeader}>
          <Text
            style={[styles.noteTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.noteActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditNote(item)}
            >
              <Ionicons
                name="pencil-outline"
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteNote(item.id)}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={theme.colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>

        <Text
          style={[styles.noteContent, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.content}
        </Text>

        {item.reminderTime && (
          <View style={styles.reminderContainer}>
            <Ionicons
              name="alarm-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.reminderText, { color: theme.colors.primary }]}
            >
              {item.reminderTime}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t("workNotes")}
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleAddNote}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {notes.length > 0 ? (
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          style={styles.notesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text
            style={[styles.emptyText, { color: theme.colors.textSecondary }]}
          >
            {t("noNotesForToday")}
          </Text>
          <TouchableOpacity
            style={[
              styles.emptyAddButton,
              { borderColor: theme.colors.primary },
            ]}
            onPress={handleAddNote}
          >
            <Text
              style={[
                styles.emptyAddButtonText,
                { color: theme.colors.primary },
              ]}
            >
              {t("addNote")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <AddNoteModal
        visible={showAddNote}
        onClose={handleCloseAddNote}
        editNote={editingNote}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  notesList: {
    maxHeight: 300,
  },
  noteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  noteActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 12,
  },
  noteContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  reminderContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  reminderText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    marginBottom: 12,
  },
  emptyAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
});