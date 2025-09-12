"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, X } from "lucide-react";
import FileSidebar from "@/components/ui/FileSidebar";
import { FiMessageSquare } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ProjectWorkspacePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("index.html");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);

  return (
    <div className="flex h-screen bg-background">
      {/* Global sidebar (main navigation) */}
      <FileSidebar />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto pb-4">
        <div className="flex h-full flex-col">
          <TopBar onToggleChat={() => setIsChatOpen((v) => !v)} isChatOpen={isChatOpen}/>

          {/* Workspace frame */}
          <div className="mx-4 flex flex-row h-full flex-1 rounded-sm">
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
                <div className="ml-auto" />
              </div>

              {/* Editor area */}
              <div className="relative flex-1 w-full bg-[#202026] min-w-0 overflow-hidden rounded-sm">
                <div id="editor-mount" className="absolute inset-0" />
              </div>
            </div>

            {/* Right: Chat panel */}
            <div
              className={cn(
                "flex h-full flex-col overflow-hidden bg-[#19191F] transition-all duration-300 shrink-0 rounded-sm",
                isChatOpen ? "w-72" : "w-0"
              )}
            >
              <div className="flex items-center justify-between border-b border-[#36363E] px-4 py-3">
                <div className="text-sm font-semibold text-[#E1E1E6]">
                  Chats
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-[#C9C9D6] hover:text-white"
                  aria-label="Close chat"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                <div className="text-[#C9C9D6]">
                  This space is reserved for the chat panel.
                </div>
                <div className="text-sm text-[#8D8D98]">
                  Hook your chat messages here.
                </div>
              </div>

              <div className="flex border-t border-[#36363E] p-3">
                <Input
                  type="text"
                  placeholder="Type message.."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const message = e.target.value;
                      if (message) {
                        setIsSending(true);
                        console.log(message);
                        setTimeout(() => {
                          setIsSending(false);
                        }, 1000);
                        const newMessage = {
                          id: Date.now(),
                          text: message,
                        };
                        setMessages((prev) => [...prev, newMessage]);
                        e.target.value = "";
                      }
                    }
                  }}
                />
                <Button
                  className="ml-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const message = document.querySelector("input").value;
                    if (message) {
                      setIsSending(true);
                      console.log("sent", message);
                      setTimeout(() => {
                        setIsSending(false);
                      }, 1000);
                      const newMessage = {
                        id: Date.now(),
                        text: message,
                      };
                      setMessages((prev) => [...prev, newMessage]);
                      document.querySelector("input").value = "";
                    }
                  }}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Tab({ name, active, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer",
        active == name
          ? "text-white bg-[#1A1A20] rounded-t-md"
          : "text-[#C9C9D6]"
      )}
    >
      <span>{name}</span>
      <span className="opacity-60">×</span>
    </div>
  );
}

function TopBar({ onToggleChat , isChatOpen}) {
  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-2">
      {/* Left: Project Name */}
      <div className="text-xl font-semibold text-[var(--foreground)]">
        Project Name
      </div>

      {/* Right Side: Avatars, Chat Icon, Share Button */}
      <div className="flex items-center gap-3">
        {/* Avatars */}
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black border-2 border-[var(--card)]">
            SR
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white border-2 border-[var(--card)]">
            KM
          </div>
        </div>

        {/* Chat Button */}
        <Button
          onClick={onToggleChat}
          className={`rounded-full border border-[var(--border)] bg-transparent text-white hover:bg-[var(--accent)] w-10 h-10 ${isChatOpen ? 'bg-[var(--secondary)]' : ''}`}
        >
          <FiMessageSquare className="h-5 w-5" />
        </Button>

        {/* Share Button */}
        <Button className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-6">
          Share
        </Button>
      </div>
    </div>
  );
}
