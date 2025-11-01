"use client";

import Image from "next/image";

// Function to get initials from username
const getInitials = (username) => {
  if (!username) return "??";

  const words = username.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
};

// Function to get a color based on user ID
const getUserColor = (userId) => {
  if (!userId) return "bg-gray-500";

  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-rose-500",
  ];

  // Use user ID to consistently select a color
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
};


export default function OnlineAvatars({ onlineUsers = [] }) {
  // 5 users max to display
  const displayUsers = onlineUsers.slice(0, 5);
  const extraCount = onlineUsers.length - displayUsers.length;

  return (
    <div className="flex -space-x-2">
      {displayUsers.map((user) => {
        const initials = getInitials(user.username);
        const colorClass = getUserColor(user.user_id);

        return (
          <div
            key={user.user_id}
            className="relative group"
            title={user.username || "Unknown User"}
          >
            {user.avatar_url ? (
              <div className="w-8 h-8 rounded-full border-2 border-[var(--card)] overflow-hidden bg-gray-700">
                <Image
                  src={user.avatar_url}
                  alt={user.username || "User"}
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
            ) : (
              <div
                className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold text-white border-2 border-[var(--card)]`}
              >
                {initials}
              </div>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {user.username || "Unknown User"}
            </div>
          </div>
        );
      })}

      {/* Show extra count if more than 5 users */}
      {extraCount > 0 && (
        <div
          className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white border-2 border-[var(--card)]"
          title={`${extraCount} more user${extraCount > 1 ? 's' : ''} online`}
        >
          +{extraCount}
        </div>
      )}

      {/* Show message if no users online */}
      {onlineUsers.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No collaborators online
        </div>
      )}
    </div>
  );
}
