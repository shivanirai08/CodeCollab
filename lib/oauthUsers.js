import { createAdminClient } from "@/lib/supabase/admin";

const MAX_USERNAME_LENGTH = 15;

export function sanitizeUsername(value) {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) return "user";
  return normalized.slice(0, MAX_USERNAME_LENGTH);
}

export function buildUsernameBase(user) {
  const githubIdentity = user?.identities?.find(
    (identity) => identity.provider === "github"
  );
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === "google"
  );

  const baseName =
    user?.user_metadata?.user_name ||
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.login ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    githubIdentity?.identity_data?.user_name ||
    githubIdentity?.identity_data?.preferred_username ||
    githubIdentity?.identity_data?.login ||
    githubIdentity?.identity_data?.full_name ||
    githubIdentity?.identity_data?.name ||
    googleIdentity?.identity_data?.full_name ||
    googleIdentity?.identity_data?.name ||
    user?.email?.split("@")[0] ||
    "user";

  return sanitizeUsername(baseName);
}

export function extractAvatarUrl(user) {
  const githubIdentity = user?.identities?.find(
    (identity) => identity.provider === "github"
  );
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === "google"
  );

  return (
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    githubIdentity?.identity_data?.avatar_url ||
    githubIdentity?.identity_data?.picture ||
    googleIdentity?.identity_data?.avatar_url ||
    googleIdentity?.identity_data?.picture ||
    null
  );
}

export async function getUniqueUsername(supabaseAdmin, baseUsername, currentUserId) {
  const root = sanitizeUsername(baseUsername) || "user";

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const suffixText = suffix === 0 ? "" : String(suffix);
    const trimmedRoot =
      root.slice(0, MAX_USERNAME_LENGTH - suffixText.length) || "user";
    const candidate = `${trimmedRoot}${suffixText}`;

    const { data: existingUser, error } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("username", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!existingUser || existingUser.id === currentUserId) {
      return candidate;
    }
  }

  return `user_${currentUserId.replace(/-/g, "").slice(0, 6)}`.slice(
    0,
    MAX_USERNAME_LENGTH
  );
}

export async function syncOAuthUser(user, options = {}) {
  const { githubToken = null } = options;

  const supabaseAdmin = createAdminClient();
  const { data: existingRow, error: existingRowError } = await supabaseAdmin
    .from("users")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();

  if (existingRowError) {
    throw existingRowError;
  }

  const username =
    existingRow?.username ||
    (await getUniqueUsername(supabaseAdmin, buildUsernameBase(user), user.id));

  const payload = {
    id: user.id,
    email: user.email,
    username,
    avatar_url: extractAvatarUrl(user),
  };

  if (githubToken) {
    payload.github_token = githubToken;
  }

  const query = existingRow
    ? supabaseAdmin.from("users").update(payload).eq("id", user.id)
    : supabaseAdmin.from("users").insert(payload);

  const { error } = await query;

  if (error) {
    throw error;
  }

  return payload;
}
