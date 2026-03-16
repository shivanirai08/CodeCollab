"use client";

import { useState, useRef, useEffect } from "react";
import { Phone, PhoneOff, Mic, MicOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getInitials, getUserColor } from "./userUtils";

export default function VoiceCall({
  currentUserId,
  onlineUsers = [],
  participantsInCall = [],
  isUserInCall = false,
  isMuted = false,
  connectionState = "idle",
  connectionError = "",
  onJoinCall = () => { },
  onLeaveCall = () => { },
  onToggleMute = () => { },
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJoinDropdown, setShowJoinDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const participantsCount = participantsInCall.length;
  const othersInCall = participantsInCall.filter(
    (p) => p.user_id !== currentUserId
  );
  const isAnyoneElseInCall = othersInCall.length > 0;

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowJoinDropdown(false);
        setIsExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ──────────────────────────────────────────────────────────
  // State 1: No one in call — simple phone icon
  // ──────────────────────────────────────────────────────────
  if (!isAnyoneElseInCall && !isUserInCall) {
    const isConnecting = connectionState === "connecting";
    const isFailed = connectionState === "failed";
    const failureHint = connectionError || "Could not start voice call. Check microphone permission and network.";
    return (
      <div className="relative">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onJoinCall}
            disabled={isConnecting}
            className={`rounded-full border bg-transparent text-white hover:bg-[var(--accent)] w-9 h-9 md:w-10 md:h-10 p-0 ${isConnecting ? "opacity-70 cursor-wait border-[var(--border)]" : ""} ${isFailed ? "border-red-500/60 text-red-300" : "border-[var(--border)]"}`}
            title={isConnecting ? "Connecting..." : isFailed ? failureHint : "Start voice call"}
          >
            {isConnecting ? (
              <div className="h-4 w-4 md:h-5 md:w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Phone className="h-4 w-4 md:h-5 md:w-5" />
            )}
          </Button>
        </motion.div>
        {isFailed && (
          <div className="absolute top-full right-0 mt-2 w-64 rounded-lg border border-red-500/30 bg-[#2A1518] px-3 py-2 text-xs text-red-200 shadow-xl z-50">
            {failureHint}
          </div>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // State 2: Others in call but you're NOT in it
  // ──────────────────────────────────────────────────────────
  if (!isUserInCall && isAnyoneElseInCall) {
    const isFailed = connectionState === "failed";
    const failureHint = connectionError || "Could not join voice call. Check microphone permission and network.";
    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowJoinDropdown(!showJoinDropdown)}
          className="relative flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/50 hover:bg-green-500/30 transition-all"
        >
          {/* Avatars */}
          <div className="flex -space-x-2">
            {othersInCall.slice(0, 2).map((user) => {
              const initials = getInitials(user.username);
              const colorClass = getUserColor(user.user_id);

              return (
                <div key={user.user_id} className="relative">
                  {user.avatar_url ? (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-900 overflow-hidden">
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900`}
                    >
                      {initials}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Participant count */}
          {othersInCall.length > 2 ? (
            <span className="text-white text-xs font-medium px-1">
              {othersInCall.length}
            </span>
          ) : null}

          {/* Pulsing phone icon */}
          <span className="relative flex items-center justify-center">
            <Phone className="h-3 w-3 text-green-400 relative z-10" />
            <span className="absolute inset-0 rounded-full bg-green-400/30 animate-ping" />
          </span>
        </motion.button>

        {/* Dropdown: who is in the call + Join button */}
        <AnimatePresence>
          {showJoinDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 bg-[#1A1A20] border border-white/10 rounded-xl p-4 min-w-[300px] shadow-2xl z-50 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  In Call — {othersInCall.length}{" "}
                  {othersInCall.length === 1 ? "person" : "people"}
                </h3>
              </div>

              {/* Participants List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {othersInCall.map((user) => {
                  const initials = getInitials(user.username);
                  const colorClass = getUserColor(user.user_id);

                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-2">
                        {user.avatar_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            <Image
                              src={user.avatar_url}
                              alt={user.username}
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold text-white`}
                          >
                            {initials}
                          </div>
                        )}
                        <span className="text-sm text-white truncate max-w-[160px]">
                          {user.username}
                        </span>
                      </div>
                      {user.isMuted ? (
                        <MicOff className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                      ) : (
                        <Mic className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Join Button */}
              <div className="pt-3 mt-2 border-t border-white/10">
                {isFailed && (
                  <p className="text-[11px] text-red-300 mb-2">{failureHint}</p>
                )}
                <Button
                  onClick={() => {
                    onJoinCall();
                    setShowJoinDropdown(false);
                  }}
                  disabled={connectionState === "connecting"}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-medium text-sm h-9 rounded-lg disabled:opacity-60"
                >
                  {connectionState === "connecting" ? (
                    <>
                      <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Join Call
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // State 3 & 4: You ARE in the call (compact + expanded)
  // ──────────────────────────────────────────────────────────
  if (isUserInCall) {
    return (
      <div className="flex items-center gap-1 relative" ref={dropdownRef}>
        {/* ── Compact badge with participant avatars ── */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/50 hover:bg-green-500/30 transition-all"
        >
          {/* Avatars */}
          <div className="flex -space-x-2">
            {participantsInCall.slice(0, 3).map((user) => {
              const initials = getInitials(user.username);
              const colorClass = getUserColor(user.user_id);

              return (
                <div key={user.user_id} className="relative">
                  {user.avatar_url ? (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-900 overflow-hidden">
                      <Image
                        src={user.avatar_url}
                        alt={user.username}
                        width={24}
                        height={24}
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full ${colorClass} flex items-center justify-center text-[10px] font-bold text-white border-2 border-gray-900`}
                    >
                      {initials}
                    </div>
                  )}
                  {/* Speaking indicator — green dot */}
                  {user.isSpeaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 border border-gray-900" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Count badge */}
          {participantsCount > 3 && (
            <span className="text-white text-xs font-medium px-0.5">
              +{participantsCount - 3}
            </span>
          )}

          {/* Collapse icon */}
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-green-400" />
          ) : (
            <ChevronDown className="h-3 w-3 text-green-400" />
          )}
        </motion.button>

        {/* ── Mute / Unmute button ── */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleMute}
          className={`rounded-full w-9 h-9 flex items-center justify-center transition-all border ${isMuted
              ? "bg-red-500/20 border-red-500/50 hover:bg-red-500/30 text-red-400"
              : "bg-white/5 border-white/20 hover:bg-white/10 text-white"
            }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <MicOff className="h-4 w-4" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </motion.button>

        {/* ── Leave call button ── */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            onLeaveCall();
            setIsExpanded(false);
          }}
          className="rounded-full w-9 h-9 flex items-center justify-center bg-red-500/20 border border-red-500/50 hover:bg-red-500/30 text-red-400 transition-all"
          title="Leave call"
        >
          <PhoneOff className="h-4 w-4" />
        </motion.button>

        {/* ── Expanded participant panel (State 4) ── */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 bg-[#1A1A20] border border-white/10 rounded-xl p-4 min-w-[320px] shadow-2xl z-50 backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  In Call — {participantsCount}{" "}
                  {participantsCount === 1 ? "person" : "people"}
                </h3>
                <Button
                  onClick={() => {
                    onLeaveCall();
                    setIsExpanded(false);
                  }}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white h-6 px-2 rounded"
                >
                  Leave
                </Button>
              </div>

              {/* Participants list */}
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {participantsInCall.map((user) => {
                  const initials = getInitials(user.username);
                  const colorClass = getUserColor(user.user_id);
                  const isCurrentUser = user.user_id === currentUserId;

                  return (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between py-1.5 px-1 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {user.avatar_url ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden">
                              <Image
                                src={user.avatar_url}
                                alt={user.username}
                                width={32}
                                height={32}
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full ${colorClass} flex items-center justify-center text-xs font-bold text-white`}
                            >
                              {initials}
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-sm text-white truncate">
                          {user.username}
                          {isCurrentUser ? " (You)" : ""}
                        </span>
                      </div>

                      {/* Right side: controls / indicators */}
                      <div className="flex-shrink-0 ml-2 flex items-center gap-1">
                        {isCurrentUser ? (
                          /* Current user: mute/unmute toggle */
                          <button
                            onClick={onToggleMute}
                            className={`p-1.5 rounded-full transition-colors ${isMuted
                                ? "bg-red-500/20 hover:bg-red-500/30"
                                : "hover:bg-white/10"
                              }`}
                            title={isMuted ? "Unmute" : "Mute"}
                          >
                            {isMuted ? (
                              <MicOff className="h-4 w-4 text-red-400" />
                            ) : (
                              <Mic className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        ) : user.isSpeaking ? (
                          /* Other user speaking: animated bars */
                          <div className="flex gap-[3px] items-end h-4">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ height: [4, 12, 4] }}
                                transition={{
                                  duration: 0.5,
                                  repeat: Infinity,
                                  delay: i * 0.12,
                                }}
                                className="w-[3px] bg-green-400 rounded-full"
                              />
                            ))}
                          </div>
                        ) : user.isMuted ? (
                          /* Other user muted */
                          <MicOff className="h-4 w-4 text-red-400" />
                        ) : (
                          /* Other user unmuted, not speaking */
                          <Mic className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
