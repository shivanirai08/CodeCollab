"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getRealtimeService } from "@/lib/supabase/realtime";

const NotificationsContext = createContext(null);

function useNotificationsState() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const realtimeRef = useRef(null);
  const unsubscribeRef = useRef(null);
  const seenNotificationIdsRef = useRef(new Set());
  const initializedRef = useRef(false);

  const recomputeUnreadCount = useCallback((items) => {
    setUnreadCount(items.filter((item) => !item.is_read).length);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        credentials: "same-origin",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await res.json();
      const items = data.notifications || [];

      setNotifications(items);
      setUnreadCount(
        data.unreadCount ?? items.filter((item) => !item.is_read).length
      );
      seenNotificationIdsRef.current = new Set(items.map((item) => item.id));
      initializedRef.current = true;
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        const res = await fetch(`/api/notifications/${notificationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ isRead: true }),
        });

        if (!res.ok) {
          throw new Error("Failed to mark notification as read");
        }

        setNotifications((prev) => {
          const next = prev.map((item) =>
            item.id === notificationId ? { ...item, is_read: true } : item
          );
          recomputeUnreadCount(next);
          return next;
        });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [recomputeUnreadCount]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ isRead: true }),
      });

      if (!res.ok) {
        throw new Error("Failed to mark all notifications as read");
      }

      setNotifications((prev) => {
        const next = prev.map((item) => ({ ...item, is_read: true }));
        recomputeUnreadCount(next);
        return next;
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [recomputeUnreadCount]);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user?.id) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await fetchNotifications();

      realtimeRef.current = getRealtimeService();
      unsubscribeRef.current = realtimeRef.current.subscribeToNotifications(
        user.id,
        {
          onInsert: (notification) => {
            setNotifications((prev) => {
              const exists = prev.some((item) => item.id === notification.id);
              const next = exists ? prev : [notification, ...prev].slice(0, 20);

              if (
                initializedRef.current &&
                !exists &&
                !seenNotificationIdsRef.current.has(notification.id)
              ) {
                toast(notification.title, {
                  description: notification.message || "You have a new update.",
                });
              }

              seenNotificationIdsRef.current.add(notification.id);
              recomputeUnreadCount(next);
              return next;
            });
          },
          onUpdate: (updatedNotification) => {
            setNotifications((prev) => {
              const next = prev.map((item) =>
                item.id === updatedNotification.id ? updatedNotification : item
              );
              recomputeUnreadCount(next);
              return next;
            });
          },
        }
      );
    }

    initialize();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [fetchNotifications, recomputeUnreadCount]);

  return {
    userId,
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

export function NotificationsProvider({ children }) {
  const value = useNotificationsState();

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export default function useNotifications() {
  const context = useContext(NotificationsContext);

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }

  return context;
}
