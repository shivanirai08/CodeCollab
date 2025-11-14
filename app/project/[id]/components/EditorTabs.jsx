"use client";

import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import { RxCross2 } from "react-icons/rx";
import { setActiveFile, closeFile } from "@/store/NodesSlice";

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

  console.log("EditorTabs - fileProblems from Redux:", fileProblems);

  return (
    <div className="flex items-center bg-white/2 overflow-x-auto rounded-t-sm">
      {openFileNodes.map((file) => {
        const problems = fileProblems[file.id] || [];
        const errorCount = problems.filter(p => p.severity === "error").length;
        const warningCount = problems.filter(p => p.severity === "warning").length;

        console.log(`File ${file.name} - errors: ${errorCount}, warnings: ${warningCount}`);

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

  console.log(`Tab ${file.name} - hasProblems: ${hasProblems}, errorCount: ${errorCount}, warningCount: ${warningCount}`);

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
            className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 transition-all"
            title={`${errorCount} error(s), ${warningCount} warning(s)`}
          >
            {hasErrors && (
              <span className="text-red-400 font-bold">{errorCount}</span>
            )}
            {hasWarnings && (
              <span className="text-yellow-400 font-bold">{warningCount}</span>
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
    </div>
  );
}
