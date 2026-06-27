export function normalizeGitNodePath(path) {
  return String(path || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

export function getConflictFilesFromGitStatus(gitStatus) {
  const files = gitStatus?.files || [];
  const fromFiles = files.filter((file) => file.status === "conflicted");
  const knownPaths = new Set(
    fromFiles.map((file) => normalizeGitNodePath(file.path))
  );

  const extras = (gitStatus?.conflictedPaths || [])
    .map((path) => normalizeGitNodePath(path))
    .filter((path) => path && !knownPaths.has(path))
    .map((path) => ({
      path,
      status: "conflicted",
      conflictType: "unmerged",
      staged: false,
      unstaged: false,
    }));

  return [...fromFiles, ...extras];
}

export function isPathConflicted(gitStatus, filePath) {
  const normalizedPath = normalizeGitNodePath(filePath);
  if (!normalizedPath || !gitStatus) {
    return false;
  }

  return getConflictFilesFromGitStatus(gitStatus).some(
    (file) => normalizeGitNodePath(file.path) === normalizedPath
  );
}
