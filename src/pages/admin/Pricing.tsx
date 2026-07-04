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

export const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [baseFare, setBaseFare] = useState(7);
  const [perKmRate, setPerKmRate] = useState(7);
  const [surgeMode, setSurgeMode] = useState<"normal" | "peak" | "rain">("normal");

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase
      .from("pricing_config" as any)
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Failed to load pricing configuration");
    } else if (data) {
      const cfg = data as unknown as PricingConfig;
      setConfig(cfg);
      setBaseFare(Number(cfg.base_fare));
      setPerKmRate(Number(cfg.per_km_rate));
      setSurgeMode(cfg.surge_mode);
    }
    setLoading(false);
  };

  const handleSaveFare = async () => {
    if (!config) return;
    setSaving(true);
    const oldBase = config.base_fare;
    const oldRate = config.per_km_rate;
    try {
      const { error } = await supabase
        .from("pricing_config" as any)
        .update({ base_fare: baseFare, per_km_rate: perKmRate })
        .eq("id", config.id);

      if (error) throw error;

      await logAdminAction("update_fare_config", config.id, {
        before: { base_fare: oldBase, per_km_rate: oldRate },
        after: { base_fare: baseFare, per_km_rate: perKmRate },
      });

      toast.success("Fare configuration saved");
      fetchConfig();
    } catch {
      toast.error("Failed to save fare configuration");
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
    </div>
  );
};
