"use client";

import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import { RxCross2 } from "react-icons/rx";
import { setActiveFile, closeFile } from "@/store/NodesSlice";

export default function EditorTabs() {
  const dispatch = useDispatch();
  const nodes = useSelector((state) => state.nodes.nodes);
  const openFiles = useSelector((state) => state.nodes.openFiles);
  const activeFileId = useSelector((state) => state.nodes.activeFileId);

  const openFileNodes = openFiles
    .map((id) => nodes.find((n) => n.id === id))
    .filter(Boolean);

  const handleCloseFile = (e, fileId) => {
    e.stopPropagation();
    dispatch(closeFile(fileId));
  };

  if (openFileNodes.length === 0) {
    return (
      <div className="flex items-center border-b border-[#36363E] bg-[#0F0F14] px-4 py-2 text-sm text-[#8D8D98]">
        No files open
      </div>
    );
  }

  return (
    <div className="flex items-center border-b border-[#36363E] bg-[#0F0F14] overflow-x-auto">
      {openFileNodes.map((file) => (
        <Tab
          key={file.id}
          file={file}
          active={file.id === activeFileId}
          onClick={() => dispatch(setActiveFile(file.id))}
          onClose={(e) => handleCloseFile(e, file.id)}
        />
      ))}
    </div>
  );
}

function Tab({ file, active, onClick, onClose }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-[#36363E] group",
        active
          ? "text-white bg-[#1A1A20]"
          : "text-[#C9C9D6] hover:bg-[#141419]"
      )}
    >
      <span>{file.name}</span>
      <button
        onClick={onClose}
        className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
      >
        <RxCross2 size={14} />
      </button>
    </div>
  );
}
