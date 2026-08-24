import { Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalBadge, DriverStatusBadge, LinkedBadge } from "./badges";
import { formatDate, shortDriverId, type Driver } from "./types";

export type EmptyKind = "none" | "caught_up" | "no_match";

interface DriverTableProps {
  drivers: Driver[];
  loading: boolean;
  emptyKind: EmptyKind;
  generatingId: string | null;
  onRowClick: (driver: Driver) => void;
  onReview: (driver: Driver) => void;
  onGenerateCode: (driver: Driver) => void;
  onCopyCode: (code: string) => void;
}

const DriverName = ({ driver }: { driver: Driver }) => (
  <div>
    <div className="font-medium text-foreground">{driver.full_name}</div>
    <div className="font-mono text-xs text-muted-foreground">{shortDriverId(driver.id)}</div>
  </div>
);

const DriverCodeCell = ({
  driver,
  generatingId,
  onGenerateCode,
  onCopyCode,
}: {
  driver: Driver;
  generatingId: string | null;
  onGenerateCode: (driver: Driver) => void;
  onCopyCode: (code: string) => void;
}) => {
  if (driver.driver_code) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-xs font-semibold tracking-wide text-foreground">
          {driver.driver_code}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onCopyCode(driver.driver_code!)}
          aria-label={`Copy driver code ${driver.driver_code}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (driver.approval_status === "approved") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 gap-1.5 rounded-lg text-xs"
        onClick={() => onGenerateCode(driver)}
        disabled={generatingId === driver.id}
      >
        <KeyRound className="h-3.5 w-3.5" />
        {generatingId === driver.id ? "Generating…" : "Generate Code"}
      </Button>
    );
  }

  return <span className="text-xs text-muted-foreground">Not generated</span>;
};

const ActionsCell = ({
  driver,
  onReview,
  onGenerateCode,
  onCopyCode,
  generatingId,
}: {
  driver: Driver;
  onReview: (driver: Driver) => void;
  onGenerateCode: (driver: Driver) => void;
  onCopyCode: (code: string) => void;
  generatingId: string | null;
}) => {
  if (driver.approval_status === "pending") {
    return (
      <Button type="button" variant="secondary" size="sm" className="h-7 rounded-lg text-xs" onClick={() => onReview(driver)}>
        Review
      </Button>
    );
  }
  return <DriverCodeCell driver={driver} generatingId={generatingId} onGenerateCode={onGenerateCode} onCopyCode={onCopyCode} />;
};

const LoadingSkeleton = () => (
  <div className="space-y-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-6 rounded-xl border border-border/60 px-4 py-3.5">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ emptyKind }: { emptyKind: EmptyKind }) => {
  const content =
    emptyKind === "caught_up"
      ? {
          title: "You're all caught up.",
          message: "No pending driver applications to review.",
        }
      : emptyKind === "no_match"
        ? {
            title: "No drivers match your filters.",
            message: "Try adjusting your search or filters.",
          }
        : {
            title: "No driver applications yet.",
            message: "New driver applications will appear here.",
          };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <p className="font-display text-lg font-semibold text-foreground">{content.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{content.message}</p>
    </div>
  );
};

export const DriverTable = ({
  drivers,
  loading,
  emptyKind,
  generatingId,
  onRowClick,
  onReview,
  onGenerateCode,
  onCopyCode,
}: DriverTableProps) => {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
        <LoadingSkeleton />
      </div>
    );
  }

  if (drivers.length === 0) {
    return <EmptyState emptyKind={emptyKind} />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3.5 font-semibold">Driver</th>
                <th className="px-5 py-3.5 font-semibold">Phone</th>
                <th className="px-5 py-3.5 font-semibold">Vehicle</th>
                <th className="px-5 py-3.5 font-semibold">Plate Number</th>
                <th className="px-5 py-3.5 font-semibold">Approval</th>
                <th className="px-5 py-3.5 font-semibold">Driver Status</th>
                <th className="px-5 py-3.5 font-semibold">Driver Code</th>
                <th className="px-5 py-3.5 font-semibold">Linked</th>
                <th className="px-5 py-3.5 font-semibold">Onboarding</th>
                <th className="px-5 py-3.5 font-semibold">Created</th>
                <th className="px-5 py-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {drivers.map((driver) => (
                <tr
                  key={driver.id}
                  onClick={() => onRowClick(driver)}
                  className="group cursor-pointer transition-colors hover:bg-muted/30"
                >
                  <td className="px-5 py-3.5">
                    <DriverName driver={driver} />
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{driver.phone}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{driver.vehicle || "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                    {driver.plate_number || "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <ApprovalBadge status={driver.approval_status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <DriverStatusBadge status={driver.driver_status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <DriverCodeCell
                      driver={driver}
                      generatingId={generatingId}
                      onGenerateCode={onGenerateCode}
                      onCopyCode={onCopyCode}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <LinkedBadge linked={!!driver.user_id} />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-muted-foreground">
                      {driver.onboarding_completed ? "Completed" : "Incomplete"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(driver.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <ActionsCell
                      driver={driver}
                      onReview={onReview}
                      onGenerateCode={onGenerateCode}
                      onCopyCode={onCopyCode}
                      generatingId={generatingId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {drivers.map((driver) => (
          <div
            key={driver.id}
            onClick={() => onRowClick(driver)}
            className="cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <DriverName driver={driver} />
              <div className="flex items-center gap-1.5">
                <ApprovalBadge status={driver.approval_status} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                <p className="mt-0.5 text-muted-foreground">{driver.phone}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Plate</p>
                <p className="mt-0.5 font-mono text-muted-foreground">{driver.plate_number || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vehicle</p>
                <p className="mt-0.5 text-muted-foreground">{driver.vehicle || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
                <DriverStatusBadge status={driver.driver_status} className="mt-0.5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Linked</p>
                <LinkedBadge linked={!!driver.user_id} className="mt-0.5" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
              <DriverCodeCell
                driver={driver}
                generatingId={generatingId}
                onGenerateCode={onGenerateCode}
                onCopyCode={onCopyCode}
              />
              <ActionsCell
                driver={driver}
                onReview={onReview}
                onGenerateCode={onGenerateCode}
                onCopyCode={onCopyCode}
                generatingId={generatingId}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
};