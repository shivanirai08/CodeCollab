const DEFAULT_TITLE_BY_ACTION = {
  commit: "Commit failed",
  stage: "Stage failed",
  unstage: "Unstage failed",
  discard: "Discard failed",
  push: "Push failed",
  pull: "Pull failed",
  continue: "Continue failed",
  compare: "Compare failed",
  diff: "Diff failed",
  status: "Git status failed",
  "resolve-conflict": "Resolution failed",
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRawMessage(payload) {
  if (typeof payload === "string") {
    return normalizeText(payload);
  }

  if (!payload || typeof payload !== "object") {
    return "";
  }

  return normalizeText(payload.error || payload.details || payload.message || "");
}

function classifyGitMessage(rawMessage, action, payload = {}) {
  const raw = normalizeText(rawMessage);
  if (!raw) return null;

  const code = payload.code || "";

  if (
    code === "pull-dirty-worktree" ||
    code === "dirty-worktree" ||
    /commit or discard local changes/i.test(raw)
  ) {
    const errorByAction = {
      pull: "Save or discard your edits before pulling.",
      checkout: "Save or discard your edits before switching branches.",
      "create-branch": "Save or discard your edits before creating a branch.",
      push: "Save or discard your edits before pushing.",
    };

    const hintByAction = {
      pull: "Pull reapplies your branch on top of remote changes. Commit or discard local edits first.",
      checkout: "Branch switching requires a clean working tree. Commit, discard, or stash your edits first.",
      "create-branch": "Creating a branch requires a clean working tree. Commit or discard your edits first.",
      push: "Push only sends committed changes. Stage and commit your edits first.",
    };

    return {
      title: "Unsaved changes",
      error: errorByAction[action] || "Save or discard your local edits first.",
      code: code || "dirty-worktree",
      hint: hintByAction[action] || "Commit or discard your local edits, then try again.",
      suggestedAction: "review-changes",
      details: raw,
    };
  }

  if (
    code === "resolve-failed" ||
    code === "resolve-not-conflicted" ||
    /no conflict markers found|malformed conflict marker|failed to resolve conflict/i.test(raw)
  ) {
    return {
      title: "Could not resolve file",
      error: "This file could not be auto-resolved.",
      code: code || "resolve-failed",
      hint: "Open the file in the editor, fix conflict markers manually, then stage the resolved file.",
      suggestedAction: "resolve-conflicts",
      details: raw,
    };
  }

  if (/repository files are not available|repository worktree is missing|worktree is unavailable/i.test(raw)) {
    return {
      title: "Repository unavailable",
      error: "Git files aren't available on this server.",
      code: "repository-worktree-missing",
      hint: "Re-import the repository from GitHub to restore Git sync. Your project files in the editor are still available.",
      suggestedAction: "connect-github",
      details: raw,
    };
  }

  if (
    /non-fast-forward|failed to push some refs|updates were rejected because|tip of your current branch is behind/i.test(
      raw
    )
  ) {
    return {
      title: "Pull required before push",
      error: "Your branch is behind origin.",
      code: "remote-ahead",
      hint: "Pull the latest changes, resolve any conflicts, then push again.",
      suggestedAction: "pull",
      details: raw,
    };
  }

  if (
    code === "merge-conflict" ||
    code === "pull-conflicts" ||
    /automatic merge failed|merge conflict|resolve merge conflicts before/i.test(raw)
  ) {
    return {
      title: "Merge conflicts",
      error: "Resolve conflicted files below before continuing.",
      code: "merge-conflict",
      hint: "Open each conflicted file, pick Keep Ours or Take Theirs, or edit manually. Then commit and push.",
      suggestedAction: "resolve-conflicts",
      details: raw,
    };
  }

  if (/rebase in progress|rebase --continue|currently editing a commit while rebasing/i.test(raw)) {
    return {
      title: "Rebase in progress",
      error: "Finish the in-progress rebase first.",
      code: "rebase-in-progress",
      hint: "Click Finish rebase to complete the pull, then push your commit.",
      suggestedAction: "continue-rebase",
      details: raw,
    };
  }

  if (/github is not connected for this account|authentication failed|permission to .* denied/i.test(raw)) {
    return {
      title: "GitHub authorization required",
      error: "Reconnect GitHub to continue.",
      code: "github-auth-failed",
      hint: "Reconnect your GitHub account and retry this action.",
      suggestedAction: "connect-github",
      details: raw,
    };
  }

  if (action === "push" && /no committed changes to push|everything up[- ]to[- ]date/i.test(raw)) {
    return {
      title: "Nothing to push",
      error: "There are no local commits to push yet.",
      code: "nothing-to-push",
      hint: "Create a commit first, then push.",
      suggestedAction: "commit",
      details: raw,
    };
  }

  return null;
}

export function normalizeGitActionError(payload, action = "git") {
  const fallbackTitle = DEFAULT_TITLE_BY_ACTION[action] || "Git action failed";
  const rawMessage = extractRawMessage(payload);
  const classified = classifyGitMessage(rawMessage, action, payload);

  if (classified) {
    return classified;
  }

  if (!payload || typeof payload !== "object") {
    return {
      title: fallbackTitle,
      error: rawMessage || `Failed to ${action}`,
      code: "git-operation-failed",
      hint: "Try again after refreshing the repository status.",
      suggestedAction: "retry",
      details: rawMessage || null,
    };
  }

  const normalizedError = normalizeText(payload.error || "") || `Failed to ${action}`;

  return {
    title: payload.title || fallbackTitle,
    error: normalizedError,
    code: payload.code || "git-operation-failed",
    hint: payload.hint || "Try again after refreshing the repository status.",
    suggestedAction: payload.suggestedAction || "retry",
    details: payload.details || rawMessage || null,
  };
}

export function createGitErrorResponse(result, status, action) {
  const errorPayload = normalizeGitActionError(result, action);
  return {
    body: {
      error: errorPayload.error,
      title: errorPayload.title,
      code: errorPayload.code,
      hint: errorPayload.hint,
      suggestedAction: errorPayload.suggestedAction,
      details: errorPayload.details,
    },
    status: status || 500,
  };
}

export function isRepositoryUnavailableIssue(issue) {
  if (!issue) {
    return false;
  }

  return (
    issue.code === "repository-worktree-missing" ||
    /repository files are not available|repository worktree is missing|worktree is unavailable/i.test(
      issue.error || issue.details || ""
    )
  );
}

export function getGitSuggestedActionLabel(suggestedAction) {
  switch (suggestedAction) {
    case "pull":
      return "Pull latest";
    case "push":
      return "Push again";
    case "commit":
    case "review-changes":
      return "View changes";
    case "stage":
      return "Stage files";
    case "connect-github":
      return "Reconnect GitHub";
    case "resolve-conflicts":
      return "Open conflicts";
    case "continue-rebase":
      return "Finish rebase";
    case "retry":
      return "Try again";
    default:
      return null;
  }
}
