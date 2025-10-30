import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface StopAgentConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  daoName: string;
  delegating: boolean;
  onConfirm: (revokeDelegation: boolean) => Promise<void>;
}

export function StopAgentConfirmation({
  open,
  onOpenChange,
  daoName,
  delegating,
  onConfirm,
}: StopAgentConfirmationProps) {
  const [revokeDelegation, setRevokeDelegation] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stop Voting Agent</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            This will stop your voting agent for {daoName}.
          </p>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="revoke-delegation"
              checked={revokeDelegation}
              onCheckedChange={(checked) => setRevokeDelegation(checked as boolean)}
            />
            <label
              htmlFor="revoke-delegation"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Also revoke delegation
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            You will no longer be able to participate in governance activities until you set up a new agent.
            {revokeDelegation && " Your delegation will also be revoked."}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => onConfirm(revokeDelegation)}
              disabled={delegating}
            >
              {delegating ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "Confirm Stop"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}