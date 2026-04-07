export function normalizeNextPath(value, fallback = "/dashboard") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function buildGitHubHeaders(accessToken) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "coding-platform",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function fetchGitHubProfile(accessToken) {
  if (!accessToken) {
    return null;
  }

  const response = await fetch("https://api.github.com/user", {
    headers: buildGitHubHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return {
    id: data.id,
    login: data.login,
    name: data.name,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
    repos_url: data.html_url ? `${data.html_url}?tab=repositories` : null,
    settings_url: "https://github.com/settings/profile",
  };
}

export async function fetchGitHubRepositories(accessToken) {
  if (!accessToken) {
    return [];
  }

  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: buildGitHubHeaders(accessToken),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub repositories.");
  }

  const repos = await response.json();

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description || "No description provided.",
    private: Boolean(repo.private),
    defaultBranch: repo.default_branch,
    htmlUrl: repo.html_url,
    updatedAt: repo.updated_at,
    owner: repo.owner?.login || null,
  }));
}
