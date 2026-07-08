"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import GitHubImportModal from "@/components/ui/GitHubImportModal";
import CreateBranchDialog from "@/components/ui/CreateBranchDialog";
import {
  getGitSuggestedActionLabel,
  isRepositoryUnavailableIssue,
  normalizeGitActionError,
} from "@/lib/gitActionErrors";
import {
  getConflictFilesFromGitStatus,
  normalizeGitNodePath,
} from "@/lib/gitStatus";
import { fetchGitStatus, fetchProject, setGitStatus } from "@/store/ProjectSlice";
import {
  fetchNodes,
  openGitDiffTab,
  setActiveFile,
  updateLocalContent,
  closeAllFiles,
  requestEditorSaveCancel,
  requestEditorSaveFlush,
  invalidateLocalFileContents,
} from "@/store/NodesSlice";
import GitSourceControlList from "./GitSourceControlList";
import {
  Check,
  Download,
  FolderGit2,
  GitBranch,
  Github,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 960;

function normalizeNodePath(path) {
  return normalizeGitNodePath(path);
}

function buildNodePathIndex(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cache = new Map();
  const index = new Map();

  const resolvePath = (nodeId) => {
    if (!nodeId || cache.has(nodeId)) {
      return cache.get(nodeId) || "";
    }

    const node = byId.get(nodeId);
    if (!node) return "";

    const parentPath = node.parent_id ? resolvePath(node.parent_id) : "";
    const fullPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    cache.set(nodeId, fullPath);
    return fullPath;
  };

  for (const node of nodes) {
    if (node.type !== "file") continue;
    const fullPath = normalizeNodePath(resolvePath(node.id));
    if (fullPath) {
      index.set(fullPath, node.id);
    }
  }

  return index;
}

function GitIssueAlert({ issue, actionLabel, actionDisabled, onAction, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const extraText = [issue.hint, issue.details].filter(Boolean).join(" ");

  return (
    <div className="mt-3 rounded-2xl border border-[#4B242C] bg-[#231216] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#FDE2E4]">{issue.title}</p>
          <p className="mt-1 text-sm text-[#F6BCC4]">{issue.error}</p>
          {extraText ? (
            <>
              {expanded ? (
                <p className="mt-2 text-xs leading-5 text-[#E7A1AB]">{extraText}</p>
              ) : null}
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="mt-2 text-xs font-medium text-[#F08A95] hover:text-[#FBCFD6]"
              >
                {expanded ? "Show less" : "Show more"}
              </button>
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actionLabel ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 border border-[#6B2F3A] bg-[#30181D] px-3 text-[#FFE2E7] hover:bg-[#3A1D24] hover:text-white"
              onClick={onAction}
              disabled={actionDisabled}
            >
              {actionLabel}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-[#D9A7AF] hover:bg-[#30181D] hover:text-white"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function GitPanel({
  projectId,
  isOpen,
  onClose,
  onShowRepositoryUnavailable,
}) {
  const dispatch = useDispatch();
  const repository = useSelector((state) => state.project.repository);
  const permissions = useSelector((state) => state.project.permissions);
  const onlineUsers = useSelector((state) => state.project.onlineUsers);
  const reduxUserId = useSelector((state) => state.user.id);
  const gitStatus = useSelector((state) => state.project.gitStatus);
  const gitStatusLoading = useSelector((state) => state.project.gitStatusLoading);
  const gitStatusIssue = useSelector((state) => state.project.gitStatusIssue);
  const gitStatusError = useSelector((state) => state.project.gitStatusError);
  const nodes = useSelector((state) => state.nodes.nodes || []);

  const [commitMessage, setCommitMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [workingTreeActionKey, setWorkingTreeActionKey] = useState(null);
  const [panelWidth, setPanelWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef(null);
  const changesSectionRef = useRef(null);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubConnected, setGithubConnected] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [isImportingRepo, setIsImportingRepo] = useState(false);
  const [showFlowInfo, setShowFlowInfo] = useState(false);
  const [gitIssue, setGitIssue] = useState(null);

  const files = useMemo(() => gitStatus?.files || [], [gitStatus]);
  const conflictFiles = useMemo(
    () => getConflictFilesFromGitStatus(gitStatus),
    [gitStatus]
  );
  const stagedFiles = files.filter((file) => file.staged);
  const unstagedFiles = files.filter(
    (file) => (file.unstaged || !file.staged) && file.status !== "conflicted"
  );
  const hasDirtyChanges = gitStatus ? !gitStatus.isClean : false;
  const hasConflicts = Boolean(gitStatus?.hasConflicts);
  const needsRebaseContinue = Boolean(gitStatus?.needsRebaseContinue);
  const aheadCount = gitStatus?.ahead || 0;
  const behindCount = gitStatus?.behind || 0;
  const hasStagedChanges = stagedFiles.length > 0;
  const hasCommitMessage = Boolean(commitMessage.trim());
  const canCommit =
    hasStagedChanges &&
    hasCommitMessage &&
    !hasConflicts &&
    !actionLoading &&
    !workingTreeActionKey &&
    !needsRebaseContinue;
  const canPush =
    !actionLoading &&
    !workingTreeActionKey &&
    !hasConflicts &&
    !hasDirtyChanges &&
    !needsRebaseContinue &&
    aheadCount > 0;
  const canPull =
    !actionLoading &&
    !workingTreeActionKey &&
    !hasConflicts &&
    !hasDirtyChanges &&
    !needsRebaseContinue &&
    behindCount > 0;
  const canFinishRebase = !actionLoading && !workingTreeActionKey && needsRebaseContinue;
  const nodePathIndex = useMemo(() => buildNodePathIndex(nodes), [nodes]);
  const selectedRepo = githubRepos.find((repo) => repo.id === selectedRepoId) || null;
  const gitIssueActionLabel = gitIssue
    ? getGitSuggestedActionLabel(gitIssue.suggestedAction)
    : null;

  const collaboratorCount = useMemo(() => {
    const currentUserId = reduxUserId || "current-user";
    if (!onlineUsers?.length) return 0;
    return onlineUsers.filter((user) => user.user_id !== currentUserId).length;
  }, [onlineUsers, reduxUserId]);

  const handleBranchCreated = async (data) => {
    const {
      updatedCount = 0,
      createdCount = 0,
      deletedCount = 0,
    } = data.mergeResult || {};
    const summary = [];
    if (updatedCount > 0) summary.push(`${updatedCount} files updated`);
    if (createdCount > 0) summary.push(`${createdCount} files added`);
    if (deletedCount > 0) summary.push(`${deletedCount} files removed`);

    let message = `Created branch "${data.branch || ""}"`;
    if (data.pushed) {
      message += " and pushed to origin";
    }
    if (summary.length > 0) {
      message += `: ${summary.join(", ")}`;
    }

    toast.success(message);
    dispatch(requestEditorSaveCancel());
    dispatch(closeAllFiles());
    await dispatch(fetchProject(projectId));
    await dispatch(fetchGitStatus(projectId));
    await dispatch(fetchNodes(projectId));
  };

  useEffect(() => {
    if (!isOpen || !repository || !projectId) {
      return;
    }

    dispatch(fetchGitStatus(projectId));
  }, [dispatch, isOpen, projectId, repository]);

  useEffect(() => {
    if (!isOpen || repository || !permissions.canEdit) {
      return;
    }

    const loadRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const response = await fetch("/api/github/repos", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch GitHub repositories");
        }

        setGithubRepos(result.repositories || []);
        setGithubConnected(Boolean(result.github_connected));
      } catch (error) {
        setGithubRepos([]);
        setGithubConnected(false);
        toast.error(error.message || "Failed to fetch GitHub repositories");
      } finally {
        setIsLoadingRepos(false);
      }
    };

    loadRepos();
  }, [isOpen, permissions.canEdit, repository]);

  useEffect(() => {
    if (isResizing) {
      const onMouseMove = (event) => {
        const panelRight = panelRef.current?.getBoundingClientRect().right ?? window.innerWidth;
        const nextWidth = panelRight - event.clientX;
        const clampedWidth = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, nextWidth));
        setPanelWidth(clampedWidth);
      };

      const onMouseUp = () => {
        setIsResizing(false);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
    }
  }, [isResizing]);

  const syncStatus = async () => {
    await dispatch(fetchProject(projectId));
    if (repository) {
      await dispatch(fetchGitStatus(projectId));
    }
  };

  const triggerGitIssueAction = async (issue) => {
    if (!issue) {
      return;
    }

    if (issue.suggestedAction === "review-changes" || issue.suggestedAction === "commit") {
      setGitIssue(null);
      changesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (issue.suggestedAction === "pull" && canPull) {
      await runAction("pull", "pull");
      return;
    }

    if (issue.suggestedAction === "connect-github") {
      handleConnectGitHub();
      return;
    }

    if (issue.suggestedAction === "continue-rebase") {
      await runAction("continue", "continue");
      return;
    }

    if (issue.suggestedAction === "resolve-conflicts") {
      let refreshedStatus = gitStatus;

      try {
        refreshedStatus = await dispatch(fetchGitStatus(projectId)).unwrap();
      } catch {
        // Fall back to the status already in state.
      }

      const conflicts = getConflictFilesFromGitStatus(refreshedStatus);
      if (!conflicts.length) {
        toast.info("No conflicted files are currently detected.");
        return;
      }

      const firstConflict = conflicts[0];
      await openInEditor(firstConflict.path);
      return;
    }

    if (issue.suggestedAction === "retry" && issue.endpoint) {
      await runAction(issue.endpoint, issue.endpoint);
    }
  };

  const presentGitIssue = (payload, action) => {
    const issue = {
      ...normalizeGitActionError(payload, action),
      endpoint: action,
    };

    setGitIssue(issue);
    toast.error(issue.title, {
      description: issue.error,
    });

    if (issue.details) {
      console.error(`${issue.title}:`, issue.details);
    }
  };

  const runWorkingTreeAction = async ({
    endpoint,
    body = {},
    actionKey,
    refreshNodes = false,
  }) => {
    setWorkingTreeActionKey(actionKey);
    if (endpoint === "discard") {
      dispatch(requestEditorSaveCancel());
    } else if (endpoint === "stage" || endpoint === "unstage") {
      dispatch(requestEditorSaveFlush());
    }
    try {
      const response = await fetch(`/api/project/${projectId}/git/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        presentGitIssue(result, endpoint);
        return;
      }

      if (result.status) {
        dispatch(setGitStatus(result.status));
      } else {
        await dispatch(fetchGitStatus({ projectId, silent: true }));
      }

      if (endpoint === "discard") {
        if (body.discardAll) {
          dispatch(invalidateLocalFileContents({ all: true }));
        } else if (Array.isArray(body.paths) && body.paths.length > 0) {
          dispatch(invalidateLocalFileContents({ paths: body.paths }));
        }
      }

      if (refreshNodes) {
        await dispatch(fetchNodes(projectId));
      }
    } catch (error) {
      presentGitIssue({ error: error.message || `Failed to ${endpoint}` }, endpoint);
    } finally {
      setWorkingTreeActionKey(null);
    }
  };

  const runAction = async (action, endpoint, body = {}) => {
    setActionLoading(action);
    if (endpoint === "pull" || endpoint === "checkout" || endpoint === "create-branch") {
      dispatch(requestEditorSaveFlush());
    }
    try {
      const response = await fetch(`/api/project/${projectId}/git/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(endpoint === "commit" ? { message: commitMessage.trim() } : body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const issue = normalizeGitActionError(result, endpoint);
        presentGitIssue(result, endpoint);
        if (issue.suggestedAction === "resolve-conflicts") {
          await dispatch(fetchGitStatus(projectId));
        }
        if (issue.suggestedAction === "continue-rebase") {
          await dispatch(fetchGitStatus(projectId));
        }
        return;
      }

      setGitIssue(null);

      if (endpoint === "continue") {
        toast.success("Rebase finished. You can push your commit now.");
      }

      if (endpoint === "pull") {
        dispatch(requestEditorSaveCancel());
        await dispatch(fetchNodes(projectId));

        const {
          updatedCount = 0,
          createdCount = 0,
          deletedCount = 0,
          conflictedFiles = [],
        } = result.mergeResult || {};
        const summary = [];
        if (updatedCount > 0) summary.push(`${updatedCount} files updated`);
        if (createdCount > 0) summary.push(`${createdCount} files added`);
        if (deletedCount > 0) summary.push(`${deletedCount} files removed`);

        if (result.pullStatus === "conflicts" || conflictedFiles.length > 0) {
          toast.error("Pull stopped — resolve conflicts below.");
        } else if (summary.length > 0) {
          toast.success(`Pull complete: ${summary.join(", ")}`);
        } else {
          toast.success("Already up to date");
        }
      }

      if (endpoint === "resolve-conflict") {
        if (body.filePath) {
          dispatch(invalidateLocalFileContents({ paths: [body.filePath] }));
        }
        await dispatch(fetchNodes(projectId));
        toast.success(`Resolved ${body.filePath || "file"}`);
      }

      if (endpoint === "checkout" || endpoint === "create-branch") {
        dispatch(requestEditorSaveCancel());
        dispatch(closeAllFiles());
        await dispatch(fetchNodes(projectId));
      }

      await syncStatus();

      if (endpoint === "commit") {
        setCommitMessage("");
      }
    } catch (error) {
      presentGitIssue({ error: error.message || `Failed to ${endpoint}` }, endpoint);
    } finally {
      setActionLoading(null);
    }
  };

  const openInEditor = async (filePath) => {
    const normalizedPath = normalizeNodePath(filePath);
    const nodeId = nodePathIndex.get(normalizedPath);

    if (!nodeId) {
      toast.error("File is not available in the editor tree.");
      return;
    }

    const isConflicted = conflictFiles.some(
      (file) => normalizeNodePath(file.path) === normalizedPath
    );

    try {
      if (isConflicted) {
        const response = await fetch(
          `/api/project/${projectId}/git/diff?path=${encodeURIComponent(normalizedPath)}`,
          { credentials: "same-origin", cache: "no-store" }
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.diff) {
          throw new Error(result.error || "Failed to load conflicted file");
        }

        dispatch(updateLocalContent({ nodeId, content: result.diff }));
        dispatch(setActiveFile(nodeId));
        return;
      }

      const response = await fetch(
        `/api/project/${projectId}/git/compare?path=${encodeURIComponent(normalizedPath)}`,
        { credentials: "same-origin", cache: "no-store" }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to load file diff");
      }

      dispatch(
        openGitDiffTab({
          nodeId,
          filePath: normalizedPath,
          original: result.original ?? "",
          modified: result.modified ?? "",
        })
      );
    } catch (error) {
      toast.error(error.message || "Failed to open file in editor");
    }
  };

  const resolveConflict = async (filePath, strategy) => {
    const normalizedPath = normalizeNodePath(filePath);
    const actionKey = `resolve-${strategy}:${normalizedPath}`;
    setActionLoading(actionKey);

    try {
      const response = await fetch(`/api/project/${projectId}/git/resolve-conflict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ filePath: normalizedPath, strategy }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        presentGitIssue(result, "resolve-conflict");
        return;
      }

      dispatch(invalidateLocalFileContents({ paths: [normalizedPath] }));
      await dispatch(fetchNodes(projectId));

      const nextStatus = result.status || (await dispatch(fetchGitStatus({ projectId, silent: true })).unwrap().catch(() => null));
      if (nextStatus) {
        dispatch(setGitStatus(nextStatus));
        if (!getConflictFilesFromGitStatus(nextStatus).length) {
          setGitIssue(null);
        }
      }

      toast.success(`Resolved ${normalizedPath.split("/").pop() || normalizedPath}`);
    } catch (error) {
      presentGitIssue({ error: error.message || "Failed to resolve conflict" }, "resolve-conflict");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConnectGitHub = () => {
    window.location.href = `/api/github/connect?mode=connect&next=${encodeURIComponent(`/project/${projectId}?panel=git`)}`;
  };

  const handleImportRepository = async () => {
    if (!selectedRepo) {
      return;
    }

    setIsImportingRepo(true);
    try {
      const response = await fetch(`/api/project/${projectId}/git/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          repo: selectedRepo,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Failed to import repository");
      }

      setIsImportModalOpen(false);
      await dispatch(fetchProject(projectId));
      await dispatch(fetchNodes(projectId));
      await dispatch(fetchGitStatus(projectId));
      toast.success(result.message || "Repository connected");
    } catch (error) {
      toast.error(error.message || "Failed to import repository");
    } finally {
      setIsImportingRepo(false);
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-[#24242A] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#2B2B30] bg-[#15151B] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#9BA0AA]">
              <FolderGit2 className="size-3.5" />
              Git
            </div>
            <h2 className="text-lg font-semibold text-white">Connect source control</h2>
            <p className="mt-1 text-sm text-[#8B909A]">
              Keep this simple: connect GitHub, then import your repository when ready.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
              onClick={() => setShowFlowInfo((prev) => !prev)}
              aria-label="Show Git setup flow"
            >
              <Info className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {showFlowInfo ? (
          <div className="rounded-xl border border-[#2B2B30] bg-[#101014] p-3 text-sm text-[#C7CBD4]">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#7C8392]">Flow</div>
            <div>1. Connect your GitHub account.</div>
            <div>2. Pick a repository to import into this project.</div>
            <div>3. Continue using commit, push, and pull inside this panel.</div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#24242A] bg-[#111117] p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/5 p-3 text-white">
              <Github className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white">
                {githubConnected ? "GitHub connected" : "GitHub not connected"}
              </h3>
              <p className="mt-1 text-sm text-[#8B909A]">
                {githubConnected
                  ? "Import a repository to connect this project to source control."
                  : "Connect your GitHub account to start importing repositories."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {githubConnected ? (
                  <Button
                    variant="ghost"
                    onClick={() => setIsImportModalOpen(true)}
                    disabled={!permissions.canEdit || isLoadingRepos}
                    className="border border-[#2B2B30] bg-[#17171D] text-white hover:bg-[#202027]"
                  >
                    {isLoadingRepos ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Import a Repo
                  </Button>
                ) : (
                <Button
                  onClick={handleConnectGitHub}
                  disabled={!permissions.canEdit}
                  className="bg-white text-black hover:bg-white/90"
                >
                  <Github className="size-4" />
                  Connect GitHub
                </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <GitHubImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        repositories={githubRepos}
        selectedRepoId={selectedRepoId}
        onSelectRepo={setSelectedRepoId}
        onImport={handleImportRepository}
        onOpenRepository={(url) => window.open(url, "_blank", "noopener,noreferrer")}
        isImporting={isImportingRepo}
        isLoading={isLoadingRepos}
        isConnected={githubConnected}
      />
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 xl:hidden" onClick={onClose} />
      <aside
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[92vw] shrink-0 flex-col border-l border-[#2A2A30] bg-[#0E0E12] text-[#E6E6EC] shadow-2xl xl:relative xl:inset-auto xl:z-auto xl:max-w-[45%] xl:rounded-sm xl:border"
        style={{ width: repository ? `${panelWidth}px` : "min(100vw, 520px)" }}
      >
        {repository ? (
          <>
            <button
              type="button"
              aria-label="Resize source control panel"
              className="absolute left-0 top-0 hidden h-full w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-[#9CA3AF]/30 xl:block"
              onMouseDown={() => setIsResizing(true)}
            />

            <div className="flex items-center justify-between border-b border-[#24242A] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <GitBranch className="size-4 text-[#9BA0AA]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{repository.repoFullName}</p>
                  <p className="text-xs text-[#8B909A]">{repository.currentBranch}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {permissions.canEdit ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
                    onClick={() => setIsCreateBranchOpen(true)}
                    disabled={Boolean(actionLoading)}
                  >
                    <Plus className="size-4" />
                    <span className="ml-1 hidden sm:inline">New branch</span>
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
                  onClick={syncStatus}
                  disabled={gitStatusLoading || Boolean(actionLoading)}
                >
                  {gitStatusLoading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
                  onClick={onClose}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="border-b border-[#24242A] px-4 py-3">
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#8B909A]">
                <span>
                  {stagedFiles.length} staged · {unstagedFiles.length} changes
                </span>
                {aheadCount > 0 ? <span>{aheadCount} ahead</span> : null}
                {behindCount > 0 ? <span>{behindCount} behind</span> : null}
                {gitStatus?.isClean ? <span className="text-emerald-400">Clean</span> : null}
              </div>

              {needsRebaseContinue ? (
                <div className="mt-3 rounded-2xl border border-[#4B3B24] bg-[#231C12] p-3">
                  <p className="text-sm font-semibold text-[#FDE8C8]">Rebase waiting to finish</p>
                  <p className="mt-1 text-sm text-[#E8C9A0]">
                    Your conflict resolution commit is saved, but the pull rebase still needs to be completed before you can push.
                  </p>
                  <Button
                    size="sm"
                    className="mt-3 h-8 bg-[#E5E7EB] px-3 text-black hover:bg-white"
                    onClick={() => runAction("continue", "continue")}
                    disabled={!canFinishRebase}
                  >
                    {actionLoading === "continue" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Finish rebase"
                    )}
                  </Button>
                </div>
              ) : null}

              <textarea
                value={commitMessage}
                onChange={(event) => setCommitMessage(event.target.value)}
                placeholder="Commit message"
                className="mt-3 h-16 w-full resize-none border-b border-[#2A2A30] bg-transparent px-1 py-2 text-sm outline-none placeholder:text-[#6B7280]"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 bg-[#E5E7EB] px-3 text-black hover:bg-white"
                  onClick={() => runAction("commit", "commit")}
                  disabled={!canCommit}
                >
                  {actionLoading === "commit" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Commit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
                  onClick={() => runAction("push", "push")}
                  disabled={!canPush}
                >
                  <Upload className="size-4" />
                  Push
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
                  onClick={() => runAction("pull", "pull")}
                  disabled={!canPull}
                >
                  <Download className="size-4" />
                  Pull
                </Button>
              </div>

              {gitIssue ? (
                <GitIssueAlert
                  issue={gitIssue}
                  actionLabel={gitIssueActionLabel}
                  actionDisabled={Boolean(actionLoading) || (gitIssue.suggestedAction === "pull" && !canPull)}
                  onAction={() => triggerGitIssueAction(gitIssue)}
                  onDismiss={() => setGitIssue(null)}
                />
              ) : null}
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                {gitStatusError ? (
                  <div className="mx-3 mt-3 rounded-2xl border border-[#4B242C] bg-[#231216] p-3">
                    <p className="text-sm font-semibold text-[#FDE2E4]">
                      {gitStatusIssue?.title || "Could not load git status"}
                    </p>
                    <p className="mt-1 text-sm text-[#F6BCC4]">{gitStatusError}</p>
                    {gitStatusIssue?.hint ? (
                      <p className="mt-2 text-xs leading-relaxed text-[#E7A1AB]">{gitStatusIssue.hint}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 border border-[#6B2F3A] bg-[#30181D] px-3 text-[#FFE2E7] hover:bg-[#3A1D24] hover:text-white"
                        onClick={() => dispatch(fetchGitStatus(projectId))}
                        disabled={gitStatusLoading}
                      >
                        {gitStatusLoading ? <Loader2 className="size-4 animate-spin" /> : "Retry"}
                      </Button>
                      {isRepositoryUnavailableIssue(gitStatusIssue) && onShowRepositoryUnavailable ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 border border-[#365D46] bg-[#173322] px-3 text-[#A7F3D0] hover:bg-[#20452E] hover:text-white"
                          onClick={onShowRepositoryUnavailable}
                        >
                          Learn more
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {conflictFiles.length > 0 ? (
                  <>
                    <div className="px-3 pt-3 flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#F08A95]">
                        Conflicts {conflictFiles.length}
                      </span>
                    </div>
                    <div className="mx-3 my-2 rounded-lg border border-[#4B242C] bg-[#1A0C10] px-3 py-2 text-[11px] text-[#E7A1AB]">
                      Open a file to resolve it, or use Keep Ours / Take Theirs.
                    </div>
                    <div className="mt-1">
                      {conflictFiles.map((file) => (
                        <div
                          key={`conflict-${file.path}`}
                          className="px-3 py-2 text-sm transition-colors hover:bg-[#1F1418]"
                        >
                          <button
                            type="button"
                            onClick={() => openInEditor(file.path)}
                            className="flex w-full cursor-pointer items-center gap-2"
                          >
                            <span className="text-[#FB7185]">!</span>
                            <span className="truncate text-[#F9CFD6]">{file.path}</span>
                          </button>
                          {permissions.canEdit ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 border border-[#365D46] bg-[#173322] px-2 text-[11px] text-[#A7F3D0] hover:bg-[#20452E]"
                                disabled={Boolean(actionLoading)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  resolveConflict(file.path, "ours");
                                }}
                              >
                                Keep Ours
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 border border-[#1e3a5f] bg-[#172554] px-2 text-[11px] text-[#93c5fd] hover:bg-[#1e40af]/30"
                                disabled={Boolean(actionLoading)}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  resolveConflict(file.path, "theirs");
                                }}
                              >
                                Take Theirs
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}

                <div ref={changesSectionRef}>
                <GitSourceControlList
                  stagedFiles={stagedFiles}
                  unstagedFiles={unstagedFiles}
                  canEdit={permissions.canEdit}
                  workingTreeActionKey={workingTreeActionKey}
                  onOpen={openInEditor}
                  onStageFile={(path) =>
                    runWorkingTreeAction({
                      endpoint: "stage",
                      body: { paths: [path] },
                      actionKey: `file:${path}:stage`,
                    })
                  }
                  onUnstageFile={(path) =>
                    runWorkingTreeAction({
                      endpoint: "unstage",
                      body: { paths: [path] },
                      actionKey: `file:${path}:unstage`,
                    })
                  }
                  onDiscardFile={(path) =>
                    runWorkingTreeAction({
                      endpoint: "discard",
                      body: { paths: [path] },
                      actionKey: `file:${path}:discard`,
                      refreshNodes: true,
                    })
                  }
                  onStageAll={() =>
                    runWorkingTreeAction({
                      endpoint: "stage",
                      body: { stageAll: true },
                      actionKey: "bulk:stage-all",
                    })
                  }
                  onUnstageAll={() =>
                    runWorkingTreeAction({
                      endpoint: "unstage",
                      body: { unstageAll: true },
                      actionKey: "bulk:unstage-all",
                    })
                  }
                  onDiscardAllChanges={() =>
                    runWorkingTreeAction({
                      endpoint: "discard",
                      body: { discardAll: true, scope: "changes" },
                      actionKey: "bulk:discard-all-changes",
                      refreshNodes: true,
                    })
                  }
                  onDiscardAllStaged={() =>
                    runWorkingTreeAction({
                      endpoint: "discard",
                      body: { discardAll: true, scope: "staged" },
                      actionKey: "bulk:discard-all-staged",
                      refreshNodes: true,
                    })
                  }
                />
                </div>
            </div>
            </div>
          </>
        ) : (
          renderEmptyState()
        )}
      </aside>

      {repository && permissions.canEdit ? (
        <CreateBranchDialog
          isOpen={isCreateBranchOpen}
          onClose={() => setIsCreateBranchOpen(false)}
          projectId={projectId}
          currentBranch={repository.currentBranch}
          collaboratorCount={collaboratorCount}
          onSuccess={handleBranchCreated}
        />
      ) : null}
    </>
  );
}
