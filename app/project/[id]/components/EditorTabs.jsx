"use client";

import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import { RxCross2 } from "react-icons/rx";
import { setActiveFile, closeFile } from "@/store/NodesSlice";
import { AlertCircle, AlertTriangle } from "lucide-react";

export default function EditorTabs({ onOpenProblems }) {
  const dispatch = useDispatch();
  const nodes = useSelector((state) => state.nodes.nodes);
  const openFiles = useSelector((state) => state.nodes.openFiles);
  const activeFileId = useSelector((state) => state.nodes.activeFileId);
  const fileProblems = useSelector((state) => state.nodes.fileProblems);

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
      {openFileNodes.map((file) => {
        const problems = fileProblems[file.id] || [];
        const errorCount = problems.filter(p => p.severity === "error").length;
        const warningCount = problems.filter(p => p.severity === "warning").length;

        return (
          <Tab
            key={file.id}
            file={file}
            active={file.id === activeFileId}
            errorCount={errorCount}
            warningCount={warningCount}
            onClick={() => dispatch(setActiveFile(file.id))}
            onClose={(e) => handleCloseFile(e, file.id)}
            onErrorClick={onOpenProblems}
          />
        );
      })}
    </div>
  );
}

function Tab({ file, active, errorCount, warningCount, onClick, onClose, onErrorClick }) {
  const hasErrors = errorCount > 0;
  const hasWarnings = warningCount > 0;
  const hasProblems = hasErrors || hasWarnings;

  const handleErrorIndicatorClick = (e) => {
    e.stopPropagation();
    if (onErrorClick) {
      onErrorClick();
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r group rounded-t-sm relative",
        active
          ? "text-white bg-white/7 border-[#36363E]"
          : "text-[#C9C9D6] hover:bg-white/4 border-[#242325]"
      )}
    >
      <span className="flex items-center gap-2">
        {file.name}
        {hasProblems && (
          <button
            onClick={handleErrorIndicatorClick}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all"
            style={{
              backgroundColor: hasErrors ? "rgba(239, 68, 68, 0.15)" : "rgba(202, 138, 4, 0.15)",
              color: hasErrors ? "#FCA5A5" : "#FCD34D",
            }}
            title={`${errorCount} error${errorCount !== 1 ? 's' : ''}, ${warningCount} warning${warningCount !== 1 ? 's' : ''}`}
          >
            {hasErrors && (
              <div className="flex items-center gap-0.5">
                <AlertCircle className="size-3.5 text-red-400" />
                <span className="text-[11px] font-bold text-red-400">{errorCount}</span>
              </div>
            )}
            {hasWarnings && (
              <div className="flex items-center gap-0.5">
                <AlertTriangle className="size-3.5 text-yellow-400" />
                <span className="text-[11px] font-bold text-yellow-400">{warningCount}</span>
              </div>
            )}
          </button>
        )}
      </span>
      <button
        onClick={onClose}
        className="opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
      >
        <RxCross2 size={14} />
      </button>
      {hasErrors && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-500" />
      )}
      {hasWarnings && !hasErrors && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-500" />
      )}
    </div>
  );
}
