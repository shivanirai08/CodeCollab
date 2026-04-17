"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import GitHubImportModal from "@/components/ui/GitHubImportModal";
import {
  getGitSuggestedActionLabel,
  normalizeGitActionError,
} from "@/lib/gitActionErrors";
import { fetchGitStatus, fetchProject } from "@/store/ProjectSlice";
import { fetchFileContent, fetchNodes, setActiveFile } from "@/store/NodesSlice";
import {
  ArrowUp,
  Check,
  Download,
  FileCode2,
  FolderGit2,
  GitBranch,
  Github,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 960;

function normalizeNodePath(path) {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
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

// CONFLICT_MARKER_RE matches the three git conflict marker lines:
//   <<<<<<< HEAD (or <<<<<<< branch-name)
//   =======
//   >>>>>>> incoming-branch
const CONFLICT_MARKER_RE = /^(<{7}|={7}|>{7})(\s.*)?$/;

/**
 * parseConflictContent(rawText)
 * Used when the file is unmerged.  The backend returns the working-tree file
 * directly (no unified-diff header).  We walk every line and tag it:
 *   conflict-ours-header   – the <<<<<<< line
 *   conflict-ours          – "Current Change" section (between <<<< and ====)
 *   conflict-separator     – the ======= line
 *   conflict-theirs        – "Incoming Change" section (between ==== and >>>>)
 *   conflict-theirs-header – the >>>>>>> line
 *   context                – everything outside a conflict block
 */
function parseConflictContent(rawText) {
  const lines = String(rawText || "").split("\n");
  const output = [];
  let section = null; // null | "ours" | "theirs"

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("<<<<<<<")) {
      section = "ours";
      output.push({ type: "conflict-ours-header", text: line, lineNo: i + 1 });
      continue;
    }
    if (line.startsWith("=======")) {
      section = "theirs";
      output.push({ type: "conflict-separator", text: line, lineNo: i + 1 });
      continue;
    }
    if (line.startsWith(">>>>>>>")) {
      section = null;
      output.push({ type: "conflict-theirs-header", text: line, lineNo: i + 1 });
      continue;
    }
    if (section === "ours") {
      output.push({ type: "conflict-ours", text: line, lineNo: i + 1 });
      continue;
    }
    if (section === "theirs") {
      output.push({ type: "conflict-theirs", text: line, lineNo: i + 1 });
      continue;
    }
    output.push({ type: "context", oldLine: i + 1, newLine: i + 1, text: line });
  }

  return output;
}

/**
 * parseUnifiedDiff(diffText)
 * Standard unified-diff parser.  When conflict-marker lines happen to appear
 * inside the diff (e.g. in context lines), we preserve them with their
 * conflict type so the viewer can style them correctly.
 */
function parseUnifiedDiff(diffText) {
  const lines = String(diffText || "").split("\n");
  const output = [];
  let oldLine = 0;
  let newLine = 0;
  let conflictSection = null;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      const match = line.match(/^@@\s-\s*(\d+)(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/);
      if (match) {
        oldLine = Number(match[1]);
        newLine = Number(match[2]);
      }
      // A hunk header resets any in-progress conflict tracking.
      conflictSection = null;
      output.push({ type: "hunk", text: line });
      continue;
    }

    if (
      line.startsWith("diff --git") ||
      line.startsWith("index ") ||
      line.startsWith("--- ") ||
      line.startsWith("+++ ") ||
      line.startsWith("new file mode")
    ) {
      continue;
    }

    // Strip the leading diff prefix (+/-/ ) before testing for markers
    const bare = line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")
      ? line.slice(1)
      : line;

    if (bare.startsWith("<<<<<<<")) {
      conflictSection = "ours";
      output.push({ type: "conflict-ours-header", text: bare, oldLine, newLine });
      if (!line.startsWith("-")) newLine += 1;
      if (!line.startsWith("+")) oldLine += 1;
      continue;
    }
    if (bare.startsWith("=======") && conflictSection) {
      conflictSection = "theirs";
      output.push({ type: "conflict-separator", text: bare, oldLine, newLine });
      if (!line.startsWith("-")) newLine += 1;
      if (!line.startsWith("+")) oldLine += 1;
      continue;
    }
    if (bare.startsWith(">>>>>>>") && conflictSection) {
      conflictSection = null;
      output.push({ type: "conflict-theirs-header", text: bare, oldLine, newLine });
      if (!line.startsWith("-")) newLine += 1;
      if (!line.startsWith("+")) oldLine += 1;
      continue;
    }

    const conflictOverride =
      conflictSection === "ours" ? "conflict-ours" :
      conflictSection === "theirs" ? "conflict-theirs" :
      null;

    if (line.startsWith("+")) {
      output.push({ type: conflictOverride || "add", oldLine: null, newLine, text: line.slice(1) });
      newLine += 1;
      continue;
    }

    if (line.startsWith("-")) {
      output.push({ type: conflictOverride || "remove", oldLine, newLine: null, text: line.slice(1) });
      oldLine += 1;
      continue;
    }

    output.push({
      type: conflictOverride || "context",
      oldLine,
      newLine,
      text: line.startsWith(" ") ? line.slice(1) : line,
    });
    oldLine += 1;
    newLine += 1;
  }

  return output;
}

