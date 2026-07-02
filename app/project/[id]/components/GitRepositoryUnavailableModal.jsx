"use client";

import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, X } from "lucide-react";

export default function GitRepositoryUnavailableModal({
  isOpen,
  issue,
  isRetrying = false,
  onClose,
  onRetry,
  onOpenGitPanel,
}) {
  if (!isOpen || !issue) {
    return null;
  }

  const title = issue.title || "Git sync unavailable";
  const description =
    issue.hint ||
    "The repository files aren't on this server. Re-import from GitHub in the Git panel to restore sync—you can keep editing in the meantime.";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-[#2B2B30] bg-[#1A1A20] p-5 text-white shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold leading-snug text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-gray-400">{description}</p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenGitPanel}
            className="h-9 bg-[#E5E7EB] px-4 text-black hover:bg-white"
          >
            Open Git panel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-9 border-[#36363E] bg-transparent px-4 text-gray-300 hover:bg-[#2B2B30] hover:text-white"
          >
            {isRetrying ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-3.5" />
            )}
            Try again
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-sm text-gray-500 transition-colors hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
