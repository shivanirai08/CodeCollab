"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { fetchGitStatus, fetchProject } from "@/store/ProjectSlice";
import { fetchNodes } from "@/store/NodesSlice";
import { Check, GitBranch, Loader2, RefreshCw, Upload, Download, X } from "lucide-react";

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

  const refreshStatus = async () => {
    await dispatch(fetchProject(projectId));
    await dispatch(fetchGitStatus(projectId));
  };

  const runAction = async (action, endpoint) => {
    setActionLoading(action);

    try {
      const response = await fetch(`/api/project/${projectId}/git/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body:
          endpoint === "commit"
            ? JSON.stringify({ message: commitMessage })
            : JSON.stringify({}),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${endpoint}`);
      }

      if (endpoint === "pull") {
        await dispatch(fetchNodes(projectId));
      }

      await dispatch(fetchProject(projectId));
      await dispatch(fetchGitStatus(projectId));

      if (endpoint === "commit") {
        setCommitMessage("");
      }

      toast.success(
        endpoint === "commit"
          ? "Changes committed"
          : endpoint === "push"
          ? "Changes pushed"
          : "Latest changes pulled"
      );
    } catch (error) {
      toast.error(error.message || `Failed to ${endpoint}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#2B2B30] bg-[#101014] text-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#2B2B30] px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-gray-400">Source Control</p>
            <h3 className="mt-2 text-lg font-semibold">{repository.repoFullName}</h3>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                <GitBranch className="size-3.5" />
                {repository.currentBranch}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-1">
                {repository.isPrivate ? "Private" : "Public"}
              </span>
              <span className="rounded-full bg-white/5 px-2 py-1">
                {gitStatus?.isClean ? "Clean" : "Changes"}
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

        <div className="border-b border-[#2B2B30] px-5 py-4">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl bg-[#17171D] px-3 py-3">
              <div className="text-lg font-semibold text-white">{gitStatus?.ahead ?? 0}</div>
              <div className="mt-1 text-gray-400">Ahead</div>
            </div>
            <div className="rounded-xl bg-[#17171D] px-3 py-3">
              <div className="text-lg font-semibold text-white">{gitStatus?.behind ?? 0}</div>
              <div className="mt-1 text-gray-400">Behind</div>
            </div>
            <div className="rounded-xl bg-[#17171D] px-3 py-3">
              <div className="text-lg font-semibold text-white">{files.length}</div>
              <div className="mt-1 text-gray-400">Changed</div>
            </div>
          </div>

          <textarea
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            placeholder="Write a commit message"
            className="mt-4 min-h-24 w-full rounded-xl border border-[#2B2B30] bg-[#17171D] px-3 py-3 text-sm text-white outline-none placeholder:text-gray-500"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="bg-white text-black hover:bg-white/90"
              onClick={() => runAction("commit", "commit")}
              disabled={!commitMessage.trim() || actionLoading !== null}
            >
              {actionLoading === "commit" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Commit
            </Button>
            <Button
              variant="outline"
              className="border-[#2B2B30] bg-transparent text-white hover:bg-white/5"
              onClick={() => runAction("push", "push")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "push" ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Push
            </Button>
            <Button
              variant="outline"
              className="border-[#2B2B30] bg-transparent text-white hover:bg-white/5"
              onClick={() => runAction("pull", "pull")}
              disabled={actionLoading !== null}
            >
              {actionLoading === "pull" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Pull
            </Button>
            <Button
              variant="ghost"
              className="text-gray-300 hover:bg-white/5 hover:text-white"
              onClick={refreshStatus}
              disabled={gitStatusLoading || actionLoading !== null}
            >
              {gitStatusLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-gray-400">
            <span>Changes</span>
            <span>{files.length}</span>
          </div>

          {files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2B2B30] px-4 py-6 text-center text-sm text-gray-400">
              Working tree is clean.
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={`${file.path}-${file.status}`}
                  className="flex items-center justify-between rounded-xl border border-[#2B2B30] bg-[#15151B] px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{file.path}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {file.staged ? "Staged" : "Unstaged"}
                      {file.unstaged && file.staged ? " + unstaged changes" : ""}
                    </p>
                  </div>
                  <span className="ml-3 rounded-full bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase text-gray-200">
                    {file.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
