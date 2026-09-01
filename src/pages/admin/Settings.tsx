import { useState, useEffect } from "react";
import { Users, UserPlus, Loader2, Save, Trash2, Bell, Plus, MessageSquare, Phone, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/logging";

interface EmergencyContact {
  label: string;
  number: string;
}

export const Settings = () => {
  const [userCount, setUserCount] = useState<number>(0);
  const [maxUsers, setMaxUsers] = useState<string>("100");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [waitlist, setWaitlist] = useState<any[]>([]);

  // Support & Emergency state
  const [supportPhone, setSupportPhone] = useState<string>("");
  const [supportWhatsapp, setSupportWhatsapp] = useState<string>("");
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    { label: "Police", number: "119" },
    { label: "Ambulance", number: "112" },
    { label: "Fire", number: "119" },
  ]);
  const [savingEmergency, setSavingEmergency] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: countData } = await supabase.rpc("get_user_count");
      if (countData !== null) setUserCount(countData);

      const { data: settings } = await supabase
        .from("app_settings")
        .select("setting_name, setting_value")
        .in("setting_name", ["max_users", "support_phone", "support_whatsapp", "emergency_contacts"]);

      if (settings) {
        for (const row of settings) {
          switch (row.setting_name) {
            case "max_users":
              setMaxUsers(row.setting_value);
              break;
            case "support_phone":
              setSupportPhone(row.setting_value);
              break;
            case "support_whatsapp":
              setSupportWhatsapp(row.setting_value);
              break;
            case "emergency_contacts":
              try {
                setEmergencyContacts(JSON.parse(row.setting_value));
              } catch {
                // keep defaults
              }
              break;
          }
        }
      }

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

  const saveEmergencySettings = async () => {
    setSavingEmergency(true);
    try {
      const updates = [
        { setting_name: "support_phone", setting_value: supportPhone },
        { setting_name: "support_whatsapp", setting_value: supportWhatsapp },
        { setting_name: "emergency_contacts", setting_value: JSON.stringify(emergencyContacts) },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "setting_name" });
        if (error) throw error;
      }

      await logAdminAction("update_emergency_settings", undefined, {
        support_phone: supportPhone,
        support_whatsapp: supportWhatsapp,
        emergency_contacts: emergencyContacts,
      });
      toast.success("Support & Emergency settings saved");
    } catch (error) {
      toast.error("Failed to save");
      console.error(error);
    } finally {
      setSavingEmergency(false);
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

  const addEmergencyContact = () => {
    setEmergencyContacts((prev) => [...prev, { label: "", number: "" }]);
  };

  const updateEmergencyContact = (index: number, field: "label" | "number", value: string) => {
    setEmergencyContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== index));
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
        <p className="text-muted-foreground mt-1">Manage app access, capacity, and support configuration</p>
      </div>

      {/* Capacity card */}
      <div className="glass-card rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> User Capacity
        </h2>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Support & Emergency Contacts */}
      <div className="glass-card rounded-3xl p-6">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" /> Support & Emergency Contacts
        </h2>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Support Phone</label>
              <Input
                type="tel"
                placeholder="+23272804884"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Support WhatsApp</label>
              <Input
                type="tel"
                placeholder="+23272804884"
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-muted-foreground">Emergency Contacts</label>
              <Button variant="ghost" size="sm" onClick={addEmergencyContact} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Contact
              </Button>
            </div>
            <div className="space-y-2">
              {emergencyContacts.map((contact, index) => (
                <div key={index} className="flex items-center gap-2 rounded-xl bg-secondary/20 p-3">
                  <Input
                    type="text"
                    placeholder="Label (e.g., Police)"
                    value={contact.label}
                    onChange={(e) => updateEmergencyContact(index, "label", e.target.value)}
                    className="flex-1 rounded-lg text-sm"
                  />
                  <Input
                    type="tel"
                    placeholder="Number (e.g., 119)"
                    value={contact.number}
                    onChange={(e) => updateEmergencyContact(index, "number", e.target.value)}
                    className="flex-1 rounded-lg text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive p-1"
                    onClick={() => removeEmergencyContact(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={saveEmergencySettings} disabled={savingEmergency} className="rounded-xl w-full sm:w-auto">
            {savingEmergency ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Support & Emergency Settings
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