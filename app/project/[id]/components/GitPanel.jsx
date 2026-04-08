"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { fetchGitStatus, fetchProject } from "@/store/ProjectSlice";
import { fetchNodes } from "@/store/NodesSlice";
import {
  ArrowUp,
  Check,
  Download,
  FileCode2,
  GitBranch,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";

function getFileTone(file) {
  if (file.status === "conflicted") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  if (file.staged && file.unstaged) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-100";
  }

  if (file.staged) {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  }

  return "border-[#2B2B30] bg-[#15151B] text-white";
}

export default function GitPanel({ projectId, isOpen, onClose }) {
  const dispatch = useDispatch();
  const repository = useSelector((state) => state.project.repository);
  const gitStatus = useSelector((state) => state.project.gitStatus);
  const gitStatusLoading = useSelector((state) => state.project.gitStatusLoading);
  const [commitMessage, setCommitMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  if (!isOpen || !repository) {
    return null;
  }

  const files = gitStatus?.files || [];
  const stagedFiles = files.filter((file) => file.staged);
  const unstagedFiles = files.filter((file) => file.unstaged || !file.staged);
  const hasConflicts = Boolean(gitStatus?.hasConflicts);
  const hasDirtyChanges = files.length > 0;
  const hasStagedChanges = stagedFiles.length > 0;
  const hasCommitMessage = Boolean(commitMessage.trim());
  const canCommit = hasStagedChanges && hasCommitMessage && !hasConflicts && !actionLoading;
  const canPush =
    !actionLoading &&
    !hasConflicts &&
    !hasDirtyChanges &&
    (gitStatus?.ahead || 0) > 0;
  const canPull = !actionLoading && !hasConflicts && !hasDirtyChanges;

  const refreshStatus = async () => {
    await dispatch(fetchProject(projectId));
    await dispatch(fetchGitStatus(projectId));
  };

  const syncStatus = async () => {
    await dispatch(fetchProject(projectId));
    await dispatch(fetchGitStatus(projectId));
  };

  const runAction = async (action, endpoint, body = {}) => {
    setActionLoading(action);

    try {
      const response = await fetch(`/api/project/${projectId}/git/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(
          endpoint === "commit" ? { message: commitMessage.trim() } : body
        ),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${endpoint}`);
      }

      if (endpoint === "pull") {
        await dispatch(fetchNodes(projectId));
      }

      await syncStatus();

      if (endpoint === "commit") {
        setCommitMessage("");
      }

      const successMessageByEndpoint = {
        commit: "Changes committed",
        push: "Changes pushed",
        pull: "Latest changes pulled",
        stage: body.stageAll ? "All changes staged" : "File staged",
        unstage: body.unstageAll ? "All staged changes reverted to unstaged" : "File unstaged",
      };

      toast.success(successMessageByEndpoint[endpoint] || "Git action completed");
    } catch (error) {
      toast.error(error.message || `Failed to ${endpoint}`);
    } finally {
      setActionLoading(null);
    }
  };

  const validationMessage = hasConflicts
    ? "Resolve merge conflicts before staging, committing, pulling, or pushing."
    : !hasStagedChanges
    ? "Stage at least one file before committing."
    : !hasCommitMessage
    ? "Enter a commit message before committing."
    : hasDirtyChanges
    ? "Push is locked until every local change is committed."
    : (gitStatus?.ahead || 0) === 0
    ? "Push becomes available after you create a local commit."
    : null;

  const renderFileList = (title, items, emptyMessage, actionLabel, endpoint, bodyKey) => (
    <section className="rounded-2xl border border-[#25252B] bg-[#111115]">
      <div className="flex items-center justify-between border-b border-[#25252B] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-gray-400">{items.length} files</p>
        </div>
        {items.length > 1 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-300 hover:bg-white/5 hover:text-white"
            onClick={() =>
              runAction(
                endpoint === "stage" ? "stage-all" : "unstage-all",
                endpoint,
                { [bodyKey]: true }
              )
            }
            disabled={Boolean(actionLoading)}
          >
            {actionLabel} all
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-5 text-sm text-gray-500">{emptyMessage}</div>
      ) : (
        <div className="space-y-3 p-4">
          {items.map((file) => (
            <div
              key={`${title}-${file.path}-${file.status}`}
              className={`rounded-2xl border px-3 py-3 ${getFileTone(file)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="mt-0.5 size-4 shrink-0 text-gray-400" />
                    <p className="truncate text-sm font-medium">{file.path}</p>
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    {file.status === "conflicted"
                      ? "Conflict detected"
                      : file.staged && file.unstaged
                      ? "Staged changes exist, plus more edits not yet staged"
                      : file.staged
                      ? "Ready to commit"
                      : "Not included in the next commit yet"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-200">
                    {file.status}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#303038] bg-transparent text-white hover:bg-white/5"
                    onClick={() =>
                      runAction(
                        endpoint === "stage" ? "stage-file" : "unstage-file",
                        endpoint,
                        { paths: [file.path] }
                      )
                    }
                    disabled={Boolean(actionLoading) || file.status === "conflicted"}
                  >
                    {actionLoading === "stage-file" || actionLoading === "unstage-file" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : endpoint === "stage" ? (
                      <ArrowUp className="size-4" />
                    ) : (
                      <X className="size-4" />
                    )}
                    {actionLabel}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/55 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#2B2B30] bg-[#0C0C10] text-white shadow-2xl">
        <div className="border-b border-[#2B2B30] px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Source Control</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{repository.repoFullName}</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-300">
                <span className="inline-flex items-center gap-1 rounded-full border border-[#2B2B30] bg-white/[0.03] px-2.5 py-1">
                  <GitBranch className="size-3.5" />
                  {repository.currentBranch}
                </span>
                <span className="rounded-full border border-[#2B2B30] bg-white/[0.03] px-2.5 py-1">
                  {repository.isPrivate ? "Private repo" : "Public repo"}
                </span>
                <span className="rounded-full border border-[#2B2B30] bg-white/[0.03] px-2.5 py-1">
                  {gitStatus?.isClean ? "Working tree clean" : "Local changes detected"}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-gray-400 hover:bg-white/5 hover:text-white"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-2xl border border-[#25252B] bg-[#121218] px-3 py-3">
              <div className="text-lg font-semibold text-white">{gitStatus?.ahead ?? 0}</div>
              <div className="mt-1 text-gray-400">Ahead</div>
            </div>
            <div className="rounded-2xl border border-[#25252B] bg-[#121218] px-3 py-3">
              <div className="text-lg font-semibold text-white">{gitStatus?.behind ?? 0}</div>
              <div className="mt-1 text-gray-400">Behind</div>
            </div>
            <div className="rounded-2xl border border-[#25252B] bg-[#121218] px-3 py-3">
              <div className="text-lg font-semibold text-white">{files.length}</div>
              <div className="mt-1 text-gray-400">Changed</div>
            </div>
          </div>
        </div>

        <div className="border-b border-[#2B2B30] px-5 py-5">
          <div className="rounded-2xl border border-[#25252B] bg-[#111115] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Commit flow</p>
                <p className="mt-1 text-xs text-gray-400">
                  Stage what you want, write a message, commit, then push only after the tree is clean.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-white/5 hover:text-white"
                onClick={refreshStatus}
                disabled={gitStatusLoading || Boolean(actionLoading)}
              >
                {gitStatusLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Refresh
              </Button>
            </div>

            <textarea
              value={commitMessage}
              onChange={(event) => setCommitMessage(event.target.value)}
              placeholder="Write a clear commit message"
              className="mt-4 min-h-24 w-full rounded-2xl border border-[#2B2B30] bg-[#17171D] px-3 py-3 text-sm text-white outline-none placeholder:text-gray-500"
            />

            {validationMessage ? (
              <p className="mt-3 text-xs text-amber-300">{validationMessage}</p>
            ) : (
              <p className="mt-3 text-xs text-emerald-300">
                Ready to commit and push.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="bg-white text-black hover:bg-white/90"
                onClick={() => runAction("commit", "commit")}
                disabled={!canCommit}
              >
                {actionLoading === "commit" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Commit
              </Button>
              <Button
                variant="outline"
                className="border-[#2B2B30] bg-transparent text-white hover:bg-white/5"
                onClick={() => runAction("push", "push")}
                disabled={!canPush}
              >
                {actionLoading === "push" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Push
              </Button>
              <Button
                variant="outline"
                className="border-[#2B2B30] bg-transparent text-white hover:bg-white/5"
                onClick={() => runAction("pull", "pull")}
                disabled={!canPull}
              >
                {actionLoading === "pull" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Pull
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {renderFileList(
            "Staged",
            stagedFiles,
            "Nothing staged yet.",
            "Unstage",
            "unstage",
            "unstageAll"
          )}
          {renderFileList(
            "Unstaged",
            unstagedFiles,
            "No unstaged files.",
            "Stage",
            "stage",
            "stageAll"
          )}
        </div>
      </aside>
    </div>
  );
}
