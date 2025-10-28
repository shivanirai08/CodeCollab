"use client"

import { HiTrash } from "react-icons/hi"

export default function ContextMenu({ contextMenu, onDelete }) {
  if (!contextMenu) return null

  return (
    <div
      className="fixed bg-[#1A1A20] border border-[#36363E] rounded shadow-lg py-1 z-50 min-w-[140px]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-3 py-2 text-left text-sm hover:bg-[#29292E] flex items-center gap-2 text-red-400 transition-colors"
        onClick={() => onDelete(contextMenu.nodeId)}
      >
        <HiTrash size={16} />
        Delete
      </button>
    </div>
  )
}