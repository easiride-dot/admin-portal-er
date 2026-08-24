import type { ReactNode } from "react";
import { Copy, KeyRound, Star, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { ApprovalBadge, DriverStatusBadge, LinkedBadge } from "./badges";
import { formatDate, shortDriverId, type Driver } from "./types";

interface DriverDrawerProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatingId: string | null;
  onGenerateCode: (driver: Driver) => void;
  onCopyCode: (code: string) => void;
  onApprove: (driver: Driver) => void;
  onReject: (driver: Driver) => void;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div>
    <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
    <div className="mt-2 space-y-2">{children}</div>
  </div>
);

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start justify-between gap-4">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-right text-sm font-medium text-foreground">{children}</span>
  </div>
);

const Body = ({
  driver,
  generatingId,
  onGenerateCode,
  onCopyCode,
  onApprove,
  onReject,
}: {
  driver: Driver;
  generatingId: string | null;
  onGenerateCode: (driver: Driver) => void;
  onCopyCode: (code: string) => void;
  onApprove: (driver: Driver) => void;
  onReject: (driver: Driver) => void;
}) => {
  const isPending = driver.approval_status === "pending";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {driver.full_name
            .split(" ")
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase()}
        </div>
        <div>
          <p className="font-display text-lg font-semibold text-foreground">{driver.full_name}</p>
          <p className="font-mono text-xs text-muted-foreground">{shortDriverId(driver.id)}</p>
        </div>
        <div className="ml-auto">
          <ApprovalBadge status={driver.approval_status} />
        </div>
      </div>

      <Section title="Driver profile">
        <Row label="Phone">{driver.phone}</Row>
        <Row label="Vehicle">{driver.vehicle || "—"}</Row>
        <Row label="Plate number">
          <span className="font-mono">{driver.plate_number || "—"}</span>
        </Row>
      </Section>

      <Section title="Application">
        <Row label="Approval status">
          <ApprovalBadge status={driver.approval_status} />
        </Row>
        <Row label="Application date">{formatDate(driver.created_at)}</Row>
        <Row label="Onboarding completed">{driver.onboarding_completed ? "Yes" : "No"}</Row>
        {driver.approval_status === "rejected" && driver.rejection_reason && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300">Rejection reason</p>
            <p className="mt-1 text-sm text-red-200">{driver.rejection_reason}</p>
          </div>
        )}
      </Section>

      <Section title="Operations">
        <Row label="Driver status">
          <DriverStatusBadge status={driver.driver_status} />
        </Row>
        <Row label="Ride mode">{driver.ride_mode ? driver.ride_mode.replace("_", " ") : "—"}</Row>
        <Row label="Maximum shared seats">{driver.shared_max_seats ?? "—"}</Row>
      </Section>

      <Section title="Performance">
        <Row label="Rating">
          <span className="inline-flex items-center gap-1">
            {driver.rating != null ? (
              <>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {Number(driver.rating).toFixed(1)}
              </>
            ) : (
              "—"
            )}
          </span>
        </Row>
        <Row label="Total trips">{driver.total_trips ?? 0}</Row>
      </Section>

      <Section title="Access">
        {driver.driver_code ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
            <span className="font-mono text-sm font-bold tracking-wider text-emerald-300">{driver.driver_code}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onCopyCode(driver.driver_code!)}
              aria-label={`Copy driver code ${driver.driver_code}`}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : driver.approval_status === "approved" ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
            <div>
              <p className="text-xs text-muted-foreground">Code has not been generated.</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                Generate a code to give this driver account access.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => onGenerateCode(driver)}
              disabled={generatingId === driver.id}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {generatingId === driver.id ? "Generating…" : "Generate Code"}
            </Button>
          </div>
        ) : (
          <Row label="Driver code">
            <span className="text-sm text-muted-foreground">Not generated</span>
          </Row>
        )}
        <Row label="Linked account">
          <span className="inline-flex items-center gap-2">
            <LinkedBadge linked={!!driver.user_id} />
            <span className="font-mono text-xs text-muted-foreground">
              {driver.user_id ? shortDriverId(driver.user_id) : "—"}
            </span>
          </span>
        </Row>
      </Section>

      {isPending && (
        <div className="flex gap-3 border-t border-border pt-5">
          <Button type="button" variant="outline" className="flex-1 gap-1.5 rounded-xl" onClick={() => onReject(driver)}>
            <Ban className="h-4 w-4" /> Reject Driver
          </Button>
          <Button type="button" className="flex-1 rounded-xl" onClick={() => onApprove(driver)}>
            Approve Driver
          </Button>
        </div>
      )}
    </div>
  );
};

export const DriverDrawer = ({
  driver,
  open,
  onOpenChange,
  generatingId,
  onGenerateCode,
  onCopyCode,
  onApprove,
  onReject,
}: DriverDrawerProps) => {
  const isMobile = useIsMobile();

  if (!driver) return null;

  const content = (
    <Body
      driver={driver}
      generatingId={generatingId}
      onGenerateCode={onGenerateCode}
      onCopyCode={onCopyCode}
      onApprove={onApprove}
      onReject={onReject}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] overflow-y-auto px-5 pb-6">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Driver details</DrawerTitle>
            <DrawerDescription>Review this driver's application and access.</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-l border-border p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle>Driver details</SheetTitle>
          <SheetDescription>Review this driver's application and access.</SheetDescription>
        </SheetHeader>
        <div className="p-6">{content}</div>
      </SheetContent>
    </Sheet>
  );
};