import { supabase } from "@/integrations/supabase/client";

/**
 * Permanently deletes a user account: removes any uploaded ID files first
 * (storage rows never cascade), then invokes the server-side RPC which
 * deletes the auth.users row so every child record cascades away.
 * Admin-only: the RPC re-checks has_role(auth.uid(), 'admin').
 */
export async function deleteUserWithFiles(userId: string): Promise<void> {
  try {
    const { data: files } = await supabase.storage
      .from("student-ids")
      .list(userId, { limit: 100 });
    const paths = (files ?? [])
      .filter((f) => f.name)
      .map((f) => `${userId}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from("student-ids").remove(paths);
    }
  } catch (e) {
    // Non-fatal: files must never block account deletion.
    console.warn("Could not clean up user files:", e);
  }

  const { data, error } = await supabase.rpc("admin_delete_user", {
    p_target: userId,
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || "Deletion failed");
}
