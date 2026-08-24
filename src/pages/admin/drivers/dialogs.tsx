import { useEffect, useState } from "react";
import { KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Driver } from "./types";

export interface GenerateCodeDialogProps {
  driver: Driver | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const GenerateCodeDialog = ({ driver, open, busy, onOpenChange, onConfirm }: GenerateCodeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Driver Code?</DialogTitle>
          <DialogDescription>
            A unique Easi Ride driver code will be generated for this driver. The code can then be provided to the
            driver to link their account.
          </DialogDescription>
        </DialogHeader>

        {driver && (
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Driver</span>
              <span className="font-medium text-foreground">{driver.full_name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-foreground">{driver.phone}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Vehicle</span>
              <span className="font-medium text-foreground">{driver.vehicle || "—"}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="gap-1.5" onClick={onConfirm} disabled={busy}>
            <KeyRound className="h-4 w-4" />
            {busy ? "Generating…" : "Generate Code"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface ApproveDialogProps {
  driver: Driver | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ApproveDialog = ({ driver, open, busy, onOpenChange, onConfirm }: ApproveDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve Driver?</DialogTitle>
          <DialogDescription>
            Approving this driver allows the driver account to proceed with the Easi Ride driver workflow.
          </DialogDescription>
        </DialogHeader>

        {driver && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">{driver.full_name}</p>
            <p className="mt-0.5 text-muted-foreground">
              {driver.vehicle || "—"}
              {driver.plate_number ? ` · ${driver.plate_number}` : ""}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy}>
            {busy ? "Approving…" : "Approve Driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface DeleteDialogProps {
  driver: Driver | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const DeleteDialog = ({ driver, open, busy, onOpenChange, onConfirm }: DeleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete driver account?</DialogTitle>
          <DialogDescription>
            This permanently removes the driver's login, profile, vehicle record and any uploaded documents. Ride
            history involving this driver stays, but shows as unassigned. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {driver && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm">
            <p className="font-medium text-foreground">{driver.full_name}</p>
            <p className="mt-0.5 text-muted-foreground">
              {driver.phone}
              {driver.driver_code ? ` · ${driver.driver_code}` : ""}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
            <Trash2 className="h-4 w-4" />
            {busy ? "Deleting…" : "Delete Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export interface RejectDialogProps {
  driver: Driver | null;
  open: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
}

export const RejectDialog = ({ driver, open, busy, onOpenChange, onConfirm }: RejectDialogProps) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Driver Application</DialogTitle>
          <DialogDescription>
            {driver ? `Reject ${driver.full_name}'s application.` : "Reject this driver's application."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Reason for rejection</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional — e.g. invalid documents, missing licence…"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground">
            The reason is optional, but it will be shown to the driver.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => onConfirm(reason.trim())}
            disabled={busy}
          >
            {busy ? "Rejecting…" : "Reject Driver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};