"use client"

import {
  HiOutlineFolder,
  HiFolder,
  HiOutlineDocumentText,
  HiChevronDown,
  HiChevronRight,
} from "react-icons/hi"
import FileItem from "./FileItem"
import InlineInput from "./InlineInput"

export default function FolderItem({
  folder,
  collapsed,
  open,
  onToggle,
  onFileClick,
  activeFileId,
  onContextMenu,
  onAddFile,
  onAddFolder,
  creatingNode,
  onCreateNode,
  onCancelCreate,
  openFolders,
}) {
  const handleToggle = (e) => {
    e.stopPropagation()
    onToggle(folder.id)
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[#1A1A20] cursor-pointer group transition-colors"
        onClick={handleToggle}
        onContextMenu={(e) => onContextMenu(e, folder.id)}
      >
        {open ? (
          <HiFolder size={16} className="text-yellow-500 flex-shrink-0" />
        ) : (
          <HiOutlineFolder size={16} className="flex-shrink-0" />
        )}
        {!collapsed && <span className="flex-1 truncate">{folder.name}</span>}
        {!collapsed && (
          <>
            <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
              <button
                className="p-0.5 hover:bg-[#29292E] rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddFile(folder.id)
                }}
                title="New File"
              >
                <HiOutlineDocumentText size={14} />
              </button>
              <button
                className="p-0.5 hover:bg-[#29292E] rounded transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onAddFolder(folder.id)
                }}
                title="New Folder"
              >
                <HiOutlineFolder size={14} />
              </button>
            </div>
            <span className="text-[#8D8D98] flex-shrink-0">
              {open ? <HiChevronDown size={14} /> : <HiChevronRight size={14} />}
            </span>
          </>
        )}
      </div>

      {open && !collapsed && (
        <div className="ml-4 mt-1 space-y-1 border-l border-[#36363E] pl-2">
          {/* Inline input for new node in this folder */}
          {creatingNode && creatingNode.parentId === folder.id && (
            <InlineInput
              type={creatingNode.type}
              onSubmit={onCreateNode}
              onCancel={onCancelCreate}
            />
          )}

          {folder.children.map((child) =>
            child.type === "folder" ? (
              <FolderItem
                key={child.id}
                folder={child}
                collapsed={collapsed}
                open={openFolders.has(child.id)}
                onToggle={onToggle}
                onFileClick={onFileClick}
                activeFileId={activeFileId}
                onContextMenu={onContextMenu}
                onAddFile={onAddFile}
                onAddFolder={onAddFolder}
                creatingNode={creatingNode}
                onCreateNode={onCreateNode}
                onCancelCreate={onCancelCreate}
                openFolders={openFolders}
              />
            ) : (
              <FileItem
                key={child.id}
                file={child}
                collapsed={collapsed}
                active={child.id === activeFileId}
                onClick={() => onFileClick(child.id)}
                onContextMenu={onContextMenu}
              />
            )
          )}
        </div>
      )}
    </div>
  )
}