import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const MAX_USERNAME_LENGTH = 15;

function sanitizeUsername(value) {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) return "user";
  return normalized.slice(0, MAX_USERNAME_LENGTH);
}

function buildUsernameBase(user) {
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === "google"
  );

  const googleName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    googleIdentity?.identity_data?.full_name ||
    googleIdentity?.identity_data?.name ||
    user?.email?.split("@")[0] ||
    "user";

  return sanitizeUsername(googleName);
}

async function getUniqueUsername(supabaseAdmin, baseUsername, currentUserId) {
  const root = sanitizeUsername(baseUsername) || "user";

  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const suffixText = suffix === 0 ? "" : String(suffix);
    const trimmedRoot = root.slice(0, MAX_USERNAME_LENGTH - suffixText.length) || "user";
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

  return `user_${currentUserId.replace(/-/g, "").slice(0, 6)}`.slice(0, MAX_USERNAME_LENGTH);
}

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!userError && user) {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const username = await getUniqueUsername(
        supabaseAdmin,
        buildUsernameBase(user),
        user.id
      );

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        user.identities?.find((identity) => identity.provider === "google")
          ?.identity_data?.avatar_url ||
        user.identities?.find((identity) => identity.provider === "google")
          ?.identity_data?.picture ||
        null;

      const payload = {
        id: user.id,
        email: user.email,
        username,
        avatar_url: avatarUrl,
      };

      const { data: existingRow, error: existingRowError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (existingRowError) {
        throw existingRowError;
      }

      if (existingRow) {
        const { error: updateError } = await supabaseAdmin
          .from("users")
          .update(payload)
          .eq("id", user.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("users")
          .insert(payload);

        if (insertError) {
          throw insertError;
        }
      }
    }
  } catch (syncError) {
    console.error("Google OAuth user sync failed:", syncError);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
