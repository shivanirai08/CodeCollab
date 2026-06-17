"use client";

import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import SharePanel from "./SharePanel";
import OnlineAvatars from "./OnlineAvatars";
import VoiceCall from "./VoiceCall";
import useVoiceCall from "@/hooks/useVoiceCall";
import useNotifications from "@/hooks/useNotifications";
import NotificationBell from "@/components/ui/NotificationBell";
import { toast } from "sonner";
import { fetchProject, fetchGitStatus } from "@/store/ProjectSlice";
import { fetchNodes, closeAllFiles } from "@/store/NodesSlice";
import {
  GitBranch,
  Github,
  Menu,
  MessageSquare,
  SquareTerminal,
  ChevronDown,
} from "lucide-react";

export default function TopBar({
  onToggleGit,
  isGitOpen,
  onToggleChat,
  isChatOpen,
  onToggleTerminal,
  isTerminalOpen,
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
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRequestingAccess, setIsRequestingAccess] = useState(false);
  const [isBranchSwitching, setIsBranchSwitching] = useState(false);
  const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
  const [branches, setBranches] = useState({ current: "", local: [], remote: [] });
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const projectId = params.id;
  const shouldOpenShareFromNotification =
    searchParams.get("panel") === "share" && permissions.isMember;
  const { notifications } = useNotifications();

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.voiceCallDebug = {
        getRoomInfo,
        roomId: voiceRoomId,
      };
    }
  }, [getRoomInfo, voiceRoomId]);

  useEffect(() => {
    if (shouldOpenShareFromNotification) {
      setIsShareOpen(true);
    }
  }, [shouldOpenShareFromNotification]);

  // Load branches when git panel opens
  useEffect(() => {
    if (isBranchMenuOpen && repository) {
      const loadBranches = async () => {
        try {
          const res = await fetch(`/api/project/${projectId}/git/branches`, {
            method: "GET",
            credentials: "same-origin",
          });
          const data = await res.json();
          if (res.ok) {
            setBranches(data);
          }
        } catch (error) {
          console.error("Failed to load branches:", error);
        }
      };
      loadBranches();
    }
  }, [isBranchMenuOpen, repository, projectId]);

  const handleCheckoutBranch = async (branch) => {
    if (branch === repository?.currentBranch) {
      setIsBranchMenuOpen(false);
      return;
    }

    setIsBranchSwitching(true);
    try {
      const res = await fetch(`/api/project/${projectId}/git/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ branch }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to checkout branch");
      }

      const {
        updatedCount = 0,
        createdCount = 0,
        deletedCount = 0,
      } = data.mergeResult || {};
      const summary = [];
      if (updatedCount > 0) summary.push(`${updatedCount} files updated`);
      if (createdCount > 0) summary.push(`${createdCount} files added`);
      if (deletedCount > 0) summary.push(`${deletedCount} files removed`);

      toast.success(
        summary.length > 0
          ? `Switched to "${data.branch || branch}": ${summary.join(", ")}`
          : `Switched to branch "${data.branch || branch}"`
      );

      dispatch(closeAllFiles());
      await dispatch(fetchProject(projectId));
      await dispatch(fetchGitStatus(projectId));
      await dispatch(fetchNodes(projectId));

      setIsBranchMenuOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to checkout branch");
    } finally {
      setIsBranchSwitching(false);
    }
  };

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

  const enrichedParticipants = useMemo(() => {
    return participants.map((participant) => {
      const onlineUser = onlineUsers.find((user) => user.user_id === participant.user_id);

      let displayName = participant.username;
      if (isValidDisplayName(onlineUser?.username)) {
        displayName = onlineUser.username;
      } else if (!isValidDisplayName(participant.username)) {
        displayName = onlineUser?.username || participant.username;
      }

      return {
        ...participant,
        username: displayName,
        avatar_url: onlineUser?.avatar_url || participant.avatar_url,
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
          className="h-9 bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 py-2 text-sm text-black md:h-10 md:px-6"
          onClick={() => setIsShareOpen(true)}
        >
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">S</span>
          {projectJoinRequestAlertCount > 0 ? (
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {projectJoinRequestAlertCount}
            </span>
          ) : null}
        </Button>
      );
    }

    if (accessState === "pending") {
      return (
        <Button
          disabled
          className="h-9 bg-[#2B2B30] px-3 py-2 text-sm text-gray-300 md:h-10 md:px-6"
        >
          Request Sent
        </Button>
      );
    }

    if (accessState === "approved") {
      return (
        <Button
          className="h-9 bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 py-2 text-sm text-black md:h-10 md:px-6"
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
          className="h-9 bg-red-500/10 px-3 py-2 text-sm text-red-300 md:h-10 md:px-6"
        >
          Request Denied
        </Button>
      );
    }

    return (
      <Button
        className="h-9 bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 py-2 text-sm text-black md:h-10 md:px-6"
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

  const topButtonClass = (active) =>
    `relative inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm transition-colors md:h-10 ${
      active
        ? "border-[#3A3A42] bg-[#1A1A20] text-white"
        : "border-[#2B2B30] bg-transparent text-[#C9C9D6] hover:border-[#3A3A42] hover:bg-[#17171D] hover:text-white"
    }`;

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#24242A] px-3 pb-3 pt-4 md:px-4 md:pt-5">
        <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
          <button
            className="rounded-lg bg-[#212126] p-2 hover:bg-[#2F2F35] lg:hidden"
            onClick={onMenuClick}
            aria-label="Open file tree"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-[var(--foreground)] md:text-xl">
              {project.projectname}
            </div>
            <div className="mt-1 flex max-w-full items-center gap-2 text-xs text-[#8B909A]">
              {repository ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#2B2B30] bg-[#17171D] px-2 py-1">
                    <Github className="size-3" />
                    <span className="truncate">{repository.repoFullName}</span>
                  </span>
                  {/* Branch switcher */}
                  <div className="relative hidden sm:block">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full border border-[#2B2B30] bg-[#17171D] px-2 py-1 transition-colors hover:border-[#3A3A42] hover:bg-[#1F1F27]"
                      onClick={() => permissions.canEdit && setIsBranchMenuOpen((v) => !v)}
                      title={permissions.canEdit ? "Switch branch" : "Current branch"}
                    >
                      <GitBranch className="size-3" />
                      <span>{repository.currentBranch}</span>
                      {permissions.canEdit && <ChevronDown className="size-3" />}
                    </button>
                    {isBranchMenuOpen && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsBranchMenuOpen(false)}
                        />
                        <div className="absolute left-0 top-full z-20 mt-1 min-w-[220px] rounded-xl border border-[#2B2B30] bg-[#18181E] p-1 shadow-lg">
                          {isBranchSwitching && (
                            <div className="px-3 py-2 text-xs text-[#8B909A]">Switching branch…</div>
                          )}
                          {!isBranchSwitching && (
                            <>
                              {branches.local.length > 0 && (
                                <>
                                  <p className="px-3 py-1 text-[10px] uppercase tracking-widest text-[#5A5A68]">Local</p>
                                  {branches.local.map((b) => (
                                    <button
                                      key={`local-${b}`}
                                      type="button"
                                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                        b === repository.currentBranch
                                          ? "bg-[#25252D] text-white"
                                          : "text-[#C9C9D6] hover:bg-[#1F1F27] hover:text-white"
                                      }`}
                                      onClick={() => handleCheckoutBranch(b)}
                                    >
                                      <GitBranch className="size-3 shrink-0" />
                                      <span className="truncate">{b}</span>
                                      {b === repository.currentBranch && (
                                        <span className="ml-auto text-[10px] text-[#34D399]">current</span>
                                      )}
                                    </button>
                                  ))}
                                </>
                              )}
                              {branches.remote.length > 0 && (
                                <>
                                  <p className="mt-1 px-3 py-1 text-[10px] uppercase tracking-widest text-[#5A5A68]">Remote</p>
                                  {branches.remote
                                    .filter((b) => !branches.local.includes(b))
                                    .map((b) => (
                                      <button
                                        key={`remote-${b}`}
                                        type="button"
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[#C9C9D6] transition-colors hover:bg-[#1F1F27] hover:text-white"
                                        onClick={() => handleCheckoutBranch(b)}
                                      >
                                        <GitBranch className="size-3 shrink-0 text-[#5A5A68]" />
                                        <span className="truncate">{b}</span>
                                      </button>
                                    ))}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <span className="hidden md:inline">{gitStatus?.isClean ? "Clean working tree" : "Uncommitted changes"}</span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#2B2B30] bg-[#141419] px-2 py-1">
                  <Github className="size-3" />
                  No Git repository connected
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="hidden xl:block">
            <OnlineAvatars onlineUsers={onlineUsers} />
          </div>

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

          <button type="button" onClick={onToggleGit} className={topButtonClass(isGitOpen)}>
            <Github className="h-4 w-4" />
            Git
          </button>

          <button type="button" onClick={onToggleChat} className={topButtonClass(isChatOpen)}>
            {hasUnreadChat && !isChatOpen ? (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
            ) : null}
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>

          {renderAccessButton()}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[#24242A] px-3 py-2 lg:hidden">
        <button type="button" onClick={onToggleGit} className={topButtonClass(isGitOpen)}>
          <Github className="h-4 w-4" />
          Git
        </button>
        <button type="button" onClick={onToggleChat} className={topButtonClass(isChatOpen)}>
          {hasUnreadChat && !isChatOpen ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          ) : null}
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button type="button" onClick={onToggleTerminal} className={topButtonClass(isTerminalOpen)}>
          <SquareTerminal className="h-4 w-4" />
          Terminal
        </button>
        <div className="ml-auto">{renderAccessButton()}</div>
      </div>

      {permissions.isMember ? (
        <SharePanel
          isOpen={isShareOpen}
          onClose={handleCloseShare}
        />
      ) : null}
    </>
  );
}
