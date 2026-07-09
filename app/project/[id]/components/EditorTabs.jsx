"use client";

import { useSelector, useDispatch } from "react-redux";
import { cn } from "@/lib/utils";
import { RxCross2 } from "react-icons/rx";
import {
  setActiveEditorTab,
  closeEditorTab,
  closeFile,
  requestEditorSaveFlush,
} from "@/store/NodesSlice";
import { isGitDiffTabId } from "@/lib/editorTabs";
import { AlertCircle, AlertTriangle } from "lucide-react";

export default function EditorTabs({ onOpenProblems }) {
  const dispatch = useDispatch();
  const nodes = useSelector((state) => state.nodes.nodes);
  const editorTabOrder = useSelector((state) => state.nodes.editorTabOrder);
  const activeEditorTabId = useSelector((state) => state.nodes.activeEditorTabId);
  const gitDiffTabsById = useSelector((state) => state.nodes.gitDiffTabsById);
  const fileProblems = useSelector((state) => state.nodes.fileProblems);

  if (editorTabOrder.length === 0) {
    return <></>;
  }

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    dispatch(requestEditorSaveFlush());
    if (isGitDiffTabId(tabId)) {
      dispatch(closeEditorTab(tabId));
      return;
    }
    dispatch(closeFile(tabId));
  };

  return (
    <div className="flex items-center bg-white/2 overflow-x-auto rounded-t-sm">
      {editorTabOrder.map((tabId) => {
        const isDiffTab = isGitDiffTabId(tabId);
        const diffTab = isDiffTab ? gitDiffTabsById[tabId] : null;
        const nodeId = isDiffTab ? diffTab?.nodeId : tabId;
        const file = nodes.find((n) => n.id === nodeId);

        if (!file) return null;

        const problems = fileProblems[nodeId] || [];
        const errorCount = problems.filter((p) => p.severity === "error").length;
        const warningCount = problems.filter((p) => p.severity === "warning").length;

        return (
          <Tab
            key={tabId}
            label={isDiffTab ? `${file.name} (Diff)` : file.name}
            active={tabId === activeEditorTabId}
            isDiffTab={isDiffTab}
            errorCount={isDiffTab ? 0 : errorCount}
            warningCount={isDiffTab ? 0 : warningCount}
            onClick={() => dispatch(setActiveEditorTab(tabId))}
            onClose={(e) => handleCloseTab(e, tabId)}
            onErrorClick={onOpenProblems}
          />
        );
      })}
    </div>
  );
}

function Tab({
  label,
  active,
  isDiffTab,
  errorCount,
  warningCount,
  onClick,
  onClose,
  onErrorClick,
}) {
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
        {label}
        {isDiffTab ? (
          <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#93c5fd] bg-[#172554]/80">
            Diff
          </span>
        ) : null}
        {hasProblems && (
          <button
            onClick={handleErrorIndicatorClick}
            className="flex items-center gap-1 px-2 py-1 rounded-md font-semibold transition-all"
            style={{
              backgroundColor: hasErrors
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(202, 138, 4, 0.15)",
              color: hasErrors ? "#FCA5A5" : "#FCD34D",
            }}
            title={`${errorCount} error${errorCount !== 1 ? "s" : ""}, ${warningCount} warning${warningCount !== 1 ? "s" : ""}`}
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
