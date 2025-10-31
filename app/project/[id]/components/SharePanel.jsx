"use client";

import { useState } from "react";
import { X, Copy, Check, Globe, Lock, ChevronDown, Link2, Menu, EllipsisVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { updateProjectVisibility } from "@/store/ProjectSlice";
import { useParams } from "next/navigation";

export default function SharePanel({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const params = useParams();
  const projectId = params.id;

  const project_code = useSelector((state) => state.project.join_code);
  const owner = useSelector((state) => state.project.owner);
  const collaborators = useSelector((state) => state.project.collaborators);
  const visibility = useSelector((state) => state.project.visibility);
  const permissions = useSelector((state) => state.project.permissions);
  const projectname = useSelector((state) => state.project.projectname);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVisibilityMenu, setShowVisibilityMenu] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/project/${projectId}`
      : "";

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(project_code || "");
      setCopiedCode(true);
      toast.success("Project code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Project link copied!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleChangeVisibility = async (newVisibility) => {
    if (!permissions.isOwner) {
      toast.error("Only the project owner can change visibility");
      return;
    }

    setIsUpdating(true);
    setShowVisibilityMenu(false);

    try {
      await dispatch(
        updateProjectVisibility({ projectid: projectId, visibility: newVisibility })
      ).unwrap();
      toast.success(`Project is now ${newVisibility}`);
    } catch (error) {
      toast.error(error || "Failed to update visibility");
    } finally {
      setIsUpdating(false);
    }
  };

  // owner + collaborators
  const allMembers = [];
  
  if (owner) {
    allMembers.push({
      user_id: owner.user_id,
      username: owner.username,
      email: owner.email,
      role: "owner",
      avatar: owner.username?.[0]?.toUpperCase() || "O",
    });
  }

  if (collaborators?.length) {
    collaborators.forEach((collab) => {
      allMembers.push({
        user_id: collab.user_id,
        username: collab.username,
        email: collab.email,
        role: "can edit",
        avatar: collab.username?.[0]?.toUpperCase() || "C",
      });
    });
  }

  const getAvatarColor = (username) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-orange-500",
      "bg-pink-500",
      "bg-teal-500",
      "bg-yellow-500",
      "bg-red-500",
    ];
    const index = username?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={cn(
          "relative w-full max-w-lg bg-[#1A1A20] text-white rounded-xl shadow-xl border border-[#2B2B30]",
          "animate-in fade-in zoom-in duration-200 max-h-[85vh] overflow-hidden flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold">Share "{projectname}"</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="text-gray-400 hover:text-white hover:bg-[#2B2B30] h-8 px-3"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4 mr-1.5" />
                  Copy link
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-[#2B2B30] rounded-lg"
            >
              <X className="h-5 w-5 text-gray-400 hover:text-white" />
            </Button>
          </div>
        </div>

        {/* Project Code */}
        <div className="px-6 pt-2">
          <div className="bg-[#23232A] border border-[#303036] rounded-lg px-3 py-1 flex items-center justify-between">
            <div className="flex gap-4 items-center">
              <div className="text-xs text-gray-400 mb-1">Project Code</div>
              <div className="font-mono text-base font-semibold">
                {project_code || "No code"}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className={cn(
                "text-gray-300 hover:text-white hover:bg-[#303036] h-8 px-3",
                copiedCode && "text-green-400"
              )}
            >
              {copiedCode ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          <div className="space-y-2">
            {/* Visibility Row */}
            <div className="flex items-center justify-between py-1 px-3 rounded-lg  group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#2B2B30] flex items-center justify-center">
                  {visibility === "public" ? (
                    <Globe className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-sm">
                    Project Visibility
                  </div>
                </div>
              </div>

              {permissions.isOwner ? (
                <div className="relative">
                  <button
                    onClick={() => setShowVisibilityMenu(!showVisibilityMenu)}
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#2B2B30] text-sm text-gray-300 disabled:opacity-50"
                  >
                    <span>{visibility === "public" ? "Public" : "Private"}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {showVisibilityMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowVisibilityMenu(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-48 bg-[#2B2B30] border border-[#36363E] rounded-lg shadow-xl z-20 py-1">
                        <button
                          onClick={() => handleChangeVisibility("public")}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#36363E] flex items-center gap-3"
                        >
                          <Globe className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Public</div>
                            <div className="text-xs text-gray-400">Anyone can view</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleChangeVisibility("private")}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#36363E] flex items-center gap-3"
                        >
                          <Lock className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Private</div>
                            <div className="text-xs text-gray-400">Only members</div>
                          </div>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-400">
                  {visibility === "public" ? "Public" : "Private"}
                </span>
              )}
            </div>

            {/* All Members */}
            {allMembers.map((member, index) => (
              <div
                key={member.user_id || index}
                className="flex items-center justify-between py-1 px-3 rounded-lg hover:bg-[#23232A] group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm text-white flex-shrink-0",
                      getAvatarColor(member.username)
                    )}
                  >
                    {member.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {member.username}
                      {(permissions.isOwner && member.user_id === permissions.isOwner) ||
                        (permissions.isCollaborator && member.user_id === permissions.isCollaborator)
                        ? " (you)"
                        : ""}
                    </div>
                    {member.email && (
                      <div className="text-xs text-gray-400 truncate">
                        {member.email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {member.role === "owner" ? (
                    <span className="text-sm text-gray-400 px-3">owner</span>
                  ) : permissions.isOwner ? (
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#2B2B30] text-sm text-gray-300">
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400 px-3">can edit</span>
                  )}
                </div>
              </div>
            ))}

            {allMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">
                No members yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
