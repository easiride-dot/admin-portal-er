import { cn } from "@/lib/utils";
import { APPROVAL_LABELS, DRIVER_STATUS_LABELS } from "./types";

type BadgeProps = {
  className?: string;
};

const badgeBase = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";

export const ApprovalBadge = ({ status, className }: BadgeProps & { status: string | null }) => {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    rejected: "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30",
    suspended: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
  };

  return (
    <span className={cn(badgeBase, colors[status ?? ""] ?? colors.suspended, className)}>
      {status ? APPROVAL_LABELS[status] ?? status : "—"}
    </span>
  );
};

export const DriverStatusBadge = ({ status, className }: BadgeProps & { status: string | null }) => {
  const colors: Record<string, string> = {
    online: "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30",
    offline: "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    busy: "bg-orange-500/15 text-orange-300 ring-1 ring-inset ring-orange-500/30",
  };

  const active = status ? colors[status] ?? colors.offline : colors.offline;

  return (
    <span className={cn(badgeBase, active, className)}>
      {status === "online" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      )}
      {status ? DRIVER_STATUS_LABELS[status] ?? status : "—"}
    </span>
  );
};

export const LinkedBadge = ({ linked, className }: BadgeProps & { linked: boolean }) => {
  return (
    <span
      className={cn(
        badgeBase,
        linked
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
          : "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
        className
      )}
    >
      {linked ? "Linked" : "Not linked"}
    </span>
  );
};