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
      <></>
    );
  }

  return (
    <div className="flex items-center bg-white/2 overflow-x-auto rounded-t-sm">
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
        "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r group rounded-t-sm",
        active
          ? "text-white bg-white/7 border-[#36363E]"
          : "text-[#C9C9D6] hover:bg-white/4 border-[#242325]"
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
