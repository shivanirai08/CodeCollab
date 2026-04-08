"use client"

import { cn } from "@/lib/utils"
import {
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineCode,
} from "react-icons/hi"

const statusLabelMap = {
  untracked: "U",
  conflicted: "C",
}

const statusClassMap = {
  M: "text-amber-400",
  A: "text-emerald-400",
  D: "text-red-400",
  R: "text-sky-400",
  U: "text-violet-400",
  C: "text-red-500",
}

function getStatusLabel(gitStatus) {
  if (!gitStatus) return null
  if (statusLabelMap[gitStatus]) return statusLabelMap[gitStatus]
  return gitStatus.replace(/\s+/g, "").charAt(0) || null
}

export default function FileItem({ file, collapsed, active, onClick, onContextMenu, gitStatus }) {
  const getFileIcon = () => {
    const name = file.name.toLowerCase()
    if (name.endsWith(".c") || name.endsWith(".cpp") || name.endsWith(".java") || name.endsWith(".py")) {
      return <HiOutlineCode size={16} className="text-blue-400" />
    } else if (name.endsWith(".html")) {
      return <HiOutlineDocumentText size={16} className="text-orange-400" />
    } else if (name.endsWith(".css")) {
      return <HiOutlinePhotograph size={16} className="text-blue-400" />
    } else if (name.endsWith(".js") || name.endsWith(".jsx") || name.endsWith(".ts") || name.endsWith(".tsx")) {
      return <HiOutlineCode size={16} className="text-yellow-300" />
    } else if (name.endsWith(".json")) {
      return <HiOutlineCode size={16} className="text-green-400" />
    }
    return <HiOutlineDocumentText size={16} className="text-gray-400" />
  }

  const statusLabel = getStatusLabel(gitStatus)
  const statusClass = statusLabel ? statusClassMap[statusLabel] || "text-[#8D8D98]" : ""

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded px-2 py-1 hover:bg-[#1A1A20] cursor-pointer transition-colors",
        active && "bg-[#1A1A20] text-white"
      )}
      onClick={onClick}
      onContextMenu={(e) => onContextMenu(e, file.id)}
    >
      {getFileIcon()}
      {!collapsed && <span className="truncate flex-1">{file.name}</span>}
      {!collapsed && statusLabel && (
        <span className={cn("text-[10px] font-semibold uppercase", statusClass)}>
          {statusLabel}
        </span>
      )}
    </div>
  )
}
