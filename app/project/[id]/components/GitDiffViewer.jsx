"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function getDiffLineClass(line, isConflictDiff) {
  if (isConflictDiff) {
    if (line.startsWith("<<<<<<<")) return "bg-[#1e3a5f]/40 text-[#93c5fd]";
    if (line.startsWith("=======")) return "bg-[#374151]/60 text-[#d1d5db]";
    if (line.startsWith(">>>>>>>")) return "bg-[#14532d]/40 text-[#86efac]";
    return "text-[#E6E6EC]";
  }

  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) {
    return "text-[#8B909A]";
  }
  if (line.startsWith("@@")) return "text-[#60a5fa]";
  if (line.startsWith("+")) return "bg-[#14532d]/30 text-[#86efac]";
  if (line.startsWith("-")) return "bg-[#7f1d1d]/30 text-[#fca5a5]";
  return "text-[#C9C9D6]";
}

export default function GitDiffViewer({
  filePath,
  diffText,
  isLoading,
  isConflictDiff,
  onOpenInEditor,
}) {
  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[#6B7280]">
        Select a changed file to preview its diff.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#8B909A]">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading diff...
      </div>
    );
  }

  const lines = String(diffText || "").split("\n");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[#24242A] px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-white">{filePath}</p>
          <p className="text-[10px] text-[#8B909A]">
            {isConflictDiff ? "Conflict markers from worktree" : "Diff vs HEAD"}
          </p>
        </div>
        {onOpenInEditor ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 shrink-0 px-2 text-[11px] text-[#C9C9D6] hover:bg-[#1A1A20] hover:text-white"
            onClick={() => onOpenInEditor(filePath)}
          >
            Open in editor
          </Button>
        ) : null}
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[11px] leading-5">
        {lines.map((line, index) => (
          <div key={`${filePath}-${index}`} className={`whitespace-pre-wrap px-1 ${getDiffLineClass(line, isConflictDiff)}`}>
            {line || " "}
          </div>
        ))}
      </pre>
    </div>
  );
}
