import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import axios from "axios";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

// ─── Bell icon with unread badge ────────────────────────────────────────────
export function NotificationBell({ recipientId, recipientType, onPress }) {
  const [unread, setUnread] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/notification/unread-count`, {
        params: { recipientId, recipientType },
      });
      setUnread(data.count || 0);
    } catch (e) {
      console.error("Bell count error:", e.message);
    }
  }, [recipientId, recipientType]);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.bellWrapper}>
      <Text style={styles.bellIcon}>🔔</Text>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Single notification row ─────────────────────────────────────────────────
function NotificationItem({ item, onMarkRead, onDelete }) {
  return (
    <View style={[styles.item, !item.isRead && styles.itemUnread]}>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title || "Notification"}</Text>
        <Text style={styles.itemBody}>{item.message}</Text>
        <Text style={styles.itemTime}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>
      <View style={styles.itemActions}>
        {!item.isRead && (
          <TouchableOpacity onPress={() => onMarkRead(item._id)}>
            <Text style={styles.actionRead}>✓</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onDelete(item._id)}>
          <Text style={styles.actionDelete}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main NotificationCenter screen ──────────────────────────────────────────
export default function NotificationCenter({ route }) {
  const { recipientId, recipientType } = route?.params || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/api/notification`, {
        params: { recipientId, recipientType },
      });
      setNotifications(data.data || []);
    } catch (e) {
      console.error("Fetch notifications error:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [recipientId, recipientType]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id) => {
    try {
      await axios.patch(`${BASE_URL}/api/notification/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error("Mark read error:", e.message);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${BASE_URL}/api/notification/mark-all-read`, {
        recipientId,
        recipientType,
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error("Mark all read error:", e.message);
    }
  };

  const deleteOne = async (id) => {
    try {
      await axios.delete(`${BASE_URL}/api/notification/${id}`);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (e) {
      console.error("Delete error:", e.message);
    }
  };

  const clearAll = async () => {
    try {
      await axios.delete(`${BASE_URL}/api/notification/clear-all`, {
        data: { recipientId, recipientType },
      });
      setNotifications([]);
    } catch (e) {
      console.error("Clear all error:", e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header actions */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={markAllRead} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Mark all read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: "#ef4444" }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <NotificationItem item={item} onMarkRead={markRead} onDelete={deleteOne} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchNotifications();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyText: { color: "#9ca3af", fontSize: 15 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerActions: { flexDirection: "row", gap: 12 },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerBtnText: { fontSize: 13, color: "#f97316", fontWeight: "600" },

  item: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemUnread: { backgroundColor: "#fff7ed" },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 2 },
  itemBody: { fontSize: 13, color: "#374151", marginBottom: 4 },
  itemTime: { fontSize: 11, color: "#9ca3af" },
  itemActions: { justifyContent: "space-around", paddingLeft: 12 },
  actionRead: { fontSize: 18, color: "#22c55e" },
  actionDelete: { fontSize: 18 },

  bellWrapper: { position: "relative", padding: 8 },
  bellIcon: { fontSize: 22 },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});