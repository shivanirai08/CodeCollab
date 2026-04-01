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
  const authListenerRef = useRef(null);
  const userIdRef = useRef(null);

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

    const cleanupSubscription = async () => {
      if (unsubscribeRef.current) {
        await unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };

    const subscribeForUser = async (nextUserId) => {
      await cleanupSubscription();

      if (!mounted || !nextUserId) {
        setUserId(null);
        userIdRef.current = null;
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        initializedRef.current = false;
        seenNotificationIdsRef.current = new Set();
        return;
      }

      setUserId(nextUserId);
      userIdRef.current = nextUserId;
      realtimeRef.current = getRealtimeService();
      unsubscribeRef.current = realtimeRef.current.subscribeToNotifications(
        nextUserId,
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
          onStatusChange: (status) => {
            if (!mounted) return;

            if (status === "SUBSCRIBED") {
              fetchNotifications();
            }

            if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
              fetchNotifications();
            }
          },
        }
      );
    };

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      await subscribeForUser(user.id);
      await fetchNotifications();
    }

    initialize();

    authListenerRef.current = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;

        const nextUserId = session?.user?.id || null;

        if (!nextUserId) {
          await subscribeForUser(null);
          return;
        }

        if (nextUserId !== userIdRef.current) {
          await subscribeForUser(nextUserId);
        }

        await fetchNotifications();
      }
    );

    const handleWindowFocus = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleWindowFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleWindowFocus);
      authListenerRef.current?.data?.subscription?.unsubscribe?.();
      cleanupSubscription();
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
