"use client"

import { Button } from "@/components/ui/button";
import { FiMessageSquare } from "react-icons/fi";
import { useState } from "react";
import SharePanel from "./SharePanel";
import { useSelector } from "react-redux";


export default function TopBar({ onToggleChat, isChatOpen }) {
  const project = useSelector((state) => state.project);
  const[isShareOpen, setIsShareOpen] = useState(false);

  const dummyProject = {
    code: "a1b2c3d4",
    owner: { name: "Shivani Rai", email: "shivani@devmail.com", initials: "SR" },
    collaborators: [
      { id: 1, name: "Karan Mehta", initials: "KM" },
      { id: 2, name: "Priya S.", initials: "PS" },
    ],
    viewers: [{ id: 3, name: "Rohan", initials: "R" }],
  };

  return (
    <div className="flex items-center justify-between px-4 pt-6 pb-2">
      {/* Left: Project Name */}
      <div className="text-xl font-semibold text-[var(--foreground)]">
        {project.projectname}
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
        <Button className="bg-gradient-to-b from-[#FFF] to-[#6B696D] px-6" onClick={() => setIsShareOpen(true)}>
          Share
        </Button>
      </div>

      <SharePanel
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        project={dummyProject}
      />
    </div>
  );
}