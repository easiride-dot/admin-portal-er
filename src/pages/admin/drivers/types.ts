import type { Tables } from "@/integrations/supabase/types";

export type Driver = Tables<"drivers">;

export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type DriverStatus = "online" | "offline" | "busy";

export const APPROVAL_STATUSES: ApprovalStatus[] = ["pending", "approved", "rejected", "suspended"];
export const DRIVER_STATUSES: DriverStatus[] = ["online", "offline", "busy"];

export const APPROVAL_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const DRIVER_STATUS_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  busy: "Busy",
};

export const shortDriverId = (id: string) => `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
};