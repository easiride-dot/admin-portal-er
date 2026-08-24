import { Clock, CheckCircle2, XCircle, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Driver } from "./types";

type Stat = {
  label: string;
  value: number;
  icon: typeof Clock;
  className: string;
};

export const StatCards = ({ drivers }: { drivers: Driver[] }) => {
  const pending = drivers.filter((d) => d.approval_status === "pending").length;
  const approved = drivers.filter((d) => d.approval_status === "approved").length;
  const rejected = drivers.filter((d) => d.approval_status === "rejected").length;
  const online = drivers.filter((d) => d.driver_status === "online").length;

  const stats: Stat[] = [
    {
      label: "Pending Drivers",
      value: pending,
      icon: Clock,
      className: "bg-amber-500/10 text-amber-300",
    },
    {
      label: "Approved Drivers",
      value: approved,
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-300",
    },
    {
      label: "Rejected Drivers",
      value: rejected,
      icon: XCircle,
      className: "bg-red-500/10 text-red-300",
    },
    {
      label: "Online Drivers",
      value: online,
      icon: Radio,
      className: "bg-blue-500/10 text-blue-300",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, className }) => (
        <div
          key={label}
          className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-hairline"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", className)}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
      ))}
    </div>
  );
};