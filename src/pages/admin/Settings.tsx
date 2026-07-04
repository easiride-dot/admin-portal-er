import { useState, useEffect } from "react";
import { Users, UserPlus, Loader2, Save, Trash2, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/logging";

export const Settings = () => {
  const [userCount, setUserCount] = useState<number>(0);
  const [maxUsers, setMaxUsers] = useState<string>("100");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitlist, setWaitlist] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: countData } = await supabase.rpc("get_user_count");
      if (countData !== null) setUserCount(countData);

      const { data: settings } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_name", "max_users")
        .single();

      if (settings) setMaxUsers(settings.setting_value);

      const { data: waitlistData } = await supabase
        .from("waitlist")
        .select("*")
        .order("created_at", { ascending: false });

      if (waitlistData) setWaitlist(waitlistData);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveMaxUsers = async () => {
    const value = parseInt(maxUsers, 10);
    if (isNaN(value) || value < 1) {
      toast.error("Enter a valid number");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { setting_name: "max_users", setting_value: String(value) },
          { onConflict: "setting_name" }
        );

      if (error) throw error;
      await logAdminAction("update_settings", undefined, { max_users: value });
      toast.success(`Max users set to ${value}`);
    } catch (error) {
      toast.error("Failed to save");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const removeFromWaitlist = async (id: string) => {
    try {
      const { error } = await supabase.from("waitlist").delete().eq("id", id);
      if (error) throw error;
      setWaitlist((prev) => prev.filter((w) => w.id !== id));
      await logAdminAction("remove_waitlist", id);
      toast.success("Removed from waitlist");
    } catch (error) {
      toast.error("Failed to remove");
      console.error(error);
    }
  };

  const atCapacity = userCount >= parseInt(maxUsers, 10);
  const remaining = Math.max(0, parseInt(maxUsers, 10) - userCount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage app access and capacity</p>
      </div>

      {/* Capacity card */}
      <div className="glass-card rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> User Capacity
        </h2>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-secondary/30 p-4 text-center">
            <p className="text-2xl font-bold">{userCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Registered</p>
          </div>
          <div className="rounded-2xl bg-secondary/30 p-4 text-center">
            <p className={`text-2xl font-bold ${atCapacity ? "text-destructive" : "text-emerald-500"}`}>
              {remaining}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Remaining</p>
          </div>
          <div className="rounded-2xl bg-secondary/30 p-4 text-center">
            <p className="text-2xl font-bold">{maxUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Max Allowed</p>
          </div>
        </div>

        {atCapacity && (
          <div className="mt-4 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 text-sm">
            The app is at capacity. New signups will be directed to the waitlist.
          </div>
        )}

        <div className="mt-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Users</label>
            <Input
              type="number"
              min="1"
              value={maxUsers}
              onChange={(e) => setMaxUsers(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button onClick={saveMaxUsers} disabled={saving} className="rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Waitlist */}
      <div className="glass-card rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <UserPlus className="h-5 w-5" /> Waitlist ({waitlist.length})
        </h2>

        {waitlist.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No one on the waitlist.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {waitlist.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-secondary/20 p-4">
                <div>
                  <p className="font-medium">{entry.full_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Joined {new Date(entry.created_at).toLocaleDateString()}
                    {entry.notified && <span className="ml-2 text-emerald-500">Notified</span>}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => removeFromWaitlist(entry.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
