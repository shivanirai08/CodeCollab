"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchProject, memberProject } from "@/store/ProjectSlice";
import { cn } from "@/lib/utils";
import { Terminal, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import FileSidebar from "./components/FileSidebar";
import TopBar from "./components/TopBar";
import MonacoEditor from "./components/Editor";
import Tab from "./components/EditorTabs";
import ChatPanel from "./components/ChatPanel";
import TerminalPanel from "./components/Terminal";
import {useParams} from "next/navigation";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("index.html");
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const projectId =  params.id;

  const dispatch = useDispatch();
  useEffect(()=>{
    dispatch(fetchProject(projectId));
    dispatch(memberProject(projectId));
  },[dispatch, projectId])

  return (
    <div className="flex h-screen bg-background">
      {/* File sidebar (main navigation) */}
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
                isChatOpen ? "w-[calc(100%-18rem)] pr-4" : "w-full" // shrink when chat opens
              )}
            >
              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-[#36363E] px-3 mb-2 min-w-0 overflow-hidden">
                <Tab
                  name="index.html"
                  onClick={() => setActiveTab("index.html")}
                  active={activeTab}
                />
                <Tab
                  name="style.css"
                  onClick={() => setActiveTab("style.css")}
                  active={activeTab}
                />
                <Tab
                  name="script.js"
                  onClick={() => setActiveTab("script.js")}
                  active={activeTab}
                />
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#C9C9D6] hover:text-white hover:bg-[#1A1A20] px-2 py-1"
                    onClick={() => {
                      setIsTerminalOpen(true);
                      console.log("Open terminal");
                    }}
                  >
                    <Terminal className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#C9C9D6] hover:text-white hover:bg-[#1A1A20] px-2 py-1"
                    onClick={() => {
                      // Run code functionality
                      console.log("Run code");
                    }}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Editor area */}
              <div className="relative flex-1 w-full bg-[#202026] min-w-0 overflow-hidden rounded-sm">
                <div className="relative w-full bg-[#0B0B0F] h-full">
                  <MonacoEditor activeTab={activeTab}/>
                <TerminalPanel
                  isOpen={isTerminalOpen}
                  onClose={() => setIsTerminalOpen(false)}
                />
                </div>
              </div>
            </div>

            {/* Right: Chat panel */}
            <ChatPanel isChatOpen={isChatOpen}/>
          </div>
        </div>
      </main>

      

    </div>
  );
}



