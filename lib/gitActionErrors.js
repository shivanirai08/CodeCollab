const DEFAULT_TITLE_BY_ACTION = {
  commit: "Commit failed",
  stage: "Stage failed",
  unstage: "Unstage failed",
  push: "Push failed",
  pull: "Pull failed",
  diff: "Diff failed",
  status: "Git status failed",
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

function classifyGitMessage(rawMessage, action) {
  const raw = normalizeText(rawMessage);
  if (!raw) return null;

  if (
    /non-fast-forward|failed to push some refs|updates were rejected because|tip of your current branch is behind/i.test(
      raw
    )
  ) {
    return {
      title: "Can't push: pull required",
      error: "Your branch is behind origin. Pull the latest changes first.",
      code: "remote-ahead",
      hint: "Use Pull in this panel, review incoming changes, resolve any conflicts, then push again.",
      suggestedAction: "pull",
      details: raw,
    };
  }

  if (/conflict|automatic merge failed|could not apply|merge conflict/i.test(raw)) {
    return {
      title: "Merge conflicts detected",
      error: "Git cannot continue until merge conflicts are resolved.",
      code: "merge-conflict",
      hint: "Open the Merge Conflicts section below, fix each conflicted file, then commit and push.",
      suggestedAction: "resolve-conflicts",
      details: raw,
    };
  }

  if (/github is not connected for this account|authentication failed|permission to .* denied/i.test(raw)) {
    return {
      title: "GitHub authorization required",
      error: "Your GitHub account needs to be connected again before this action can continue.",
      code: "github-auth-failed",
      hint: "Reconnect GitHub and retry.",
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
  const classified = classifyGitMessage(rawMessage, action);

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

export function getGitSuggestedActionLabel(suggestedAction) {
  switch (suggestedAction) {
    case "pull":
      return "Pull latest";
    case "push":
      return "Push again";
    case "commit":
      return "Review local changes";
    case "stage":
      return "Stage files";
    case "connect-github":
      return "Reconnect GitHub";
    case "resolve-conflicts":
      return "Open merge conflicts";
    case "retry":
      return "Try again";
    default:
      return null;
  }
}