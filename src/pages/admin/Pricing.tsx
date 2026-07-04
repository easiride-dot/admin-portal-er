import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface PricingConfig {
  id: string;
  distance_bracket: "short" | "medium" | "long";
  ride_type: "solo" | "shared";
  gross_fare: number;
  commission: number;
  updated_at: string;
}

export const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pricingConfigs, setPricingConfigs] = useState<PricingConfig[]>([]);

  useEffect(() => {
    fetchPricingConfigs();
  }, []);

  const fetchPricingConfigs = async () => {
    const { data, error } = await supabase
      .from("pricing_config" as any)
      .select("*")
      .order("distance_bracket", { ascending: true });

    if (error) {
      toast.error("Failed to load pricing configurations");
    } else {
      setPricingConfigs((data as unknown) as PricingConfig[] || []);
    }
    setLoading(false);
  };

  const handleUpdate = (id: string, field: "gross_fare" | "commission", value: number) => {
    setPricingConfigs(configs =>
      configs.map(config =>
        config.id === id ? { ...config, [field]: value } : config
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = pricingConfigs.map(config =>
        supabase
          .from("pricing_config" as any)
          .update({
            gross_fare: config.gross_fare,
            commission: config.commission,
          })
          .eq("id", config.id)
      );

      await Promise.all(updates);
      toast.success("Pricing configurations saved successfully");
      fetchPricingConfigs();
    } catch {
      toast.error("Failed to save pricing configurations");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const distanceLabels = {
    short: "Short Distance (< 5km)",
    medium: "Medium Distance (5-10km)",
    long: "Long Distance (> 10km)",
  };

  const rideTypeLabels = {
    solo: "Solo Ride",
    shared: "Shared Ride (per passenger)",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pricing Configuration</h1>
          <p className="text-sm text-muted-foreground">Manage pricing for different distance brackets and ride types</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {["short", "medium", "long"].map((bracket) => (
          <div key={bracket} className="bg-card border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">
              {distanceLabels[bracket as keyof typeof distanceLabels]}
            </h2>
            <div className="space-y-4">
              {["solo", "shared"].map((rideType) => {
                const config = pricingConfigs.find(
                  c => c.distance_bracket === bracket && c.ride_type === rideType
                );
                if (!config) return null;

                return (
                  <div key={rideType} className="border rounded-lg p-4">
                    <h3 className="font-medium mb-4">
                      {rideTypeLabels[rideType as keyof typeof rideTypeLabels]}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">
                          Gross Fare (NLe)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={config.gross_fare}
                          onChange={(e) => handleUpdate(config.id, "gross_fare", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-muted-foreground mb-1">
                          Commission (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={config.commission}
                          onChange={(e) => handleUpdate(config.id, "commission", parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-muted-foreground">
                      Driver Net: {(config.gross_fare - (config.gross_fare * (config.commission / 100))).toFixed(2)} NLe
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
