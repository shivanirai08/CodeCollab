"use client";

import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProject, memberProject, clearProject, fetchGitStatus } from "@/store/ProjectSlice";
import { fetchNodes } from "@/store/NodesSlice";
import { fetchUserInfo } from "@/store/UserSlice";
import { Terminal } from "lucide-react";
import { HiEye } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import FileSidebar from "./components/FileSidebar";
import TopBar from "./components/TopBar";
import EditorTabs from "./components/EditorTabs";
import AccessDeniedModal from "./components/AccessDeniedModal";
import RemovedFromProjectModal from "./components/RemovedFromProjectModal";
import { useParams, useSearchParams } from "next/navigation";
import useRealtimeNodes from "@/hooks/useRealtimeNodes";
import useRealtimePresence from "@/hooks/useRealtimePresence";
import useRealtimeMembers from "@/hooks/useRealtimeMembers";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("./components/Editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground">Loading editor...</div>
    </div>
  ),
});

const ChatPanel = dynamic(() => import("./components/ChatPanel"), {
  ssr: false,
});

const GitPanel = dynamic(() => import("./components/GitPanel"), {
  ssr: false,
});

const TerminalPanel = dynamic(() => import("./components/Terminal"), {
  ssr: false,
});

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 420;
const MIN_TERMINAL_HEIGHT = 220;
const MAX_TERMINAL_HEIGHT = 520;