export default function GitPanel({
  projectId,
  isOpen,
  onClose,
}) {
  const dispatch = useDispatch();
  const repository = useSelector((state) => state.project.repository);
  const permissions = useSelector((state) => state.project.permissions);
  const gitStatus = useSelector((state) => state.project.gitStatus);
  const gitStatusLoading = useSelector((state) => state.project.gitStatusLoading);
  const nodes = useSelector((state) => state.nodes.nodes || []);
  const fileContents = useSelector((state) => state.nodes.fileContents || {});

  const [commitMessage, setCommitMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [panelWidth, setPanelWidth] = useState(520);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedPath, setSelectedPath] = useState(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffText, setDiffText] = useState("");
  const [isDiffConflicted, setIsDiffConflicted] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubConnected, setGithubConnected] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState(null);
  const [isImportingRepo, setIsImportingRepo] = useState(false);
  const [showFlowInfo, setShowFlowInfo] = useState(false);
  const [gitIssue, setGitIssue] = useState(null);

  const files = useMemo(() => gitStatus?.files || [], [gitStatus]);
  const conflictFiles = files.filter((file) => file.status === "conflicted");
  const stagedFiles = files.filter((file) => file.staged);
  const unstagedFiles = files.filter(
    (file) => (file.unstaged || !file.staged) && file.status !== "conflicted"
  );
  const hasDirtyChanges = files.length > 0;
  const hasConflicts = Boolean(gitStatus?.hasConflicts);
  const hasStagedChanges = stagedFiles.length > 0;
  const hasCommitMessage = Boolean(commitMessage.trim());
  const canCommit = hasStagedChanges && hasCommitMessage && !hasConflicts && !actionLoading;
  const canPush = !actionLoading && !hasConflicts && !hasDirtyChanges && (gitStatus?.ahead || 0) > 0;
  const canPull = !actionLoading && !hasConflicts && !hasDirtyChanges;
  const nodePathIndex = useMemo(() => buildNodePathIndex(nodes), [nodes]);
  const selectedFile = selectedPath ? files.find((file) => file.path === selectedPath) || null : null;
  const parsedDiff = useMemo(
    () => isDiffConflicted ? parseConflictContent(diffText) : parseUnifiedDiff(diffText),
    [diffText, isDiffConflicted]
  );
  const selectedRepo = githubRepos.find((repo) => repo.id === selectedRepoId) || null;
  const gitIssueActionLabel = gitIssue
    ? getGitSuggestedActionLabel(gitIssue.suggestedAction)
    : null;

  useEffect(() => {
    if (!isOpen) return;

    if (!files.length) {
      setSelectedPath(null);
      setDiffText("");
      return;
    }

    if (!selectedPath || !files.some((file) => file.path === selectedPath)) {
      setSelectedPath(files[0].path);
    }
  }, [isOpen, files, selectedPath]);

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
    if (!isOpen || !selectedPath || !repository) return;
    let cancelled = false;

    const loadDiff = async () => {
      setDiffLoading(true);
      try {
        const response = await fetch(
          `/api/project/${projectId}/git/diff?path=${encodeURIComponent(selectedPath)}`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          }
        );
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(result.error || "Failed to load diff");
        }

        if (!cancelled) {
          setDiffText(result.diff || "");
          setIsDiffConflicted(Boolean(result.isConflicted));
        }
      } catch (error) {
        if (!cancelled) {
          setDiffText("");
          setIsDiffConflicted(false);
          toast.error(error.message || "Failed to load diff");
        }
      } finally {
        if (!cancelled) {
          setDiffLoading(false);
        }
      }
    };

    loadDiff();

    return () => {
      cancelled = true;
    };
  }, [isOpen, projectId, repository, selectedPath]);

  useEffect(() => {
    if (isResizing) {
      const onMouseMove = (event) => {
        const nextWidth = window.innerWidth - event.clientX;
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

    if (issue.suggestedAction === "pull" && canPull) {
      await runAction("pull", "pull");
      return;
    }

    if (issue.suggestedAction === "connect-github") {
      handleConnectGitHub();
      return;
    }

    if (issue.suggestedAction === "resolve-conflicts") {
      if (!conflictFiles.length) {
        toast.info("No conflicted files are currently detected.");
        return;
      }

      const firstConflict = conflictFiles[0];
      setSelectedPath(firstConflict.path);
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
    const issueActionLabel = getGitSuggestedActionLabel(issue.suggestedAction);

    setGitIssue(issue);

    toast.error(issue.title, {
      description: issue.hint ? `${issue.error} ${issue.hint}` : issue.error,
      action: issueActionLabel
        ? {
            label: issueActionLabel,
            onClick: () => triggerGitIssueAction(issue),
          }
        : undefined,
    });

    if (issue.details) {
      console.error(`${issue.title}:`, issue.details);
    }
  };

  const runAction = async (action, endpoint, body = {}) => {
    setActionLoading(action);
    try {
      const response = await fetch(`/api/project/${projectId}/git/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(endpoint === "commit" ? { message: commitMessage.trim() } : body),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        presentGitIssue(result, endpoint);
        return;
      }

      setGitIssue(null);

      if (endpoint === "pull") {
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

    dispatch(setActiveFile(nodeId));

    if (!fileContents[nodeId]) {
      await dispatch(fetchFileContent(nodeId));
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
      <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[92vw] flex-col border-l border-[#2A2A30] bg-[#0E0E12] text-[#E6E6EC] shadow-2xl lg:relative lg:inset-auto lg:z-auto lg:max-w-none lg:rounded-sm lg:border"
        style={{ width: repository ? `${panelWidth}px` : "min(100vw, 520px)" }}
      >
        {repository ? (
          <>
            <button
              type="button"
              aria-label="Resize source control panel"
              className="absolute left-0 top-0 hidden h-full w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-[#9CA3AF]/30 lg:block"
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
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[#24242A] bg-[#121218] p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#7C8392]">Review</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{files.length}</div>
                  <div className="text-xs text-[#8B909A]">changed files</div>
                </div>
                <div className="rounded-xl border border-[#24242A] bg-[#121218] p-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[#7C8392]">Ship</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{gitStatus?.ahead || 0}</div>
                  <div className="text-xs text-[#8B909A]">commits ready to push</div>
                </div>
              </div>

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
                <div className="mt-3 rounded-2xl border border-[#4B242C] bg-[#231216] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#FDE2E4]">{gitIssue.title}</p>
                      <p className="mt-1 text-sm text-[#F6BCC4]">{gitIssue.error}</p>
                      {gitIssue.hint ? (
                        <p className="mt-2 text-xs leading-5 text-[#E7A1AB]">{gitIssue.hint}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {gitIssueActionLabel ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 border border-[#6B2F3A] bg-[#30181D] px-3 text-[#FFE2E7] hover:bg-[#3A1D24] hover:text-white"
                          onClick={() => triggerGitIssueAction(gitIssue)}
                          disabled={Boolean(actionLoading) || (gitIssue.suggestedAction === "pull" && !canPull)}
                        >
                          {gitIssueActionLabel}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-[#D9A7AF] hover:bg-[#30181D] hover:text-white"
                        onClick={() => setGitIssue(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[240px_1fr]">
              <div className="min-h-0 overflow-y-auto border-b border-[#24242A] xl:border-b-0 xl:border-r">
                {conflictFiles.length > 0 ? (
                  <>
                    <div className="px-3 pt-3 flex items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-[#F08A95]">
                        Merge Conflicts {conflictFiles.length}
                      </span>
                    </div>
                    <div className="mx-3 my-2 rounded-lg border border-[#4B242C] bg-[#1A0C10] px-3 py-2 text-[11px] text-[#E7A1AB]">
                      Fix each file below, then stage and commit to continue.
                    </div>
                    <div className="mt-1">
                      {conflictFiles.map((file) => {
                        const conflictLabel = {
                          "both-modified":   "Both modified",
                          "both-added":      "Both added",
                          "both-deleted":    "Both deleted",
                          "added-by-us":     "Added by us",
                          "added-by-them":   "Added by them",
                          "deleted-by-us":   "Deleted by us",
                          "deleted-by-them": "Deleted by them",
                          "unmerged":        "Unmerged",
                        }[file.conflictType] || "Conflict";

                        return (
                        <div
                          key={`conflict-${file.path}`}
                          onClick={() => setSelectedPath(file.path)}
                          className={`group flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                            selectedPath === file.path ? "bg-[#2A161B]" : "hover:bg-[#1F1418]"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="text-[#FB7185]">⚠</span>
                            <span className="truncate text-[#F9CFD6]">{file.path}</span>
                            <span className="shrink-0 rounded bg-[#3D1820] px-1.5 py-0.5 text-[10px] text-[#FCA5A5]">
                              {conflictLabel}
                            </span>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-1.5 text-[#D4A5AE] hover:bg-[#3A1D24] hover:text-white"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await openInEditor(file.path);
                            }}
                          >
                            Open
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                <div className="px-3 pt-3 text-[11px] uppercase tracking-[0.14em] text-[#6B7280]">
                  Staged {stagedFiles.length}
                </div>
                <div className="mt-1">
                  {stagedFiles.map((file) => (
                    <div
                      key={`staged-${file.path}`}
                      onClick={() => setSelectedPath(file.path)}
                      className={`group flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                        selectedPath === file.path ? "bg-[#1B1B22]" : "hover:bg-[#17171D]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-[#34D399]">M</span>
                        <span className="truncate">{file.path}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1.5 text-[#7C8392] hover:bg-[#22222A] hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          runAction("unstage-file", "unstage", { paths: [file.path] });
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 px-3 text-[11px] uppercase tracking-[0.14em] text-[#6B7280]">
                  Changes {unstagedFiles.length}
                </div>
                <div className="mt-1 pb-3">
                  {unstagedFiles.map((file) => (
                    <div
                      key={`unstaged-${file.path}`}
                      onClick={() => setSelectedPath(file.path)}
                      className={`group flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
                        selectedPath === file.path ? "bg-[#1B1B22]" : "hover:bg-[#17171D]"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileCode2 className="size-3.5 text-[#7C8392]" />
                        <span className="truncate">{file.path}</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1.5 text-[#7C8392] hover:bg-[#22222A] hover:text-white"
                        onClick={(event) => {
                          event.stopPropagation();
                          runAction("stage-file", "stage", { paths: [file.path] });
                        }}
                        disabled={file.status === "conflicted"}
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#24242A] bg-[#0E0E12]/95 px-4 py-3 backdrop-blur">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#C7CBD4]">
                      {selectedPath || "Diff Preview"}
                    </p>
                    <p className="text-xs text-[#8B909A]">
                      {isDiffConflicted
                        ? "Merge conflict — open in editor, fix markers, then stage and commit."
                        : selectedPath
                        ? "Review changes before staging or shipping."
                        : "Select a changed file to inspect its diff."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDiffConflicted && selectedFile ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 border border-[#4B2A18] bg-[#2A1800] px-2 text-xs text-[#FDBA74] hover:bg-[#3A2000] hover:text-white"
                        onClick={() => openInEditor(selectedFile.path)}
                      >
                        Open to resolve
                      </Button>
                    ) : selectedFile ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#A3A8B3] hover:bg-[#1A1A20] hover:text-white"
                        onClick={() => openInEditor(selectedFile.path)}
                      >
                        View Editor
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="px-0 py-1 font-mono text-xs leading-5">
                  {diffLoading ? (
                    <div className="px-4 py-4 text-[#7C8392]">Loading diff...</div>
                  ) : !selectedPath ? (
                    <div className="px-4 py-4 text-[#7C8392]">Select a file</div>
                  ) : !parsedDiff.length ? (
                    <div className="px-4 py-4 text-[#7C8392]">No diff available</div>
                  ) : (
                    parsedDiff.map((line, index) => {
                      // ── Hunk header (unified diff only)
                      if (line.type === "hunk") {
                        return (
                          <div key={`hunk-${index}`} className="border-b border-[#212127] bg-[#121218] px-4 py-1 text-[#60A5FA]">
                            {line.text}
                          </div>
                        );
                      }

                      // ── Conflict section headers (<<<<<<< / ======= / >>>>>>>)
                      if (line.type === "conflict-ours-header") {
                        return (
                          <div key={`co-h-${index}`} className="border-l-[3px] border-[#3B82F6] bg-[#0A1628] px-4 py-1 font-semibold text-[#60A5FA]">
                            {line.text}
                            <span className="ml-2 rounded bg-[#1D3A6A] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#93C5FD]">Current Change</span>
                          </div>
                        );
                      }
                      if (line.type === "conflict-separator") {
                        return (
                          <div key={`cs-${index}`} className="bg-[#151520] px-4 py-1 font-semibold text-[#A78BFA]">
                            {line.text}
                          </div>
                        );
                      }
                      if (line.type === "conflict-theirs-header") {
                        return (
                          <div key={`ct-h-${index}`} className="border-l-[3px] border-[#F97316] bg-[#1A0A00] px-4 py-1 font-semibold text-[#FDBA74]">
                            {line.text}
                            <span className="ml-2 rounded bg-[#451F00] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#FCD34D]">Incoming Change</span>
                          </div>
                        );
                      }

                      // ── Conflict content lines
                      if (line.type === "conflict-ours") {
                        return (
                          <div key={`co-${index}`} className="grid grid-cols-[60px_1fr] border-l-[3px] border-[#2563EB] bg-[#0D1B30] px-2">
                            <span className="px-2 text-[#4B6EA8]">{line.lineNo || ""}</span>
                            <span className="whitespace-pre-wrap break-words px-2 text-[#BFDBFE]">{line.text}</span>
                          </div>
                        );
                      }
                      if (line.type === "conflict-theirs") {
                        return (
                          <div key={`ct-${index}`} className="grid grid-cols-[60px_1fr] border-l-[3px] border-[#C2410C] bg-[#1A0D00] px-2">
                            <span className="px-2 text-[#8B4513]">{line.lineNo || ""}</span>
                            <span className="whitespace-pre-wrap break-words px-2 text-[#FED7AA]">{line.text}</span>
                          </div>
                        );
                      }

                      // ── Regular diff lines
                      const tone =
                        line.type === "add"
                          ? "bg-[#0D2419] text-[#9AE6B4]"
                          : line.type === "remove"
                          ? "bg-[#2A1216] text-[#FCA5A5]"
                          : "text-[#AEB4BE]";

                      return (
                        <div key={`line-${index}`} className={`grid grid-cols-[60px_60px_1fr] px-2 ${tone}`}>
                          <span className="px-2 text-[#6B7280]">{line.oldLine || ""}</span>
                          <span className="px-2 text-[#6B7280]">{line.newLine || ""}</span>
                          <span className="whitespace-pre-wrap break-words px-2">{line.text}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          renderEmptyState()
        )}
      </aside>
    </>
  );
}
