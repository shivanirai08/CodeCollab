import { createAdminClient } from "@/lib/supabase/admin";

export async function createNotification({
  userId,
  type,
  title,
  message = "",
  metadata = {},
}) {
  if (!userId || !type || !title) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      message,
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return null;
  }

  return data;
}
