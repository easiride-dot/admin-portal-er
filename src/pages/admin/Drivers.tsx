import { useState, useEffect } from "react";
import { 
  Plus, 
  MessageCircle, 
  MoreVertical, 
  Trash2, 
  Edit2,
  CarFront,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { openWhatsApp } from "@/lib/whatsapp";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { logAdminAction } from "@/lib/logging";
import { z } from "zod";

const driverSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the driver's full name").max(80),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(24),
  vehicle: z.string().trim().min(2, "Enter the vehicle details").max(80),
  status: z.enum(["active", "inactive"]),
});

export const Drivers = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [addingDriver, setAddingDriver] = useState(false);
  const [driverForm, setDriverForm] = useState({
    fullName: "",
    phone: "",
    vehicle: "",
    status: "active" as "active" | "inactive",
  });

  const [editDriverOpen, setEditDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any | null>(null);
  const [updatingDriver, setUpdatingDriver] = useState(false);
  const [editDriverForm, setEditDriverForm] = useState({
    fullName: "",
    phone: "",
    vehicle: "",
    status: "active" as "active" | "inactive",
  });

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Fetch drivers and their associated rides
      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          rides (
            id,
            status,
            price
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      toast.error("Failed to fetch drivers");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addingDriver) return;

    const parsed = driverSchema.safeParse(driverForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setAddingDriver(true);
    try {
      const { data, error } = await supabase
        .from("drivers")
        .insert({
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          vehicle: parsed.data.vehicle,
          status: parsed.data.status,
        })
        .select("*")
        .single();

      if (error) throw error;

      await logAdminAction("add_driver", data.id, {
        full_name: data.full_name,
        phone: data.phone,
        vehicle: data.vehicle,
        status: data.status,
      });

      toast.success(`${data.full_name} added as a driver`);
      setDriverForm({ fullName: "", phone: "", vehicle: "", status: "active" });
      setAddDriverOpen(false);
      await fetchDrivers();
    } catch (error) {
      toast.error("Failed to add driver");
      console.error(error);
    } finally {
      setAddingDriver(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("drivers")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      await logAdminAction("toggle_driver_availability", id, { status: newStatus });
      toast.success(`Driver is now ${newStatus}`);
      fetchDrivers();
    }
  };

  const handleEditDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver || updatingDriver) return;

    const parsed = driverSchema.safeParse(editDriverForm);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setUpdatingDriver(true);
    try {
      const { error } = await supabase
        .from("drivers")
        .update({
          full_name: parsed.data.fullName,
          phone: parsed.data.phone,
          vehicle: parsed.data.vehicle,
          status: parsed.data.status,
        })
        .eq("id", editingDriver.id);

      if (error) throw error;

      await logAdminAction("edit_driver", editingDriver.id, {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        vehicle: parsed.data.vehicle,
        status: parsed.data.status,
      });

      toast.success("Driver updated successfully");
      setEditDriverOpen(false);
      setEditingDriver(null);
      await fetchDrivers();
    } catch (error) {
      toast.error("Failed to update driver");
      console.error(error);
    } finally {
      setUpdatingDriver(false);
    }
  };

  const deactivateDriver = async (id: string) => {
    const { error } = await supabase
      .from("drivers")
      .update({ status: "inactive" })
      .eq("id", id);

    if (error) {
      toast.error("Failed to deactivate driver");
    } else {
      await logAdminAction("deactivate_driver", id, { status: "inactive" });
      toast.success("Driver deactivated successfully");
      fetchDrivers();
    }
  };

  const calculateEarnings = (rides: any[]) => {
    return rides
      .filter(r => r.status === "completed")
      .reduce((sum, r) => sum + (r.price || 0), 0);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Drivers Management</h1>
          <p className="text-muted-foreground mt-1">Monitor driver status and operational efficiency.</p>
        </div>
        <Button className="rounded-xl" onClick={() => setAddDriverOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Driver
        </Button>
      </div>

      <div className="glass-card rounded-3xl overflow-hidden shadow-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/30 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium">Driver</th>
                <th className="px-6 py-4 font-medium">Vehicle Details</th>
                <th className="px-6 py-4 font-medium">Availability</th>
                <th className="px-6 py-4 font-medium">Active Tasks</th>
                <th className="px-6 py-4 font-medium">Earnings</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline/40 text-sm">
              {drivers.map((driver) => {
                const activeRides = driver.rides?.filter((r: any) => ["assigned", "in_progress"].includes(r.status)) || [];
                const earnings = calculateEarnings(driver.rides || []);
                const isOnline = driver.status === "active";

                return (
                  <tr key={driver.id} className="group hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium">{driver.full_name}</div>
                      <div className="text-xs text-muted-foreground">{driver.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CarFront className="h-4 w-4 text-muted-foreground" />
                        <span>{driver.vehicle}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Switch 
                          checked={isOnline}
                          onCheckedChange={() => toggleStatus(driver.id, driver.status)}
                        />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{activeRides.length}</span>
                        <span className="text-xs text-muted-foreground text-nowrap">students assigned</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">NLe {earnings}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Total Weekly</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                          onClick={() => openWhatsApp(driver.phone, `Hello ${driver.full_name}, are you available for a ride assignment?`)}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem 
                              className="gap-2"
                              onClick={() => {
                                setEditingDriver(driver);
                                setEditDriverForm({
                                  fullName: driver.full_name,
                                  phone: driver.phone,
                                  vehicle: driver.vehicle,
                                  status: driver.status as "active" | "inactive",
                                });
                                setEditDriverOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" /> Edit Driver
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => deactivateDriver(driver.id)}
                            >
                              <Trash2 className="h-4 w-4" /> Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {drivers.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted-foreground">
                    No drivers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={addDriverOpen} onOpenChange={setAddDriverOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add Driver</DialogTitle>
            <DialogDescription>
              Create a driver profile for ride assignment and availability tracking.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDriver} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="driver-name">Full name</Label>
              <Input
                id="driver-name"
                placeholder="Mohamed Kamara"
                value={driverForm.fullName}
                onChange={(e) => setDriverForm((prev) => ({ ...prev, fullName: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-phone">Phone number</Label>
              <Input
                id="driver-phone"
                placeholder="+232 72 000 000"
                value={driverForm.phone}
                onChange={(e) => setDriverForm((prev) => ({ ...prev, phone: e.target.value }))}
                maxLength={24}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver-vehicle">Vehicle details</Label>
              <Input
                id="driver-vehicle"
                placeholder="Keke - ABC 123"
                value={driverForm.vehicle}
                onChange={(e) => setDriverForm((prev) => ({ ...prev, vehicle: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-hairline bg-secondary/20 p-4">
              <div>
                <Label htmlFor="driver-active">Available now</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active drivers appear in assignment lists.
                </p>
              </div>
              <Switch
                id="driver-active"
                checked={driverForm.status === "active"}
                onCheckedChange={(checked) =>
                  setDriverForm((prev) => ({ ...prev, status: checked ? "active" : "inactive" }))
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setAddDriverOpen(false)}
                disabled={addingDriver}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={addingDriver}>
                {addingDriver ? "Adding..." : "Add Driver"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={editDriverOpen} onOpenChange={setEditDriverOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update the driver's profile information and status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDriver} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-driver-name">Full name</Label>
              <Input
                id="edit-driver-name"
                placeholder="Mohamed Kamara"
                value={editDriverForm.fullName}
                onChange={(e) => setEditDriverForm((prev) => ({ ...prev, fullName: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-driver-phone">Phone number</Label>
              <Input
                id="edit-driver-phone"
                placeholder="+232 72 000 000"
                value={editDriverForm.phone}
                onChange={(e) => setEditDriverForm((prev) => ({ ...prev, phone: e.target.value }))}
                maxLength={24}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-driver-vehicle">Vehicle details</Label>
              <Input
                id="edit-driver-vehicle"
                placeholder="Keke - ABC 123"
                value={editDriverForm.vehicle}
                onChange={(e) => setEditDriverForm((prev) => ({ ...prev, vehicle: e.target.value }))}
                maxLength={80}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-hairline bg-secondary/20 p-4">
              <div>
                <Label htmlFor="edit-driver-active">Available now</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Active drivers appear in assignment lists.
                </p>
              </div>
              <Switch
                id="edit-driver-active"
                checked={editDriverForm.status === "active"}
                onCheckedChange={(checked) =>
                  setEditDriverForm((prev) => ({ ...prev, status: checked ? "active" : "inactive" }))
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setEditDriverOpen(false)}
                disabled={updatingDriver}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 rounded-xl" disabled={updatingDriver}>
                {updatingDriver ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
