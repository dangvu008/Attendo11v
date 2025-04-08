"use client";

import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useShift } from "../contexts/ShiftContext";
import { getNotes, deleteNote, getShifts } from "../utils/database";
import AddNoteModal from "./AddNoteModal";

export default function Notes() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { currentShift } = useShift();
  const [notes, setNotes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [currentDayOfWeek] = useState(format(new Date(), "EEE"));
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [maxNotesToShow, setMaxNotesToShow] = useState(3);

  // Load shifts for displaying shift names
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const allShifts = await getShifts();
        setShifts(allShifts);
      } catch (error) {
        console.error("Failed to load shifts:", error);
      }
    };

    loadShifts();
  }, []);

  const loadNotes = useCallback(async () => {
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
  }, [currentShift, currentDayOfWeek, maxNotesToShow]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

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

  const handleEditNote = (note) => {
    setEditingNote(note);
    setShowAddNote(true);
  };

  const handleCloseModal = (saved = false) => {
    setShowAddNote(false);
    setEditingNote(null);

    if (saved) {
      loadNotes();
    }
  };

  const getShiftNameById = (shiftId) => {
    const shift = shifts.find((s) => s.id === shiftId);
    return shift ? shift.name : t("unknownShift");
  };

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 16,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      padding: 10,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: "center",
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    noteCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
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
      alignItems: "flex-start",
      marginBottom: 8,
    },
    noteTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      flex: 1,
      marginRight: 8,
    },
    noteActions: {
      flexDirection: "row",
    },
    actionButton: {
      marginLeft: 12,
      padding: 4,
    },
    noteContent: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 8,
      lineHeight: 20,
    },
    noteFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    noteTime: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    noteDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    badgesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    shiftBadge: {
      backgroundColor: theme.colors.info + "20", // Thêm độ trong suốt
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 4,
    },
    shiftText: {
      fontSize: 12,
      color: theme.colors.info,
      fontWeight: "bold",
    },
    reminderBadge: {
      backgroundColor: theme.colors.primaryLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginRight: 4,
      marginBottom: 4,
    },
    reminderText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    showMoreButton: {
      alignItems: "center",
      padding: 8,
      marginTop: 4,
    },
    showMoreText: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
  });

  const renderNoteItem = ({ item }) => (
    <View style={styles.noteCard}>
      <View style={styles.noteHeader}>
        <Text style={styles.noteTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.noteActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditNote(item)}
          >
            <Ionicons
              name="create-outline"
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
              color={theme.colors.danger}
            />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.noteContent} numberOfLines={3}>
        {item.content}
      </Text>

      {item.reminderTime && (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="alarm-outline"
            size={16}
            color={theme.colors.primary}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.noteTime}>
            {format(parseISO(item.reminderTime), "HH:mm")}
          </Text>
        </View>
      )}

      <View style={styles.noteFooter}>
        <Text style={styles.noteDate}>
          {item.createdAt ? format(parseISO(item.createdAt), "dd/MM/yyyy") : ""}
        </Text>

        <View style={styles.badgesContainer}>
          {/* Hiển thị badge cho ca làm việc liên kết */}
          {item.associatedShiftIds &&
            item.associatedShiftIds.length > 0 &&
            item.associatedShiftIds.map((shiftId) => (
              <View key={shiftId} style={styles.shiftBadge}>
                <Text style={styles.shiftText}>
                  {getShiftNameById(shiftId)}
                </Text>
              </View>
            ))}

          {/* Hiển thị badge nhắc nhở */}
          {item.reminderTime && (
            <View style={styles.reminderBadge}>
              <Text style={styles.reminderText}>{t("reminder")}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("notes")}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddNote(true)}
        >
          <Ionicons name="add" size={16} color="white" />
        </TouchableOpacity>
      </View>

      {notes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t("noNotes")}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={notes}
            renderItem={renderNoteItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />

          {/* Nút "Xem thêm" nếu có nhiều ghi chú */}
          {notes.length === maxNotesToShow && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setMaxNotesToShow((prev) => prev + 3)}
            >
              <Text style={styles.showMoreText}>{t("showMore")}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <AddNoteModal
        visible={showAddNote}
        onClose={handleCloseModal}
        editNote={editingNote}
      />
    </View>
  );
}
