"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProject, memberProject } from "@/store/ProjectSlice";
import { fetchNodes } from "@/store/NodesSlice";
import { fetchUserInfo } from "@/store/UserSlice";
import { cn } from "@/lib/utils";
import { Play } from "lucide-react";
import { HiEye } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import FileSidebar from "./components/FileSidebar";
import TopBar from "./components/TopBar";
import MonacoEditor from "./components/Editor";
import EditorTabs from "./components/EditorTabs";
import ChatPanel from "./components/ChatPanel";
import TerminalPanel from "./components/Terminal";
import AccessDeniedModal from "./components/AccessDeniedModal";
import { useParams } from "next/navigation";
import useRealtimeNodes from "@/hooks/useRealtimeNodes";
import useRealtimePresence from "@/hooks/useRealtimePresence";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const projectId = params.id;
  const dispatch = useDispatch();

  const projectname = useSelector((state) => state.project.projectname);
  const permissions = useSelector((state) => state.project.permissions);
  const projectStatus = useSelector((state) => state.project.status);
  const projectError = useSelector((state) => state.project.error);
  const currentUserId = useSelector((state) => state.user.id);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Real-time subscriptions for nodes and presence
  useRealtimeNodes(projectId, realtimeEnabled, currentUserId);
  useRealtimePresence(projectId, realtimeEnabled);

  useEffect(() => {
    // Fetch user info first for presence tracking
    dispatch(fetchUserInfo());

    if (projectId) {
      dispatch(fetchProject(projectId))
        .unwrap()
        .then((data) => {
          if (!data.permissions.canView) {
            setShowAccessDenied(true);
          } else {
            dispatch(memberProject(projectId));
            dispatch(fetchNodes(projectId));
            // Enable real-time subscriptions after successful project load
            setRealtimeEnabled(true);
          }
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
        }
      );
    }
  }, [dispatch, projectId]);

  // Also check after project status changes (public <-> private)
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

  // Access denied modal
  if (showAccessDenied) {
    return (
      <AccessDeniedModal
        isOpen={true}
        projectName={projectname || "this project"}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* File sidebar*/}
      <FileSidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-2">
        <div className="flex h-full flex-col">
          <TopBar
            onToggleChat={() => setIsChatOpen((v) => !v)}
            isChatOpen={isChatOpen}
          />

          {/* Workspace frame */}
          <div className="mx-4 flex flex-row h-full flex-1 rounded-sm mt-2">
            {/* Left: Editor */}
            <div
              className={cn(
                "flex h-full flex-1 flex-col bg-[#121217] transition-all duration-300 min-w-0",
                isChatOpen ? "w-[calc(100%-18rem)] pr-4" : "w-full"
              )}
            >
              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-[#36363E] px-3 mb-2 min-w-0 overflow-hidden">
                <EditorTabs />
                <div className="ml-auto flex items-center gap-2">
                  {permissions.canView && !permissions.canEdit && (
                                 <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full text-[10px] font-medium">
                                      <HiEye className="h-3 w-3" />
                                      View Only
                                    </span>
                  )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#C9C9D6] hover:text-white hover:bg-[#1A1A20] px-2 py-1"
                        onClick={() => {
                          setIsTerminalOpen(true);
                        }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                </div>
              </div>

              {/* Editor area */}
              <div className="relative flex-1 w-full bg-[#202026] min-w-0 overflow-hidden rounded-sm">
                <div className="relative w-full bg-[#0B0B0F] h-full">
                  <MonacoEditor />
                  {permissions.canView && (
                    <TerminalPanel
                      isOpen={isTerminalOpen}
                      onClose={() => setIsTerminalOpen(false)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right: Chat panel */}
            <ChatPanel isChatOpen={isChatOpen} />
          </div>
        </div>
      </main>
    </div>
  );
}