export default function ProjectWorkspacePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params.id;
  const dispatch = useDispatch();

  const projectname = useSelector((state) => state.project.projectname);
  const permissions = useSelector((state) => state.project.permissions);
  const projectStatus = useSelector((state) => state.project.status);
  const projectError = useSelector((state) => state.project.error);
  const accessState = useSelector((state) => state.project.accessState);
  const currentUserId = useSelector((state) => state.user.id);

  const [isGitOpen, setIsGitOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalTab, setTerminalTab] = useState("output");
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [showRemovedModal, setShowRemovedModal] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [mobileFileSidebarOpen, setMobileFileSidebarOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [canShowDualPanels, setCanShowDualPanels] = useState(false);
  const [fileSidebarWidth, setFileSidebarWidth] = useState(288);
  const [terminalHeight, setTerminalHeight] = useState(320);
  const [activeResizeHandle, setActiveResizeHandle] = useState(null);

  const openBottomTray = (tab) => {
    setIsTerminalOpen(true);
    setTerminalTab(tab);
  };

  const handleUserRemoved = useCallback(() => {
    setRealtimeEnabled(false);
    dispatch(clearProject());
    setShowRemovedModal(true);
  }, [dispatch]);

  useRealtimeNodes(projectId, realtimeEnabled, currentUserId);
  useRealtimePresence(projectId, realtimeEnabled);
  useRealtimeMembers(projectId, realtimeEnabled, handleUserRemoved);

  useEffect(() => {
    const handleAccessLost = (event) => {
      const lostProjectId = event?.detail?.projectId;

      if (String(lostProjectId) !== String(projectId)) {
        return;
      }

      handleUserRemoved();
    };

    window.addEventListener("project-access-lost", handleAccessLost);

    return () => {
      window.removeEventListener("project-access-lost", handleAccessLost);
    };
  }, [handleUserRemoved, projectId]);

  useEffect(() => {
    const syncViewportMode = () => {
      setCanShowDualPanels(window.innerWidth >= 1440);
    };

    syncViewportMode();
    window.addEventListener("resize", syncViewportMode);

    return () => {
      window.removeEventListener("resize", syncViewportMode);
    };
  }, []);

  useEffect(() => {
    const requestedPanel = searchParams.get("panel");

    if (requestedPanel === "git") {
      setIsGitOpen(true);
    }

    if (requestedPanel === "chat") {
      setIsChatOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    dispatch(fetchUserInfo());

    if (!projectId) {
      return;
    }

    dispatch(fetchProject(projectId))
      .unwrap()
      .then((data) => {
        if (!data.permissions.canView) {
          setShowAccessDenied(true);
          return;
        }

        dispatch(memberProject(projectId));
        dispatch(fetchNodes(projectId));

        if (data.repository) {
          dispatch(fetchGitStatus(projectId));
        }

        setRealtimeEnabled(true);
      })
      .catch((error) => {
        console.error("Failed to fetch project:", error);
        if (
          error.includes("permission") ||
          error.includes("Unauthorized") ||
          error.includes("Forbidden")
        ) {
          setShowAccessDenied(true);
        }
      });
  }, [dispatch, projectId]);

  useEffect(() => {
    if (isChatOpen) {
      setHasUnreadChat(false);
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (projectStatus === "succeeded") {
      if (!permissions.canView) {
        setShowAccessDenied(true);
      }
    } else if (projectStatus === "failed" && projectError) {
      if (
        projectError.includes("permission") ||
        projectError.includes("Unauthorized") ||
        projectError.includes("Forbidden")
      ) {
        setShowAccessDenied(true);
      }
    }
  }, [projectStatus, permissions, projectError]);

  useEffect(() => {
    if (canShowDualPanels || !isGitOpen || !isChatOpen) {
      return;
    }

    setIsChatOpen(false);
  }, [canShowDualPanels, isGitOpen, isChatOpen]);

  useEffect(() => {
    if (!activeResizeHandle) {
      return;
    }

    const handleMouseMove = (event) => {
      if (activeResizeHandle === "sidebar") {
        const nextWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, event.clientX));
        setFileSidebarWidth(nextWidth);
      }

      if (activeResizeHandle === "terminal") {
        const nextHeight = window.innerHeight - event.clientY;
        const clampedHeight = Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, nextHeight));
        setTerminalHeight(clampedHeight);
      }
    };

    const handleMouseUp = () => {
      setActiveResizeHandle(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [activeResizeHandle]);

  if (showRemovedModal) {
    return (
      <RemovedFromProjectModal
        isOpen={true}
        projectName={projectname || "this project"}
      />
    );
  }

  if (showAccessDenied) {
    return (
      <AccessDeniedModal
        isOpen={true}
        projectName={projectname || "this project"}
        projectId={projectId}
        accessState={accessState}
      />
    );
  }

  const handleToggleGit = () => {
    setIsGitOpen((current) => {
      const next = !current;

      if (next && !canShowDualPanels) {
        setIsChatOpen(false);
      }

      return next;
    });
  };

  const handleToggleChat = () => {
    setIsChatOpen((current) => {
      const next = !current;

      if (next && !canShowDualPanels) {
        setIsGitOpen(false);
      }

      return next;
    });
  };

  const showInlineGitPanel = isGitOpen;
  const showInlineChatPanel = isChatOpen && (canShowDualPanels || !showInlineGitPanel);
  return (
    <div className="flex h-screen bg-background">
      <FileSidebar
        desktopWidth={fileSidebarWidth}
        mobileOpen={mobileFileSidebarOpen}
        onClose={() => setMobileFileSidebarOpen(false)}
      />

      <button
        type="button"
        aria-label="Resize file sidebar"
        className="hidden h-full w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[#9CA3AF]/30 lg:block"
        onMouseDown={() => setActiveResizeHandle("sidebar")}
      />

      <main className="flex-1 overflow-hidden pb-2">
        <div className="flex h-full flex-col">
          <TopBar
            onToggleGit={handleToggleGit}
            isGitOpen={isGitOpen}
            onToggleChat={handleToggleChat}
            isChatOpen={isChatOpen}
            onToggleTerminal={() => openBottomTray("output")}
            isTerminalOpen={isTerminalOpen}
            onMenuClick={() => setMobileFileSidebarOpen(true)}
            hasUnreadChat={hasUnreadChat}
          />

          <div className="mx-2 mt-2 flex min-h-0 flex-1 flex-col gap-2 md:mx-4">
            <div className="flex min-h-0 flex-1 gap-2">
              <div className="flex min-h-0 flex-1 flex-col rounded-sm border border-[#24242A] bg-[#121217]">
                <div className="mb-2 flex min-w-0 items-center gap-2 overflow-x-auto border-b border-[#36363E] px-2 pt-2 md:px-3">
                  <EditorTabs onOpenProblems={() => openBottomTray("problems")} />
                  <div className="ml-auto flex items-center gap-2 pb-2">
                    {permissions.canView && !permissions.canEdit ? (
                      <span className="hidden items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400 sm:inline-flex">
                        <HiEye className="h-3 w-3" />
                        View Only
                      </span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 py-1 text-[#C9C9D6] hover:bg-[#1A1A20] hover:text-white"
                      onClick={() => openBottomTray("output")}
                      title="Terminal"
                    >
                      <Terminal className="h-3 w-3 md:h-4 md:w-4" />
                    </Button>
                  </div>
                </div>

                <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm bg-[#0B0B0F]">
                  <MonacoEditor />
                </div>
              </div>

              <GitPanel
                projectId={projectId}
                isOpen={showInlineGitPanel}
                onClose={() => setIsGitOpen(false)}
              />

              <ChatPanel
                isChatOpen={showInlineChatPanel}
                onClose={() => setIsChatOpen(false)}
                projectId={projectId}
                realtimeEnabled={realtimeEnabled}
                onUnreadChange={setHasUnreadChat}
                desktopClassName="lg:w-auto"
                desktopWidth={showInlineGitPanel ? 320 : 360}
              />
            </div>

            {permissions.canView && isTerminalOpen ? (
              <div
                className="overflow-hidden rounded-sm border border-[#24242A] bg-[#0F0F14]"
                style={{ height: `${terminalHeight}px` }}
              >
                <button
                  type="button"
                  aria-label="Resize terminal panel"
                  className="block h-1 w-full cursor-row-resize bg-transparent hover:bg-[#9CA3AF]/30"
                  onMouseDown={() => setActiveResizeHandle("terminal")}
                />
                <TerminalPanel
                  isOpen={isTerminalOpen}
                  onClose={() => {
                    setIsTerminalOpen(false);
                    setTerminalTab("output");
                  }}
                  initialTab={terminalTab}
                  layout="embedded"
                />
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
