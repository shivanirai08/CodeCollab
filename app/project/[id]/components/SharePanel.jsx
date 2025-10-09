"use client";

import { useState } from "react";
import { X, Copy, Users, EllipsisVertical} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelector } from "react-redux";

export default function SharePanel({ isOpen, onClose }) {
  const project_code = useSelector((state) => state.project.join_code);
  const owner = useSelector((state) => state.project.owner);
  const collaborators = useSelector((state) => state.project.collaborators);

  const [copied, setCopied] = useState(false);
  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(project_code || "");
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

        {/* Project Code */}
        <div className="bg-[#23232A] border border-[#303036] rounded-lg py-2 px-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 mb-1">Project Code</div>
            <span className="font-mono text-lg">{project_code}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-gray-300 hover:text-white"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Owner */}
        <div className="mb-6">
          <div className="text-sm text-gray-400 mb-1">Owner</div>
          <div className="flex items-center gap-3 bg-[#23232A] border border-[#303036] rounded-lg p-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold">
              {owner?.username?.[0]?.toUpperCase() || "O"}
            </div>
            <div>
              <div className="font-semibold">{owner?.username}</div>
              <div className="text-sm text-gray-400">{owner?.email}</div>
            </div>
          </div>
        </div>

        {/* Collaborators */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Users className="h-4 w-4" /> Collaborators
          </div>
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {collaborators?.length ? (
              collaborators.map((user) => (
                <div
                  key={user.user_id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 group hover:bg-[#23232A]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-xs">
                      {user?.username?.[0]?.toUpperCase() || "C"}
                    </div>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-gray-400">{user.email}</span>
                    </div>
                  </div>
                  <EllipsisVertical className="h-4 w-4 group-hover:block hidden group-hover:cursor-pointer" />
                  {/* <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemove(user.user_id)}
                  >
                    Remove
                  </Button> */}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No collaborators yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
