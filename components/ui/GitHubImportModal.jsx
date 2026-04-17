"use client";

import { ExternalLink, Github, Import, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GitHubImportModal({
  isOpen,
  onClose,
  repositories,
  selectedRepoId,
  onSelectRepo,
  onImport,
  onOpenRepository,
  isImporting = false,
  isLoading = false,
  isConnected = false,
}) {
  if (!isOpen) return null;

  const selectedRepo = repositories.find((repo) => repo.id === selectedRepoId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={isImporting ? undefined : onClose}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-[#2B2B30] bg-[#1A1A20] text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#2B2B30] px-6 py-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
              <Github className="size-3.5" />
              GitHub Import
            </div>
            <h2 className="text-xl font-semibold">Import from GitHub</h2>
            <p className="mt-1 text-sm text-gray-400">
              Select a repository to create a project and copy its files into CodeCollab.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isImporting}
            className="rounded-full text-gray-400 hover:bg-white/5 hover:text-white"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="max-h-[26rem] overflow-y-auto px-6 py-5">
          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center text-sm text-gray-400">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading repositories...
            </div>
          ) : !isConnected ? (
            <div className="flex min-h-52 items-center justify-center text-center text-sm text-gray-400">
              GitHub is not connected for this account.
            </div>
          ) : repositories.length === 0 ? (
            <div className="flex min-h-52 items-center justify-center text-center text-sm text-gray-400">
              No repositories found for this GitHub account.
            </div>
          ) : (
            <div className="grid gap-3">
              {repositories.map((repo) => {
                const isSelected = repo.id === selectedRepoId;

                return (
                  <button
                    key={repo.id}
                    type="button"
                    onClick={() => onSelectRepo(repo.id)}
                    className={`rounded-xl border px-4 py-4 text-left transition-all ${
                      isSelected
                        ? "border-white bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
                        : "border-[#2B2B30] bg-[#202027] hover:border-[#3A3A42] hover:bg-[#26262E]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {repo.name}
                          </p>
                          {repo.private && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-gray-300">
                              Private
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{repo.fullName}</p>
                        <p className="mt-3 text-sm text-gray-300">{repo.description}</p>
                        {repo.updatedAt && (
                          <p className="mt-3 text-xs text-gray-500">
                            Updated {new Date(repo.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-start gap-3">
                        {repo.htmlUrl && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenRepository?.(repo.htmlUrl);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                onOpenRepository?.(repo.htmlUrl);
                              }
                            }}
                            className="mt-0.5 text-gray-400 transition-colors hover:text-white"
                          >
                            <ExternalLink className="size-4" />
                          </span>
                        )}
                        <div
                          className={`mt-1 size-4 rounded-full border ${
                            isSelected
                              ? "border-white bg-white"
                              : "border-gray-500 bg-transparent"
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#2B2B30] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-400">
            {selectedRepo ? (
              <>Selected: <span className="font-medium text-white">{selectedRepo.fullName}</span></>
            ) : (
              "Select a repository to continue."
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isImporting}
              className="bg-[#23232A] text-white hover:bg-[#2B2B30]"
            >
              Cancel
            </Button>
            <Button
              onClick={onImport}
              disabled={!selectedRepoId || isImporting || isLoading || !isConnected}
              className="min-w-36 bg-white text-black hover:bg-white/90"
            >
              {isImporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Import className="size-4" />
                  Import Repo
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
