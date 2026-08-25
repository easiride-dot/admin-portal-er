import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { logAdminAction } from "@/lib/logging";

interface PricingConfig {
  id: string;
  base_fare: number;
  per_km_rate: number;
  surge_mode: "normal" | "peak" | "rain";
  surge_active: boolean;
  surge_normal: number;
  surge_peak: number;
  surge_rain: number;
}

interface WeeklyBandRow {
  id?: string;
  min_km: string;
  max_km: string;
  gross_fare: string;
}

export const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [baseFare, setBaseFare] = useState(7);
  const [perKmRate, setPerKmRate] = useState(7);
  const [surgeMode, setSurgeMode] = useState<"normal" | "peak" | "rain">("normal");
  const [bands, setBands] = useState<WeeklyBandRow[]>([]);
  const [savingBands, setSavingBands] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchBands();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from("pricing_config" as any)
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("fetchConfig error:", error);
      toast.error("Failed to load pricing configuration: " + error.message);
    } else if (data) {
      const cfg = data as unknown as PricingConfig;
      setConfig(cfg);
      if (cfg.base_fare != null) setBaseFare(Number(cfg.base_fare));
      if (cfg.per_km_rate != null) setPerKmRate(Number(cfg.per_km_rate));
      if (cfg.surge_mode) setSurgeMode(cfg.surge_mode);
    } else {
      toast.error("No pricing configuration found in database. Run the pricing migrations.");
    }
    setLoading(false);
  };

  const handleSaveFare = async () => {
    if (!config) { toast.error("Pricing config not loaded. Refresh the page."); return; }
    setSaving(true);
    const oldBase = config.base_fare;
    const oldRate = config.per_km_rate;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleCheck) {
        toast.error("You don't have admin permissions to update pricing.");
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("pricing_config" as any)
        .update({ base_fare: baseFare, per_km_rate: perKmRate })
        .eq("id", config.id);

      if (error) throw error;

      await logAdminAction("update_fare_config", config.id, {
        before: { base_fare: oldBase, per_km_rate: oldRate },
        after: { base_fare: baseFare, per_km_rate: perKmRate },
      });

      // Re-fetch to verify and update the form
      const { data: refreshed } = await supabase
        .from("pricing_config" as any)
        .select("*")
        .eq("id", config.id)
        .single();

      if (refreshed) {
        setConfig(refreshed as any);
        setBaseFare(Number(refreshed.base_fare));
        setPerKmRate(Number(refreshed.per_km_rate));
      }

      toast.success("Fare configuration saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save fare configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleSetSurgeMode = async (mode: "normal" | "peak" | "rain") => {
    if (!config) return;
    const oldMode = config.surge_mode;
    try {
      const { error } = await supabase
        .from("pricing_config" as any)
        .update({
          surge_mode: mode,
          surge_active: mode !== "normal",
        })
        .eq("id", config.id);

      if (error) throw error;

      await logAdminAction("set_surge_mode", config.id, {
        before: { surge_mode: oldMode, surge_active: oldMode !== "normal" },
        after: { surge_mode: mode, surge_active: mode !== "normal" },
      });

      setSurgeMode(mode);
      toast.success(`Surge mode set to ${mode.toUpperCase()}`);
    } catch {
      toast.error("Failed to update surge mode");
    }
  };

  const fetchBands = async () => {
    const { data, error } = await supabase
      .from("pricing_config" as any)
      .select("*")
      .eq("ride_type", "weekly")
      .order("min_km", { ascending: true });

    if (error) {
      console.error("fetchBands error:", error);
      return;
    }
    setBands(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id as string,
        min_km: String(Number(r.min_km ?? 0)),
        max_km: String(Number(r.max_km ?? 0)),
        gross_fare: String(Number(r.gross_fare ?? 0)),
      })),
    );
  };

  const updateBand = (idx: number, patch: Partial<WeeklyBandRow>) =>
    setBands((prev) => prev.map((b, i) => (i === idx ? { ...b, ...patch } : b)));

  const addBand = () => setBands((prev) => [...prev, { min_km: "", max_km: "", gross_fare: "" }]);

  const removeBand = (idx: number) => setBands((prev) => prev.filter((_, i) => i !== idx));

  const handleSaveBands = async () => {
    const parsed = bands.map((b) => ({
      id: b.id,
      min: parseFloat(b.min_km),
      max: parseFloat(b.max_km),
      price: parseFloat(b.gross_fare),
    }));
    for (const b of parsed) {
      if (
        !isFinite(b.min) || !isFinite(b.max) || !isFinite(b.price) ||
        b.min < 0 || b.max <= b.min || b.price < 0
      ) {
        toast.error("Each band needs a price and a max km greater than its min km.");
        return;
      }
    }
    const sorted = [...parsed].sort((a, b) => a.min - b.min);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min < sorted[i - 1].max) {
        toast.error("Bands cannot overlap — adjust the km boundaries.");
        return;
      }
    }

    setSavingBands(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: roleCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleCheck) {
        toast.error("You don't have admin permissions to update pricing.");
        return;
      }

      const keptIds = new Set(parsed.filter((b) => b.id).map((b) => b.id!));
      const { data: existing } = await supabase
        .from("pricing_config" as any)
        .select("id")
        .eq("ride_type", "weekly");
      for (const row of ((existing ?? []) as unknown as { id: string }[])) {
        if (!keptIds.has(row.id)) {
          const { error: delError } = await supabase.from("pricing_config" as any).delete().eq("id", row.id);
          if (delError) throw delError;
        }
      }

      for (const b of parsed) {
        const payload = {
          ride_type: "weekly",
          distance_bracket: `${b.min}-${b.max}`,
          min_km: b.min,
          max_km: b.max,
          gross_fare: b.price,
        };
        const { error } = b.id
          ? await supabase.from("pricing_config" as any).update(payload).eq("id", b.id)
          : await supabase.from("pricing_config" as any).insert(payload);
        if (error) throw error;
      }

      await logAdminAction("update_weekly_bands", config?.id, {
        bands: parsed.map((b) => ({ min_km: b.min, max_km: b.max, gross_fare: b.price })),
      });

      await fetchBands();
      toast.success("Weekly distance bands saved");
    } catch (err: any) {
      toast.error(err?.message || "Failed to save weekly bands");
    } finally {
      setSavingBands(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const multiplierDisplay =
    surgeMode === "rain" ? config?.surge_rain :
    surgeMode === "peak" ? config?.surge_peak :
    config?.surge_normal;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pricing Configuration</h1>
        <p className="text-sm text-muted-foreground">Manage fare rates and surge pricing</p>
      </div>

      {/* SECTION A — Fare Configuration */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Fare Configuration</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Base Fare (NLe)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={baseFare}
              onChange={(e) => setBaseFare(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Per KM Rate (NLe)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={perKmRate}
              onChange={(e) => setPerKmRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
        <Button onClick={handleSaveFare} disabled={saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Changes</>
          )}
        </Button>
        {config && (
          <p className="text-xs text-muted-foreground mt-3">
            Current: Base {Number(config.base_fare).toFixed(2)} NLe, Per KM {Number(config.per_km_rate).toFixed(2)} NLe
          </p>
        )}
      </div>

      {/* SECTION B — Surge Multipliers (read-only) */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Surge Multipliers</h2>
        <p className="text-xs text-muted-foreground mb-4">These multipliers are applied on top of the base fare calculation.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Normal</p>
            <p className="text-2xl font-bold">{Number(config?.surge_normal ?? 1).toFixed(1)}x</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Peak</p>
            <p className="text-2xl font-bold text-amber-500">{Number(config?.surge_peak ?? 1.3).toFixed(1)}x</p>
          </div>
          <div className="border rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Rain</p>
            <p className="text-2xl font-bold text-blue-500">{Number(config?.surge_rain ?? 1.5).toFixed(1)}x</p>
          </div>
        </div>
      </div>

      {/* SECTION C — Surge Mode Control */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Surge Mode Control</h2>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-amber-400">
            ⚠️ Surge mode changes apply immediately to all active fare calculations. Current mode: <strong>{surgeMode.toUpperCase()}</strong> ({Number(multiplierDisplay ?? 1).toFixed(1)}x)
          </p>
        </div>

        <div className="flex gap-3">
          {(["normal", "peak", "rain"] as const).map((mode) => {
            const isActive = surgeMode === mode;
            const multiplier =
              mode === "rain" ? config?.surge_rain :
              mode === "peak" ? config?.surge_peak :
              config?.surge_normal;
            return (
              <button
                key={mode}
                onClick={() => handleSetSurgeMode(mode)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-white text-black shadow-md opacity-100"
                    : "bg-secondary text-muted-foreground opacity-50 hover:opacity-75"
                }`}
              >
                {mode}
                <span className="block text-[10px] font-normal mt-0.5 opacity-70">
                  {Number(multiplier ?? 1).toFixed(1)}x
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION D — Student Weekly Distance Bands */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-1">Student Weekly Bands</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Weekly package price is picked by the pickup → campus distance. Distances below the first band pay the
          cheapest band; distances above the last band pay the most expensive one.
        </p>

        <div className="space-y-3 mb-4">
          {bands.length === 0 && (
            <p className="text-sm text-muted-foreground">No bands configured yet — add the first one below.</p>
          )}
          {bands.map((band, idx) => (
            <div key={band.id ?? `new-${idx}`} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end border rounded-lg p-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Min KM</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={band.min_km}
                  onChange={(e) => updateBand(idx, { min_km: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Max KM</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={band.max_km}
                  onChange={(e) => updateBand(idx, { max_km: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Price (NLe / week)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={band.gross_fare}
                  onChange={(e) => updateBand(idx, { gross_fare: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={() => removeBand(idx)}
                className="px-3 py-2 rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete band"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={addBand}>+ Add Band</Button>
          <Button onClick={handleSaveBands} disabled={savingBands}>
            {savingBands ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Save Bands</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
