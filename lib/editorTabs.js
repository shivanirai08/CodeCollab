export const GIT_DIFF_TAB_PREFIX = "git-diff:";

export function isGitDiffTabId(tabId) {
  return typeof tabId === "string" && tabId.startsWith(GIT_DIFF_TAB_PREFIX);
}

export function getGitDiffTabId(nodeId) {
  return `${GIT_DIFF_TAB_PREFIX}${nodeId}`;
}

export function getNodeIdFromTabId(tabId) {
  if (!tabId) return null;
  if (isGitDiffTabId(tabId)) {
    return tabId.slice(GIT_DIFF_TAB_PREFIX.length);
  }
  return tabId;
}

export function getNextEditorTabId(editorTabOrder, closedTabId) {
  if (!editorTabOrder.length) return null;
  const index = editorTabOrder.indexOf(closedTabId);
  if (index === -1) return editorTabOrder[0] || null;
  return editorTabOrder[index + 1] || editorTabOrder[index - 1] || null;
}
