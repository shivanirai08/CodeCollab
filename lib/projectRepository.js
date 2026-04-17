import { createAdminClient } from "@/lib/supabase/admin";

const backendUrl =
  process.env.CODECOLLAB_BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

export function getInternalBackendHeaders() {
  const headers = {
    "Content-Type": "application/json",
  };

  if (process.env.CODECOLLAB_INTERNAL_SECRET) {
    headers["x-codecollab-internal-secret"] = process.env.CODECOLLAB_INTERNAL_SECRET;
  }

  return headers;
}

export async function getProjectRepository(projectId) {
  if (!projectId) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("project_repositories")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load project repository");
  }

  return data || null;
}

export async function fetchProjectNodes(projectId) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("nodes")
    .select("id, parent_id, name, type, project_id")
    .eq("project_id", projectId);

  if (error) {
    throw new Error(error.message || "Failed to load project nodes");
  }

  return data || [];
}

export function buildNodePathMap(nodes) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const cache = new Map();

  const resolvePath = (nodeId) => {
    if (!nodeId) return "";
    if (cache.has(nodeId)) return cache.get(nodeId);

    const node = byId.get(nodeId);
    if (!node) {
      throw new Error("Node not found while resolving path.");
    }

    const parentPath = node.parent_id ? resolvePath(node.parent_id) : "";
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;
    cache.set(nodeId, currentPath);
    return currentPath;
  };

  nodes.forEach((node) => resolvePath(node.id));
  return cache;
}

export async function syncProjectWorktree(projectId, operation) {
  const repository = await getProjectRepository(projectId);
  if (!repository?.is_connected) {
    return { synced: false, repository: null };
  }

  const response = await fetch(`${backendUrl}/projects/${projectId}/worktree/sync`, {
    method: "POST",
    headers: getInternalBackendHeaders(),
    body: JSON.stringify(operation),
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || "Failed to sync project worktree");
  }

  return { synced: true, repository };
}

export function normalizeRepository(repository) {
  if (!repository) return null;

  return {
    id: repository.id,
    provider: repository.provider,
    githubRepoId: repository.github_repo_id,
    repoName: repository.repo_name,
    repoFullName: repository.repo_full_name,
    repoUrl: repository.repo_url,
    cloneUrl: repository.clone_url,
    defaultBranch: repository.default_branch,
    currentBranch: repository.current_branch,
    isPrivate: Boolean(repository.is_private),
    isConnected: Boolean(repository.is_connected),
    lastSyncedAt: repository.last_synced_at,
    lastPulledAt: repository.last_pulled_at,
    lastPushedAt: repository.last_pushed_at,
    lastCommitSha: repository.last_commit_sha,
    installStatus: repository.install_status,
    syncState: repository.sync_state,
    syncError: repository.sync_error,
    remoteHeadSha: repository.remote_head_sha,
  };
}
