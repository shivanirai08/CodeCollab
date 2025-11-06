"use client";

import Image from "next/image";
import { MoreVertical, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import DeleteModal from "./DeleteModal";
import { deleteProject } from "@/store/FetchProjectsSlice";

export default function ProjectCard({
  id,
  title,
  thumbnail,
  lastEditedText,
  participants = [],
  role = "collaborator",
})
{
  const router = useRouter();
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDelete = async () => {
    try {
      const result = await dispatch(deleteProject(id)).unwrap();
      toast.success(result.message || "Operation successful");
      setDeleteModalOpen(false);
      setMenuOpen(false);
    } catch (error) {
      toast.error(error || "Failed to delete project");
    }
  };

  return (
    <>
      <div
        className="group relative flex flex-col rounded-xl border bg-[#202026]
    border-t-[#36363E] border-b-[#121212] border-r-[#121212] border-l-[#36363E]
    hover:border-b-[#36363E] hover:border-r-[#36363E] hover:border-t-[#36363E] hover:border-l-[#36363E]
    transition-colors shadow-md shadow-[rgba(2,2,9,0.25)]
    px-3 md:px-4 py-3 md:py-4 w-full cursor-pointer"
        onClick={() => {
          router.push(`/project/${id}`);
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt="Project thumbnail"
              className="h-full w-full object-cover"
              width={600}
              height={400}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#101426] text-gray-400">
              <Image
                src="/thumbnail.svg"
                alt="No thumbnail"
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            </div>
          )}

          {/* Action button with dropdown */}
          <div className="absolute right-2 top-2">
            <button
              className="rounded-full bg-black/60 p-1.5 text-white opacity-80 hover:bg-black/80 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
            >
              <MoreVertical className="size-4" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-10 z-50 w-40 rounded-lg bg-[#212126] border border-gray-800 shadow-lg overflow-hidden">
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-[#2F2F35] transition-colors flex items-center gap-2 text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalOpen(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="size-4" />
                    {role === "owner" ? "Delete" : "Leave"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex justify-between pt-4 pb-2">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-white truncate">{title}</h3>
            {lastEditedText && (
              <p className="mt-1 text-sm text-gray-400">{lastEditedText}</p>
            )}
          </div>

          {/* Participants */}
          <div className="flex items-center justify-end">
            <div className="flex -space-x-4">
              {participants?.slice(0, 2).map((p) => (
                <div
                  key={p.id}
                  className="flex size-9 items-center justify-center rounded-full border border-[#3A3A3F] bg-[#121217] text-sm font-semibold text-white"
                >
                  {p.initials}
                </div>
              ))}
              {participants?.length > 2 && (
                <div className="flex size-9 items-center justify-center rounded-full border border-[#3A3A3F] bg-[#121217] text-sm text-gray-300">
                  +{participants.length - 2}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={role === "owner" ? "Delete Project" : "Leave Project"}
        message={
          role === "owner"
            ? `Are you sure you want to delete "${title}"? This action cannot be undone and all project data will be permanently lost.`
            : `Are you sure you want to leave "${title}"? You will lose access to this project unless invited again.`
        }
      />
    </>
  );
}
