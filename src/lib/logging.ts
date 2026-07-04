import { supabase } from "@/integrations/supabase/client";

export const logAdminAction = async (
  action: string,
  targetId?: string,
  details?: any
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("admin_logs").insert({
      admin_id: user.id,
      action,
      target_id: targetId,
      details,
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
};
