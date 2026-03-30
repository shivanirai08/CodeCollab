"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import useNotifications from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const visibleNotifications = useMemo(
    () => notifications.slice(0, 10),
    [notifications]
  );

  const handleNotificationClick = async (notification) => {
    const projectId = notification?.metadata?.projectId;
    const requestId = notification?.metadata?.requestId;

    await markAsRead(notification.id);
    setOpen(false);

    if (!projectId) {
      return;
    }

    if (notification.type === "join_request" && requestId) {
      router.push(
        `/project/${projectId}?panel=share&section=requests&requestId=${requestId}`
      );
      return;
    }

    router.push(`/project/${projectId}`);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full bg-[#212126] hover:bg-[#2F2F35] size-10"
        onClick={() => setOpen((prev) => !prev)}
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-[22rem] rounded-xl border border-gray-700 bg-[#212126] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <p className="text-xs text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-6 w-px bg-gray-700" />
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="text-xs font-medium text-gray-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-gray-500"
                >
                  Mark all read
                </button>
              </div>
            </div>

            <div className="max-h-[26rem] overflow-y-auto">
              {visibleNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No notifications yet
                </div>
              ) : (
                visibleNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "w-full border-b border-gray-800 px-4 py-3 text-left transition-colors hover:bg-[#2F2F35]",
                      notification.metadata?.projectId && "cursor-pointer",
                      !notification.is_read && "bg-white/[0.03]"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="mt-1 text-xs leading-relaxed text-gray-400">
                            {notification.message}
                          </p>
                        )}
                      </div>
                      {!notification.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      {formatRelativeTime(notification.created_at)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
