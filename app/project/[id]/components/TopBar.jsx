"use client"

import { Button } from "@/components/ui/button";
import { FiMessageSquare } from "react-icons/fi";
import { useState, useMemo, useEffect } from "react";
import SharePanel from "./SharePanel";
import { useSelector } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import OnlineAvatars from "./OnlineAvatars";
import VoiceCall from "./VoiceCall";
import useVoiceCall from "@/hooks/useVoiceCall";
import { toast } from "sonner";


export default function TopBar({ onToggleChat, isChatOpen, onMenuClick }) {
  const project = useSelector((state) => state.project);
  const onlineUsers = useSelector((state) => state.project.onlineUsers);
  const reduxUserId = useSelector((state) => state.user.id);
  const permissions = useSelector((state) => state.project.permissions);
  const accessState = useSelector((state) => state.project.accessState);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.id;
  const shouldOpenShareFromNotification =
    searchParams.get("panel") === "share" && permissions.isMember;

  // Real voice call hook — connects WebSocket + WebRTC SFU
  const {
    isUserInCall,
    isMuted,
    participants,
    currentUserId: voiceUserId,
    connectionState,
    connectionError,
    roomId: voiceRoomId,
    joinCall,
    leaveCall,
    toggleMute,
    getRoomInfo,
  } = useVoiceCall(projectId);

  // Expose debug functions to window for console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.voiceCallDebug = {
        getRoomInfo,
        roomId: voiceRoomId,
      };
      console.log('[TopBar] 🐛 Voice call debug functions available:');
      console.log('  window.voiceCallDebug.getRoomInfo() - Get current room info');
      console.log('  window.voiceCallDebug.roomId - Current room ID');
    }
  }, [getRoomInfo, voiceRoomId]);

  useEffect(() => {
    if (shouldOpenShareFromNotification) {
      setIsShareOpen(true);
    }
  }, [shouldOpenShareFromNotification]);

  // Prefer Redux user ID for stable identity across WS/presence sources.
  const currentUserId = reduxUserId || voiceUserId || "current-user";

  const isValidDisplayName = (name) => {
    if (!name) return false;
    if (name.includes("eyJ")) return false;
    if (name.startsWith("mock-user-")) return false;
    if (name.startsWith("anon-")) return false;
    if (/^User \d+$/i.test(name)) return false;
    if (/^user$/i.test(name)) return false;
    return true;
  };

  // Enrich voice participants with actual user data from online presence
  const enrichedParticipants = useMemo(() => {
    return participants.map((p) => {
      const onlineUser = onlineUsers.find((u) => u.user_id === p.user_id);
      
      // Get the best available username
      let displayName = p.username;
      if (isValidDisplayName(onlineUser?.username)) {
        displayName = onlineUser.username;
      } else if (!isValidDisplayName(p.username)) {
        displayName = onlineUser?.username || p.username;
      }
      
      return {
        ...p,
        username: displayName,
        avatar_url: onlineUser?.avatar_url || p.avatar_url,
      };
    });
  }, [participants, onlineUsers]);

  const handleRequestAccess = async () => {
    setIsRequestingAccess(true);
    try {
      const res = await fetch("/api/project/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          projectId,
          accessType: "collaborator",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request access");
      }

      toast.success(data.message || "Request sent");
      window.location.reload();
    } catch (error) {
      toast.error(error.message || "Failed to request access");
    } finally {
      setIsRequestingAccess(false);
    }
  };

  const renderAccessButton = () => {
    if (permissions.isMember) {
      return (
        <Button
          className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 md:px-6 py-2 text-sm md:text-base h-9 md:h-10"
          onClick={() => setIsShareOpen(true)}
        >
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">S</span>
        </Button>
      );
    }

    if (accessState === "pending") {
      return (
        <Button
          disabled
          className="bg-[#2B2B30] text-gray-300 px-3 md:px-6 py-2 text-sm md:text-base h-9 md:h-10"
        >
          Request Sent
        </Button>
      );
    }

    if (accessState === "approved") {
      return (
        <Button
          className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 md:px-6 py-2 text-sm md:text-base h-9 md:h-10 text-black"
          onClick={() => window.location.reload()}
        >
          Enter Project
        </Button>
      );
    }

    if (accessState === "rejected") {
      return (
        <Button
          disabled
          className="bg-red-500/10 text-red-300 px-3 md:px-6 py-2 text-sm md:text-base h-9 md:h-10"
        >
          Request Denied
        </Button>
      );
    }

    return (
      <Button
        className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 md:px-6 py-2 text-sm md:text-base h-9 md:h-10 text-black"
        onClick={handleRequestAccess}
        disabled={isRequestingAccess}
      >
        {isRequestingAccess ? "Sending..." : "Request Access"}
      </Button>
    );
  };

  const handleCloseShare = () => {
    setIsShareOpen(false);

    if (searchParams.get("panel") === "share") {
      router.replace(`/project/${projectId}`);
    }
  };

  return (
    <div className="flex items-center justify-between px-3 md:px-4 pt-4 md:pt-6 pb-2">
      {/* Left: Hamburger + Project Name */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        {/* Mobile hamburger for file sidebar */}
        <button
          className="lg:hidden p-2 rounded-lg bg-[#212126] hover:bg-[#2F2F35] shrink-0"
          onClick={onMenuClick}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Project Name */}
        <div className="text-base md:text-xl font-semibold text-[var(--foreground)] truncate">
          {project.projectname}
        </div>
      </div>

      {/* Right Side: Avatars, Voice Call, Chat Icon, Share Button */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Online Users Avatars - Hidden on small screens */}
        <div className="hidden sm:block">
          <OnlineAvatars onlineUsers={onlineUsers} />
        </div>

        {/* Voice Call Component - Between Avatars and Chat */}
        <VoiceCall
          currentUserId={currentUserId}
          onlineUsers={onlineUsers}
          participantsInCall={enrichedParticipants}
          isUserInCall={isUserInCall}
          isMuted={isMuted}
          connectionState={connectionState}
          connectionError={connectionError}
          onJoinCall={joinCall}
          onLeaveCall={leaveCall}
          onToggleMute={toggleMute}
        />

        {/* Chat Button */}
        <Button
          onClick={onToggleChat}
          className={`rounded-full border border-[var(--border)] bg-transparent text-white hover:bg-[var(--accent)] w-9 h-9 md:w-10 md:h-10 p-0 ${isChatOpen ? "bg-[var(--secondary)]" : ""
            }`}
        >
          <FiMessageSquare className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        {renderAccessButton()}
      </div>

      {permissions.isMember && (
        <SharePanel
          isOpen={isShareOpen}
          onClose={handleCloseShare}
        />
      )}
    </div>
  );
}
