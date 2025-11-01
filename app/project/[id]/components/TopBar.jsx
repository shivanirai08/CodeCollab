"use client"

import { Button } from "@/components/ui/button";
import { FiMessageSquare } from "react-icons/fi";
import { useState } from "react";
import SharePanel from "./SharePanel";
import { useSelector } from "react-redux";
import OnlineAvatars from "./OnlineAvatars";


export default function TopBar({ onToggleChat, isChatOpen }) {
  const project = useSelector((state) => state.project);
  const onlineUsers = useSelector((state) => state.project.onlineUsers);
  const [isShareOpen, setIsShareOpen] = useState(false);

  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-2">
      {/* Left: Project Name */}
      <div className="text-xl font-semibold text-[var(--foreground)]">
        {project.projectname}
      </div>

      {/* Right Side: Avatars, Chat Icon, Share Button */}
      <div className="flex items-center gap-3">
        {/* Online Users Avatars */}
        <OnlineAvatars onlineUsers={onlineUsers} />

        {/* Chat Button */}
        <Button
          onClick={onToggleChat}
          className={`rounded-full border border-[var(--border)] bg-transparent text-white hover:bg-[var(--accent)] w-10 h-10 ${
            isChatOpen ? "bg-[var(--secondary)]" : ""
          }`}
        >
          <FiMessageSquare className="h-5 w-5" />
        </Button>

        {/* Share Button */}
        <Button className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-6" onClick={() => setIsShareOpen(true)}>
          Share
        </Button>
      </div>

      <SharePanel
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </div>
  );
}