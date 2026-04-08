"use client"

import { Button } from "@/components/ui/button";
import { FiMessageSquare } from "react-icons/fi";
import { useState, useMemo, useEffect } from "react";
import SharePanel from "./SharePanel";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import OnlineAvatars from "./OnlineAvatars";
import VoiceCall from "./VoiceCall";
import useVoiceCall from "@/hooks/useVoiceCall";
import useNotifications from "@/hooks/useNotifications";
import NotificationBell from "@/components/ui/NotificationBell";
import { toast } from "sonner";
import GitPanel from "./GitPanel";
import { GitBranch, Github, RefreshCw } from "lucide-react";
import { fetchGitStatus } from "@/store/ProjectSlice";


export default function TopBar({
  onToggleChat,
  isChatOpen,
  onMenuClick,
  hasUnreadChat = false,
}) {
  const dispatch = useDispatch();
  const project = useSelector((state) => state.project);
  const onlineUsers = useSelector((state) => state.project.onlineUsers);
  const reduxUserId = useSelector((state) => state.user.id);
  const permissions = useSelector((state) => state.project.permissions);
  const accessState = useSelector((state) => state.project.accessState);
  const repository = useSelector((state) => state.project.repository);
  const gitStatus = useSelector((state) => state.project.gitStatus);
  const gitStatusLoading = useSelector((state) => state.project.gitStatusLoading);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isGitPanelOpen, setIsGitPanelOpen] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.id;
  const shouldOpenShareFromNotification =
    searchParams.get("panel") === "share" && permissions.isMember;
  const { notifications } = useNotifications();

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
  const projectJoinRequestAlertCount = useMemo(() => {
    if (!permissions.isOwner) return 0;

    return notifications.filter(
      (notification) =>
        !notification.is_read &&
        notification.type === "join_request" &&
        notification.metadata?.projectId === projectId
    ).length;
  }, [notifications, permissions.isOwner, projectId]);

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
          {/* {projectJoinRequestAlertCount > 0 && (
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {projectJoinRequestAlertCount}
            </span>
          )} */}
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

  const handleRefreshGitStatus = async () => {
    try {
      await dispatch(fetchGitStatus(projectId)).unwrap();
    } catch (error) {
      toast.error(error || "Failed to refresh git status");
    }
  };

  return (
    <>
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
        <div className="min-w-0">
          <div className="text-base md:text-xl font-semibold text-[var(--foreground)] truncate">
            {project.projectname}
          </div>
          {repository && (
            <button
              type="button"
              onClick={() => setIsGitPanelOpen(true)}
              className="mt-1 flex max-w-full items-center gap-2 rounded-full border border-[#2B2B30] bg-[#17171D] px-3 py-1 text-xs text-gray-300 transition-colors hover:border-[#3A3A42] hover:text-white"
            >
              <Github className="size-3.5 shrink-0" />
              <span className="truncate">{repository.repoFullName}</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5">
                <GitBranch className="size-3" />
                {repository.currentBranch}
              </span>
              <span className="hidden md:inline-flex rounded-full bg-white/5 px-2 py-0.5">
                {gitStatus?.isClean ? "Clean" : "Dirty"}
              </span>
            </button>
          )}
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

        <NotificationBell
          projectId={projectId}
          title="Project Notifications"
          emptyMessage="No notifications for this project yet"
        />

        {repository && (
          <Button
            variant="ghost"
            size="sm"
            className="border border-[#2B2B30] bg-[#17171D] text-gray-200 hover:bg-[#202027] hover:text-white"
            onClick={handleRefreshGitStatus}
            disabled={gitStatusLoading}
            title="Refresh Git Status"
          >
            <RefreshCw className={`size-4 ${gitStatusLoading ? "animate-spin" : ""}`} />
          </Button>
        )}

        {/* Chat Button */}
        <Button
          onClick={onToggleChat}
          className={`relative rounded-full border border-[var(--border)] bg-transparent text-white hover:bg-[var(--accent)] w-9 h-9 md:w-10 md:h-10 p-0 ${isChatOpen ? "bg-[var(--secondary)]" : ""
            }`}
        >
          {hasUnreadChat && !isChatOpen && (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
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
    <GitPanel
      projectId={projectId}
      isOpen={isGitPanelOpen}
      onClose={() => setIsGitPanelOpen(false)}
    />
    </>
  );
}
