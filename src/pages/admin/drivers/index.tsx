import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatCards } from "./statCards";
import { Filters, DEFAULT_FILTERS, type FilterState } from "./filters";
import { DriverTable, type EmptyKind } from "./table";
import { DriverDrawer } from "./drawer";
import { ApproveDialog, DeleteDialog, GenerateCodeDialog, RejectDialog } from "./dialogs";
import { deleteUserWithFiles } from "@/lib/delete-account";
import type { Driver } from "./types";

const ERROR_MESSAGES = {
  load: "Unable to load drivers.",
  generate: "Unable to generate driver code.",
  approve: "Unable to approve driver.",
  reject: "Unable to reject driver.",
  delete: "Unable to delete driver account.",
};

const classifyGenerateError = (message: string): { title: string; description?: string } => {
  const m = (message || "").toLowerCase();
  if (m.includes("admin") || m.includes("privilege") || m.includes("permission") || m.includes("authoriz")) {
    return { title: "Only administrators can generate driver codes." };
  }
  if (m.includes("not found") || m.includes("does not exist") || m.includes("no rows")) {
    return { title: "Driver not found." };
  }
  if (m.includes("duplicate") || m.includes("unique") || m.includes("already")) {
    return { title: "A driver code already exists for this driver.", description: message };
  }
  return { title: ERROR_MESSAGES.generate, description: message };
};

