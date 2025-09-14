"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import {
  HiOutlineFolder,
  HiFolder,
  HiOutlineDocumentText,
  HiOutlinePhotograph,
  HiOutlineCode,
  HiChevronDown,
  HiOutlinePlus,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function FileSidebar({ className }) {
  const [collapsed, setCollapsed] = useState(false)

  const [files, setFiles] = useState([
    {
      type: "folder",
      name: "src",
      open: true,
      children: [
        { type: "file", name: "index.html" },
        { type: "file", name: "style.css" },
        { type: "file", name: "script.js" },
      ],
    },
    {
      type: "folder",
      name: "assets",
      open: false,
      children: [
        { type: "file", name: "logo.png" },
        { type: "file", name: "banner.svg" },
      ],
    },
  ])

  const toggleFolder = (folderName) => {
    setFiles((prev) =>
      prev.map((item) =>
        item.name === folderName ? { ...item, open: !item.open } : item
      )
    )
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-r-[#36363E] bg-[#141419] transition-all duration-300",
        collapsed ? "w-16" : "w-48",
        className
      )}
    >
      {/* Logo */}
            <div className="flex items-center gap-3 px-4 pt-8 pb-6">
              <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-6 w-6" />
              {!collapsed && <div className="text-lg font-semibold">CodeCollab</div>}
            </div>

      {/* Files */}
      <div className="flex-1 overflow-y-auto p-2 text-sm text-[#C9C9D6]">
        <div className="mb-4 flex items-end justify-between border-b border-[#36363E]">
            {/* Heading */}
            <div className="mb-2 text-xs uppercase tracking-wide text-[#8D8D98] px-2">
          Files
        </div>
        
      {/* Add file/folder */}
      {!collapsed && (
        <div className="flex">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#C9C9D6] hover:bg-[#1A1A20] -gap-2"
          >
            <HiOutlineDocumentText size={14} />+
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-[#C9C9D6] hover:bg-[#1A1A20] -gap-2"
          >
            <HiOutlineFolder size={14} />+
          </Button>
        </div>
      )}
        </div>


        {files.map((item) =>
          item.type === "folder" ? (
            <div key={item.name} className="mb-2">
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-[#1A1A20]"
                onClick={() => toggleFolder(item.name)}
              >
                {item.open ? (
                  <HiFolder size={18} />
                ) : (
                  <HiOutlineFolder size={18} />
                )}
                {!collapsed && <span>{item.name}</span>}
                {!collapsed && (<span className="ml-auto">
                  {item.open ? <HiChevronDown size={14} /> : <HiChevronRight size={14} />}
                </span>)}
              </button>

              {item.open && !collapsed && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <FileItem key={child.name} file={child} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <FileItem key={item.name} file={item} collapsed={collapsed} />
          )
        )}
      </div>

      {/* Collapse toggle */}
      <div className="mt-auto flex justify-center p-3">
        <Button
          variant="ghost"
          className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm transition-all hover:bg-[#29292E]"
          onClick={() => setCollapsed(!collapsed)}
        >
          <HiChevronLeft
            className={cn(
              "size-5 transition-transform",
              collapsed ? "rotate-180" : "rotate-0"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  )
}

function FileItem({ file, collapsed }) {
  let icon
  if (file.name.endsWith(".html")) icon = <HiOutlineDocumentText size={18} />
  else if (file.name.endsWith(".css")) icon = <HiOutlinePhotograph size={18} />
  else if (file.name.endsWith(".js")) icon = <HiOutlineCode size={18} />
  else icon = <HiOutlineDocumentText size={18} />

  return (
    <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[#1A1A20] cursor-pointer">
      {icon}
      {!collapsed && <span>{file.name}</span>}
    </div>
  )
}
