import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DelegationVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delegationExists: boolean;
  delegationTarget: string | null;
  daoName: string;
  onClose: () => void;
  onContinue: () => void;
}

export function DelegationVerificationDialog({
  open,
  onOpenChange,
  delegationExists,
  delegationTarget,
  daoName,
  onClose,
  onContinue,
}: DelegationVerificationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {delegationExists 
              ? "Existing Delegation Found" 
              : "No Delegation Found"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {delegationExists ? (
            <>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <p>
                  You already have an existing delegation for {daoName}.
                  Delegated to: <span className="font-mono text-xs">{delegationTarget}</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Do you want to continue with the manual verification process anyway?
              </p>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                >
                  No
                </Button>
                <Button onClick={onContinue}>
                  Yes, Continue
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p>
                  No delegation has been found for {daoName}.
                  You need to complete delegation before proceeding with the manual verification.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={onClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}