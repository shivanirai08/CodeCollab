"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  HiOutlineFolder,
  HiOutlineDocumentText,
  HiChevronLeft,
} from "react-icons/hi";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { fetchNodes, createNode, setActiveFile, deleteNode, updateNode } from "@/store/NodesSlice";
import DeleteModal from "@/components/ui/DeleteModal";
import FileItem from "./FileItem";
import FolderItem from "./FolderItem";
import InlineInput from "./InlineInput";
import ContextMenu from "./ContextMenu";
import { toast } from "sonner";

export default function FileSidebar({ className, mobileOpen, onClose }) {
  const dispatch = useDispatch();
  const params = useParams();
  const projectId = params.id;

  const nodes = useSelector((state) => state.nodes.nodes);
  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const projectname = useSelector((state) => state.project.projectname);
  const permissions = useSelector((state) => state.project.permissions);

  const [collapsed, setCollapsed] = useState(false);
  const [openFolders, setOpenFolders] = useState(new Set());
  const [creatingNode, setCreatingNode] = useState(null);
  const [renamingNode, setRenamingNode] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    nodeId: null,
    nodeName: null,
  });

  useEffect(() => {
    if (projectId) {
      dispatch(fetchNodes(projectId));
    }
  }, [dispatch, projectId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const toggleFolder = (nodeId) => {
    setOpenFolders((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleAddFile = (parentId = null) => {
    if (!permissions.canEdit) {
      toast.error("You don't have permission to create files");
      return;
    }
    setCreatingNode({ type: "file", parentId });
    setRenamingNode(null);
    if (parentId) {
      setOpenFolders((prev) => new Set(prev).add(parentId));
    }
  };

  const handleAddFolder = (parentId = null) => {
    if (!permissions.canEdit) {
      toast.error("You don't have permission to create folders");
      return;
    }
    setCreatingNode({ type: "folder", parentId });
    setRenamingNode(null);
    if (parentId) {
      setOpenFolders((prev) => new Set(prev).add(parentId));
    }
  };

  const handleCreateNode = async (name) => {
    if (!name || !creatingNode) {
      console.log("Invalid name or creatingNode:", { name, creatingNode });
      return;
    }

    console.log("Creating node:", { name, creatingNode, projectId });

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
        : null;

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
      ).unwrap();

      toast.success(
        `${creatingNode.type === "file" ? "File" : "Folder"} "${name}" created successfully`
      );
      setCreatingNode(null);
    } catch (error) {
      toast.error(`Failed to create ${creatingNode.type}: ${error}`);
    }
  };

  const handleCancelCreate = () => {
    setCreatingNode(null);
  };

  const handleRenameClick = (nodeId) => {
    if (!permissions.canEdit) {
      toast.error("You don't have permission to rename files");
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setRenamingNode({ nodeId, type: node.type, currentName: node.name });
      setCreatingNode(null);
      setContextMenu(null);
    }
  };

  const handleRenameNode = async (newName) => {
    if (!newName || !renamingNode) {
      console.log("Invalid name or renamingNode:", { newName, renamingNode });
      return;
    }

    // If name hasn't changed, just cancel
    if (newName === renamingNode.currentName) {
      setRenamingNode(null);
      return;
    }
    console.log("Renaming node:", { nodeId: renamingNode.nodeId, newName });
    try {
      await dispatch(
        updateNode({
          nodeId: renamingNode.nodeId,
          updates: { name: newName },
        })
      ).unwrap();

      toast.success(
        `${renamingNode.type === "file" ? "File" : "Folder"} renamed to "${newName}"`
      );
      setRenamingNode(null);
    } catch (error) {
      console.error("Failed to rename node:", error);
      toast.error(`Failed to rename: ${error}`);
    }
  };

  const handleCancelRename = () => {
    console.log("Cancelling node rename");
    setRenamingNode(null);
  };

  const handleContextMenu = (e, nodeId) => {
    if (!permissions.canEdit) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ nodeId, x: e.clientX, y: e.clientY });
  };

  const handleDeleteClick = (nodeId) => {
    if (!permissions.canEdit) {
      toast.error("You don't have permission to delete files");
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    setDeleteModal({ isOpen: true, nodeId, nodeName: node?.name || "item" });
    setContextMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteModal.nodeId) {
      try {
        await dispatch(deleteNode(deleteModal.nodeId)).unwrap();
        toast.success(`"${deleteModal.nodeName}" deleted successfully`);
      } catch (error) {
        toast.error(`Failed to delete: ${error}`);
      }
    }
    setDeleteModal({ isOpen: false, nodeId: null, nodeName: null });
  };

  const buildTree = (parentId = null) => {
    return nodes
      .filter((node) => node.parent_id === parentId)
      .sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) => ({
        ...node,
        children: node.type === "folder" ? buildTree(node.id) : [],
      }));
  };

  const tree = buildTree();

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "h-screen flex-col border-r border-r-[#36363E] bg-[#141419] transition-all duration-300",
          // Desktop behavior - always visible
          "lg:flex",
          collapsed ? "lg:w-16 overflow-hidden" : "lg:w-64",
          "lg:relative",
          // Mobile behavior - hidden by default, shows as drawer
          "fixed z-50 top-0 left-0",
          mobileOpen ? "flex w-64" : "hidden",
          className
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 pt-8 pb-6 relative">
          <Image src="/logo.svg" alt="Logo" width={32} height={32} className="h-6 w-6" />
          {!collapsed && <div className="text-lg font-semibold">CodeCollab</div>}
          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              className="lg:hidden absolute top-8 right-4 text-white hover:text-gray-300"
              onClick={onClose}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Files */}
        <div className="flex-1 overflow-y-auto p-2 text-sm text-[#C9C9D6]">
          <div className="mb-4 flex items-center justify-between border-b border-[#36363E] pb-2">
            <div className="text-xs uppercase tracking-wide text-[#8D8D98] px-2 flex items-center gap-2 truncate">
              {projectname ||"Files"}
            </div>
            {!collapsed && permissions.canEdit && (
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
            {creatingNode && creatingNode.parentId === null && permissions.canEdit && (
              <InlineInput
                type={creatingNode.type}
                onSubmit={handleCreateNode}
                onCancel={handleCancelCreate}
              />
            )}

            {tree.map((item) =>
              renamingNode && renamingNode.nodeId === item.id ? (
                <InlineInput
                  key={item.id}
                  type={item.type}
                  onSubmit={handleRenameNode}
                  onCancel={handleCancelRename}
                  initialValue={renamingNode.currentName}
                />
              ) : item.type === "folder" ? (
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
                  renamingNode={renamingNode}
                  onRenameNode={handleRenameNode}
                  onCancelRename={handleCancelRename}
                  openFolders={openFolders}
                  canEdit={permissions.canEdit}
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
                {permissions.canEdit
                  ? "No files yet. Create one to get started."
                  : "No files in this project yet."}
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle - Desktop Only */}
        <div className="mt-auto hidden lg:flex justify-center p-3">
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

        {permissions.canEdit && (
          <ContextMenu
            contextMenu={contextMenu}
            onDelete={handleDeleteClick}
            onRename={handleRenameClick}
          />
        )}
      </aside>

      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, nodeId: null, nodeName: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteModal.nodeName}"? This action cannot be undone.`}
      />
    </>
  );
}
