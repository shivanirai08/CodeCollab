"use client"

import { Button } from "@/components/ui/button";
import { FiMessageSquare } from "react-icons/fi";
import { useState } from "react";
import SharePanel from "./SharePanel";
import { useSelector } from "react-redux";
import OnlineAvatars from "./OnlineAvatars";


export default function TopBar({ onToggleChat, isChatOpen, onMenuClick }) {
  const project = useSelector((state) => state.project);
  const onlineUsers = useSelector((state) => state.project.onlineUsers);
  const [isShareOpen, setIsShareOpen] = useState(false);

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

      {/* Right Side: Avatars, Chat Icon, Share Button */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Online Users Avatars - Hidden on small screens */}
        <div className="hidden sm:block">
          <OnlineAvatars onlineUsers={onlineUsers} />
        </div>

        {/* Chat Button */}
        <Button
          onClick={onToggleChat}
          className={`rounded-full border border-[var(--border)] bg-transparent text-white hover:bg-[var(--accent)] w-9 h-9 md:w-10 md:h-10 p-0 ${
            isChatOpen ? "bg-[var(--secondary)]" : ""
          }`}
        >
          <FiMessageSquare className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        {/* Share Button */}
        <Button
          className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-3 md:px-6 py-2 text-sm md:text-base h-9 md:h-10"
          onClick={() => setIsShareOpen(true)}
        >
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">S</span>
        </Button>
      </div>

      <SharePanel
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}