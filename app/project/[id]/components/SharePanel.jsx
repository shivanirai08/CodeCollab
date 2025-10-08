"use client";

import { useState } from "react";
import { X, Copy, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SharePanel({ isOpen, onClose, project }) {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(project?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full max-w-lg bg-[#1A1A20] text-white rounded-xl shadow-xl border border-[#2B2B30] p-6",
          "animate-in fade-in zoom-in duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share Project</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-5 w-5 text-gray-400 hover:text-white" />
          </Button>
        </div>

        {/* Project Code Section */}
        <div className="bg-[#23232A] border border-[#303036] rounded-lg py-2 px-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400 mb-1">Project Code</div>
          <span className="font-mono text-lg">{project?.code}</span>
          </div>
          <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-gray-300 hover:text-white"
            >
              <Copy className="h-4 w-4 mr-1" />
              {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Owner Info */}
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-1">Owner</div>
          <div className="flex items-center gap-3 bg-[#23232A] border border-[#303036] rounded-lg p-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
              {project?.owner?.initials}
            </div>
            <div>
              <div className="font-semibold">{project?.owner?.name}</div>
              <div className="text-sm text-gray-400">{project?.owner?.email}</div>
            </div>
          </div>
        </div>

        {/* Collaborators */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Users className="h-4 w-4" /> Collaborators
          </div>
          <div className="flex flex-wrap gap-3">
            {project?.collaborators?.length ? (
              project.collaborators.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 bg-[#23232A] border border-[#303036] rounded-full px-3 py-1"
                >
                  <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold">
                    {user.initials}
                  </div>
                  <span className="text-sm">{user.name}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No collaborators yet</div>
            )}
          </div>
        </div>

        {/* Viewers */}
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <User className="h-4 w-4" /> Viewers
          </div>
          <div className="flex flex-wrap gap-3">
            {project?.viewers?.length ? (
              project.viewers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 bg-[#23232A] border border-[#303036] rounded-full px-3 py-1"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs font-bold">
                    {user.initials}
                  </div>
                  <span className="text-sm">{user.name}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No viewers yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
