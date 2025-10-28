"use client"

import { useState, useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useParams } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  HiOutlineFolder,
  HiOutlineDocumentText,
  HiChevronLeft,
} from "react-icons/hi"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { fetchNodes, createNode, setActiveFile, deleteNode } from "@/store/NodesSlice"
import DeleteModal from "@/components/ui/DeleteModal"
import FileItem from "./FileItem"
import FolderItem from "./FolderItem"
import InlineInput from "./InlineInput"
import ContextMenu from "./ContextMenu"
import { toast } from "sonner" // Add this

export default function FileSidebar({ className }) {
  const dispatch = useDispatch()
  const params = useParams()
  const projectId = params.id

  const nodes = useSelector((state) => state.nodes.nodes)
  const activeFileId = useSelector((state) => state.nodes.activeFileId)

  const [collapsed, setCollapsed] = useState(false)
  const [openFolders, setOpenFolders] = useState(new Set())
  const [creatingNode, setCreatingNode] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, nodeId: null, nodeName: null })

  useEffect(() => {
    if (projectId) {
      dispatch(fetchNodes(projectId))
    }
  }, [dispatch, projectId])

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const toggleFolder = (nodeId) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const handleAddFile = (parentId = null) => {
    setCreatingNode({ type: "file", parentId })
    if (parentId) {
      setOpenFolders((prev) => new Set(prev).add(parentId))
    }
  }

  const handleAddFolder = (parentId = null) => {
    setCreatingNode({ type: "folder", parentId })
    if (parentId) {
      setOpenFolders((prev) => new Set(prev).add(parentId))
    }
  }

  const handleCreateNode = async (name) => {
    if (!name || !creatingNode) return

    const language =
      creatingNode.type === "file"
        ? name.endsWith(".js") || name.endsWith(".jsx")
          ? "javascript"
          : name.endsWith(".ts") || name.endsWith(".tsx")
          ? "typescript"
          : name.endsWith(".css")
          ? "css"
          : name.endsWith(".html")
          ? "html"
          : name.endsWith(".json")
          ? "json"
          : name.endsWith(".py")
          ? "python"
          : "plaintext"
        : null

    try {
      await dispatch(
        createNode({
          projectId,
          name,
          type: creatingNode.type,
          parent_id: creatingNode.parentId,
          content: "",
          language,
        })
      ).unwrap()
      
      toast.success(`${creatingNode.type === "file" ? "File" : "Folder"} "${name}" created successfully`)
      setCreatingNode(null)
    } catch (error) {
      toast.error(`Failed to create ${creatingNode.type}: ${error}`)
    }
  }

  const handleCancelCreate = () => {
    setCreatingNode(null)
  }

  const handleContextMenu = (e, nodeId) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ nodeId, x: e.clientX, y: e.clientY })
  }

  const handleDeleteClick = (nodeId) => {
    const node = nodes.find((n) => n.id === nodeId)
    setDeleteModal({ isOpen: true, nodeId, nodeName: node?.name || "item" })
    setContextMenu(null)
  }

  const handleConfirmDelete = async () => {
    if (deleteModal.nodeId) {
      try {
        await dispatch(deleteNode(deleteModal.nodeId)).unwrap()
        toast.success(`"${deleteModal.nodeName}" deleted successfully`)
      } catch (error) {
        toast.error(`Failed to delete: ${error}`)
      }
    }
    setDeleteModal({ isOpen: false, nodeId: null, nodeName: null })
  }

  const buildTree = (parentId = null) => {
    return nodes
      .filter((node) => node.parent_id === parentId)
      .sort((a, b) => {
        // Folders first, then files
        if (a.type === "folder" && b.type === "file") return -1
        if (a.type === "file" && b.type === "folder") return 1
        return a.name.localeCompare(b.name)
      })
      .map((node) => ({
        ...node,
        children: node.type === "folder" ? buildTree(node.id) : [],
      }))
  }

  const tree = buildTree()

  return (
    <>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-r-[#36363E] bg-[#141419] transition-all duration-300 relative",
          collapsed ? "w-16" : "w-64",
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
          <div className="mb-4 flex items-center justify-between border-b border-[#36363E] pb-2">
            <div className="text-xs uppercase tracking-wide text-[#8D8D98] px-2">Files</div>
            {!collapsed && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#C9C9D6] hover:bg-[#1A1A20]"
                  onClick={() => handleAddFile(null)}
                  title="New File"
                >
                  <HiOutlineDocumentText size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-[#C9C9D6] hover:bg-[#1A1A20]"
                  onClick={() => handleAddFolder(null)}
                  title="New Folder"
                >
                  <HiOutlineFolder size={16} />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1">
            {/* Root level inline input */}
            {creatingNode && creatingNode.parentId === null && (
              <InlineInput
                type={creatingNode.type}
                onSubmit={handleCreateNode}
                onCancel={handleCancelCreate}
              />
            )}

            {tree.map((item) =>
              item.type === "folder" ? (
                <FolderItem
                  key={item.id}
                  folder={item}
                  collapsed={collapsed}
                  open={openFolders.has(item.id)}
                  onToggle={toggleFolder}
                  onFileClick={(fileId) => dispatch(setActiveFile(fileId))}
                  activeFileId={activeFileId}
                  onContextMenu={handleContextMenu}
                  onAddFile={handleAddFile}
                  onAddFolder={handleAddFolder}
                  creatingNode={creatingNode}
                  onCreateNode={handleCreateNode}
                  onCancelCreate={handleCancelCreate}
                  openFolders={openFolders}
                />
              ) : (
                <FileItem
                  key={item.id}
                  file={item}
                  collapsed={collapsed}
                  active={item.id === activeFileId}
                  onClick={() => dispatch(setActiveFile(item.id))}
                  onContextMenu={handleContextMenu}
                />
              )
            )}

            {tree.length === 0 && !creatingNode && (
              <div className="text-center text-[#8D8D98] text-xs py-8">
                No files yet. Create one to get started.
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <div className="mt-auto flex justify-center p-3">
          <Button
            variant="ghost"
            className="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm transition-all hover:bg-[#29292E]"
            onClick={() => setCollapsed(!collapsed)}
          >
            <HiChevronLeft
              className={cn("size-5 transition-transform", collapsed ? "rotate-180" : "rotate-0")}
            />
            {!collapsed && <span>Collapse</span>}
          </Button>
        </div>

        <ContextMenu contextMenu={contextMenu} onDelete={handleDeleteClick} />
      </aside>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, nodeId: null, nodeName: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteModal.nodeName}"? This action cannot be undone.`}
      />
    </>
  )
}
