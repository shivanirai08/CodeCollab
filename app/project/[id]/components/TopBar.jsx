"use client"

import { Button } from "@/components/ui/button";
import { FiMessageSquare } from "react-icons/fi";


export default function TopBar({ onToggleChat, isChatOpen }) {
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
          className={`rounded-full border border-[var(--border)] bg-transparent text-white hover:bg-[var(--accent)] w-10 h-10 ${
            isChatOpen ? "bg-[var(--secondary)]" : ""
          }`}
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