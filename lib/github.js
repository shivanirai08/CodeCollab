export function normalizeNextPath(value, fallback = "/dashboard") {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export async function fetchGitHubProfile(accessToken) {
  if (!accessToken) {
    return null;
  }

  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "coding-platform",
      "X-GitHub-Api-Version": "2022-11-28",
    },
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
