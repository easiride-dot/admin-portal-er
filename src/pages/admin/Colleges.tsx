import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface College {
  id: string;
  name: string;
  lat: number;
  lon: number;
  created_at: string;
}

export const Colleges = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLon, setFormLon] = useState("");

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    const { data, error } = await supabase
      .from("colleges")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Failed to load colleges");
    } else {
      setColleges((data as College[]) || []);
    }
    setLoading(false);
  };

  const openAdd = () => {
    setEditing(null);
    setFormName("");
    setFormLat("");
    setFormLon("");
    setDialogOpen(true);
  };

  const openEdit = (college: College) => {
    setEditing(college);
    setFormName(college.name);
    setFormLat(String(college.lat));
    setFormLon(String(college.lon));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("College name is required");
      return;
    }
    const lat = parseFloat(formLat);
    const lon = parseFloat(formLon);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Valid latitude and longitude are required");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("colleges")
          .update({ name: formName.trim(), lat, lon })
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("College updated");
      } else {
        const { error } = await supabase
          .from("colleges")
          .insert({ name: formName.trim(), lat, lon });

        if (error) throw error;
        toast.success("College added");
      }
      setDialogOpen(false);
      fetchColleges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save college");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("colleges")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete college");
    } else {
      toast.success("College removed");
      fetchColleges();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Colleges</h1>
          <p className="text-sm text-muted-foreground">Manage colleges and their coordinates for student ride booking</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add College
        </Button>
      </div>

      {colleges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-4">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No colleges yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add your first college to get started.</p>
          <Button variant="outline" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add College
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-secondary/30">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Latitude</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Longitude</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {colleges.map((college) => (
                <tr key={college.id} className="text-sm hover:bg-secondary/10">
                  <td className="px-4 py-3 font-medium">{college.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{college.lat}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{college.lon}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(college)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(college.id, college.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit College" : "Add College"}</DialogTitle>
            <DialogDescription>
              {editing ? "Update the college name and coordinates." : "Enter the college name and its GPS coordinates."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">College Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Fourah Bay College"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  placeholder="e.g. 8.477917"
                  type="number"
                  step="any"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lon">Longitude</Label>
                <Input
                  id="lon"
                  value={formLon}
                  onChange={(e) => setFormLon(e.target.value)}
                  placeholder="e.g. -13.221056"
                  type="number"
                  step="any"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : editing ? "Save Changes" : "Add College"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};