export const Drivers = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [generateTarget, setGenerateTarget] = useState<Driver | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [approveTarget, setApproveTarget] = useState<Driver | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Driver | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error("Failed to load drivers:", error);
      setLoadError(true);
      toast.error(ERROR_MESSAGES.load);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrivers();

    const channel = supabase
      .channel("admin_drivers_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, () => fetchDrivers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDrivers]);

  const updateDriver = (id: string, patch: Partial<Driver>) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    setSelectedDriver((prev) => (prev?.id === id ? { ...prev, ...patch } : prev));
  };

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const list = drivers.filter((d) => {
      if (filters.approval !== "all" && (d.approval_status ?? "pending") !== filters.approval) return false;
      if (filters.driverStatus !== "all" && (d.driver_status ?? "offline") !== filters.driverStatus) return false;
      if (filters.code === "generated" && !d.driver_code) return false;
      if (filters.code === "not_generated" && d.driver_code) return false;

      if (q) {
        const haystack = [
          d.full_name,
          d.phone,
          d.driver_code,
          d.plate_number,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    switch (filters.sort) {
      case "oldest":
        return [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
      case "name_asc":
        return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name));
      case "name_desc":
        return [...list].sort((a, b) => b.full_name.localeCompare(a.full_name));
      default:
        return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
  }, [drivers, filters]);

  const emptyKind: EmptyKind = useMemo(() => {
    if (drivers.length === 0) return "none";
    if (filters.approval === "pending") return "caught_up";
    return "no_match";
  }, [drivers.length, filters.approval]);

  const openDrawer = (driver: Driver) => {
    setSelectedDriver(driver);
    setDrawerOpen(true);
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    toast.success("Driver code copied.");
  };

  const handleGenerateCode = async () => {
    if (!generateTarget || generatingId) return;
    setGeneratingId(generateTarget.id);
    try {
      const { data, error } = await supabase.rpc("generate_driver_code", {
        p_driver_id: generateTarget.id,
      });

      if (error) {
        const { title, description } = classifyGenerateError(error.message);
        toast.error(title, description ? { description } : undefined);
        if (description && /duplicate|unique|already/i.test(description)) {
          await fetchDrivers();
        }
        return;
      }

      if (data) {
        updateDriver(generateTarget.id, { driver_code: data });
        toast.success("Driver code generated successfully.");
        setGenerateOpen(false);
        setGenerateTarget(null);
      }
    } catch (error) {
      console.error("Generate driver code failed:", error);
      toast.error(ERROR_MESSAGES.generate);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget || approvingId) return;
    setApprovingId(approveTarget.id);
    try {
      const { data, error } = await supabase.rpc("approve_driver", {
        p_driver_id: approveTarget.id,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("admin") || msg.includes("privilege") || msg.includes("permission") || msg.includes("authoriz")) {
          toast.error("Only administrators can approve drivers.");
        } else {
          toast.error(ERROR_MESSAGES.approve, { description: error.message });
        }
        return;
      }

      if (data) {
        updateDriver(approveTarget.id, {
          approval_status: "approved",
          approved_at: new Date().toISOString(),
        });
        toast.success("Driver approved successfully.");
        setApproveOpen(false);
        setApproveTarget(null);
      }
    } catch (error) {
      console.error("Approve driver failed:", error);
      toast.error(ERROR_MESSAGES.approve);
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectTarget || rejectingId) return;
    setRejectingId(rejectTarget.id);
    try {
      const { data, error } = await supabase.rpc("reject_driver", {
        p_driver_id: rejectTarget.id,
        p_reason: reason,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("admin") || msg.includes("privilege") || msg.includes("permission") || msg.includes("authoriz")) {
          toast.error("Only administrators can reject drivers.");
        } else {
          toast.error(ERROR_MESSAGES.reject, { description: error.message });
        }
        return;
      }

      if (data) {
        updateDriver(rejectTarget.id, {
          approval_status: "rejected",
          rejection_reason: reason || null,
        });
        toast.success("Driver application rejected.");
        setRejectOpen(false);
        setRejectTarget(null);
      }
    } catch (error) {
      console.error("Reject driver failed:", error);
      toast.error(ERROR_MESSAGES.reject);
    } finally {
      setRejectingId(null);
    }
  };

  const openGenerate = (driver: Driver) => {
    setGenerateTarget(driver);
    setGenerateOpen(true);
  };
  const openApprove = (driver: Driver) => {
    setApproveTarget(driver);
    setApproveOpen(true);
  };
  const openReject = (driver: Driver) => {
    setRejectTarget(driver);
    setRejectOpen(true);
  };
  const openDelete = (driver: Driver) => {
    setDeleteTarget(driver);
    setDeleteOpen(true);
  };

  const handleDeleteAccount = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteUserWithFiles(deleteTarget.id);
      toast.success("Driver account deleted.");
      const wasSelected = selectedDriver?.id === deleteTarget.id;
      setDrivers((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      if (wasSelected) {
        setSelectedDriver(null);
        setDrawerOpen(false);
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (error: any) {
      console.error("Delete driver failed:", error);
      const msg = error?.message || "";
      if (/own account/i.test(msg)) {
        toast.error(msg);
      } else if (/admin|privilege|permission|authoriz/i.test(msg)) {
        toast.error("Only administrators can delete accounts.");
      } else {
        toast.error(ERROR_MESSAGES.delete, { description: msg });
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Driver Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review driver applications and generate driver access codes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg"
          onClick={fetchDrivers}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
          Refresh
        </Button>
      </div>

      <StatCards drivers={drivers} />

      <Filters filters={filters} onChange={setFilters} />

      {loadError ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-foreground">{ERROR_MESSAGES.load}</p>
          <p className="mt-1 text-sm text-muted-foreground">Please try again.</p>
          <Button className="mt-4 rounded-lg" onClick={fetchDrivers}>
            Retry
          </Button>
        </div>
      ) : (
        <DriverTable
          drivers={filtered}
          loading={loading}
          emptyKind={emptyKind}
          generatingId={generatingId}
          onRowClick={openDrawer}
          onReview={openDrawer}
          onGenerateCode={openGenerate}
          onCopyCode={copyCode}
        />
      )}

      <DriverDrawer
        driver={selectedDriver}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        generatingId={generatingId}
        onGenerateCode={openGenerate}
        onCopyCode={copyCode}
        onApprove={openApprove}
        onReject={openReject}
        onDelete={openDelete}
      />

      <GenerateCodeDialog
        driver={generateTarget}
        open={generateOpen}
        busy={generatingId !== null}
        onOpenChange={setGenerateOpen}
        onConfirm={handleGenerateCode}
      />

      <ApproveDialog
        driver={approveTarget}
        open={approveOpen}
        busy={approvingId !== null}
        onOpenChange={setApproveOpen}
        onConfirm={handleApprove}
      />

      <RejectDialog
        driver={rejectTarget}
        open={rejectOpen}
        busy={rejectingId !== null}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
      />

      <DeleteDialog
        driver={deleteTarget}
        open={deleteOpen}
        busy={deletingId !== null}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
};